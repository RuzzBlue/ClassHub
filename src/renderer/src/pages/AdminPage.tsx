import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '../components/AppLayout'
import { EditableDataTable } from '../components/admin/EditableDataTable'
import { FilterableSelect } from '../components/admin/FilterableSelect'
import { apiFetch } from '../lib/api-client'
import { downloadLicenseCertificate } from '../lib/license-export'
import { useAppStore } from '../stores/app-store'
import type {
  CourseEnrollment,
  Group,
  LicenseKey,
  LicenseType,
  User,
  UserRole,
  UserStatus
} from '@shared/types'

type AdminSection =
  | 'general'
  | 'licenses'
  | 'users-admins'
  | 'users-instructors'
  | 'users-learners'
  | 'relationships'

const MASKED_LICENSE_KEY = '••••••••••••'

const STATUSES: UserStatus[] = ['paid', 'active', 'unpaid', 'deactivated']
const LICENSE_STATUSES = ['active', 'inactive'] as const

export function AdminPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { user } = useAppStore()
  const [section, setSection] = useState<AdminSection>('general')
  const [groups, setGroups] = useState<Group[]>([])
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([])
  const [licenseKeys, setLicenseKeys] = useState<LicenseKey[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [instructors, setInstructors] = useState<User[]>([])
  const [learners, setLearners] = useState<User[]>([])
  const [groupFilter, setGroupFilter] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [genLicenseTypeId, setGenLicenseTypeId] = useState('')
  const [genExpiresAt, setGenExpiresAt] = useState('')
  const [generating, setGenerating] = useState(false)

  const loadGroups = useCallback(async () => {
    const res = await apiFetch<Group[]>({ method: 'GET', path: '/api/admin/groups' })
    if (res.ok && res.data) setGroups(res.data)
  }, [])

  const loadLicenseTypes = useCallback(async () => {
    const res = await apiFetch<LicenseType[]>({ method: 'GET', path: '/api/admin/license-types' })
    if (res.ok && res.data) setLicenseTypes(res.data)
  }, [])

  const loadLicenseKeys = useCallback(async () => {
    const res = await apiFetch<LicenseKey[]>({ method: 'GET', path: '/api/admin/license-keys' })
    if (res.ok && res.data) setLicenseKeys(res.data)
  }, [])

  const loadUsers = useCallback(
    async (role: UserRole) => {
      const params: Record<string, string> = { role }
      if (role === 'learner' && groupFilter) params.groupId = groupFilter
      const res = await apiFetch<User[]>({ method: 'GET', path: '/api/admin/users', params })
      if (res.ok && res.data) setUsers(res.data)
    },
    [groupFilter]
  )

  const loadAllUsers = useCallback(async () => {
    const roles: UserRole[] = ['admin', 'instructor', 'learner']
    const lists = await Promise.all(
      roles.map((role) => apiFetch<User[]>({ method: 'GET', path: '/api/admin/users', params: { role } }))
    )
    const merged: User[] = []
    for (const res of lists) {
      if (res.ok && res.data) merged.push(...res.data)
    }
    setAllUsers(merged)
  }, [])

  const loadEnrollments = useCallback(async () => {
    const res = await apiFetch<CourseEnrollment[]>({ method: 'GET', path: '/api/admin/enrollments' })
    if (res.ok && res.data) setEnrollments(res.data)
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') return
    void loadGroups()
    void loadLicenseTypes()
    void loadAllUsers()
  }, [user, loadGroups, loadLicenseTypes, loadAllUsers])

  useEffect(() => {
    if (user?.role !== 'admin') return
    if (section === 'licenses') void loadLicenseKeys()
  }, [section, user, loadLicenseKeys])

  useEffect(() => {
    if (licenseTypes.length && !genLicenseTypeId) setGenLicenseTypeId(licenseTypes[0].id)
  }, [licenseTypes, genLicenseTypeId])

  useEffect(() => {
    if (user?.role !== 'admin') return
    if (section === 'users-admins') void loadUsers('admin')
    if (section === 'users-instructors') void loadUsers('instructor')
    if (section === 'users-learners') void loadUsers('learner')
    if (section === 'relationships') {
      void loadEnrollments()
      void apiFetch<User[]>({ method: 'GET', path: '/api/admin/users', params: { role: 'instructor' } }).then(
        (res) => res.ok && res.data && setInstructors(res.data)
      )
      void apiFetch<User[]>({ method: 'GET', path: '/api/admin/users', params: { role: 'learner' } }).then(
        (res) => res.ok && res.data && setLearners(res.data)
      )
    }
  }, [section, user, loadUsers, loadEnrollments, groupFilter])

  if (!user) return <Navigate to="/" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />

  const roleForSection = (): UserRole | null => {
    if (section === 'users-admins') return 'admin'
    if (section === 'users-instructors') return 'instructor'
    if (section === 'users-learners') return 'learner'
    return null
  }

  const groupOptions = [
    { value: '', label: t('admin.noGroup') },
    ...groups.map((g) => ({ value: g.id, label: g.name }))
  ]

  const statusOptions = STATUSES.map((s) => ({ value: s, label: s }))
  const licenseStatusOptions = LICENSE_STATUSES.map((s) => ({ value: s, label: s }))

  const getAssignOptions = (licenseId: string, currentAssignedId: string | null) => {
    const takenByOthers = new Set(
      licenseKeys
        .filter((lk) => lk.assignedUserId && lk.id !== licenseId)
        .map((lk) => lk.assignedUserId as string)
    )
    return [
      { value: '', label: t('admin.unassigned') },
      ...allUsers
        .filter((u) => u.id === currentAssignedId || !takenByOthers.has(u.id))
        .map((u) => ({ value: u.id, label: `${u.displayName} (${u.role})` }))
    ]
  }

  const handleRegenerateLicense = async (id: string): Promise<void> => {
    const res = await apiFetch<LicenseKey>({
      method: 'POST',
      path: `/api/admin/license-keys/${id}/regenerate`
    })
    if (res.ok) {
      setMessage(t('admin.licenseRegenerated'))
      await loadLicenseKeys()
      if (res.data) downloadLicenseCertificate(res.data)
    } else setMessage(res.error || t('admin.error'))
  }

  const handleCreateUser = async (form: FormData): Promise<void> => {
    const role = roleForSection()
    if (!role) return
    setLoading(true)
    const res = await apiFetch<User>({
      method: 'POST',
      path: '/api/admin/users',
      body: {
        displayName: form.get('displayName'),
        email: form.get('email'),
        password: form.get('password'),
        groupId: (form.get('groupId') as string) || null,
        role,
        status: (form.get('status') as UserStatus) || 'active'
      }
    })
    setLoading(false)
    if (res.ok) {
      setMessage(t('admin.saved'))
      await loadUsers(role)
      await loadAllUsers()
    } else setMessage(res.error || t('admin.error'))
  }

  const handleGenerateLicense = async (): Promise<void> => {
    if (!genLicenseTypeId) return
    setGenerating(true)
    const res = await apiFetch<LicenseKey>({
      method: 'POST',
      path: '/api/admin/license-keys',
      body: {
        licenseTypeId: genLicenseTypeId,
        expiresAt: genExpiresAt || null
      }
    })
    setGenerating(false)
    if (res.ok) {
      setMessage(t('admin.licenseGenerated'))
      await loadLicenseKeys()
      if (res.data) downloadLicenseCertificate(res.data)
    } else setMessage(res.error || t('admin.error'))
  }

  const sidebarItems: { id: AdminSection; label: string; icon: string }[] = [
    { id: 'general', label: t('admin.general'), icon: 'fa-sliders' },
    { id: 'licenses', label: t('admin.licenses'), icon: 'fa-key' },
    { id: 'users-admins', label: t('admin.admins'), icon: 'fa-user-shield' },
    { id: 'users-instructors', label: t('admin.instructors'), icon: 'fa-chalkboard-user' },
    { id: 'users-learners', label: t('admin.learners'), icon: 'fa-user-graduate' },
    { id: 'relationships', label: t('admin.relationships'), icon: 'fa-link' }
  ]

  return (
    <AppLayout showImport={false}>
      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3 overflow-auto">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] px-2 mb-2">
            {t('admin.menu')}
          </p>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 mb-1 cursor-pointer ${
                section === item.id ? 'bg-[var(--color-surface2)]' : 'hover:bg-[var(--color-surface2)]'
              }`}
              onClick={() => setSection(item.id)}
            >
              <i className={`fas ${item.icon} w-4`} />
              {item.label}
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-auto p-6">
          <h1 className="text-xl font-bold mb-4">{sidebarItems.find((s) => s.id === section)?.label}</h1>
          {message && <p className="text-sm mb-4 text-[var(--color-success)]">{message}</p>}

          {section === 'general' && (
            <div className="grid gap-8 lg:grid-cols-2">
              <NamedEntityPanel
                  title={t('admin.groups')}
                  onAdd={async (name, description) => {
                    await apiFetch({ method: 'POST', path: '/api/admin/groups', body: { name, description } })
                    await loadGroups()
                  }}
                >
                  <EditableDataTable
                    rows={groups}
                    columns={[
                      { key: 'name', label: t('admin.name'), editable: true, getValue: (r) => r.name },
                      {
                        key: 'description',
                        label: t('admin.description'),
                        editable: true,
                        getValue: (r) => r.description || ''
                      }
                    ]}
                    onSave={async (row, updates) => {
                      await apiFetch({
                        method: 'PUT',
                        path: `/api/admin/groups/${row.id}`,
                        body: { name: updates.name, description: updates.description }
                      })
                      await loadGroups()
                    }}
                    onDelete={async (id) => {
                      await apiFetch({ method: 'DELETE', path: `/api/admin/groups/${id}` })
                      await loadGroups()
                    }}
                  />
                </NamedEntityPanel>

                <NamedEntityPanel
                  title={t('admin.licenseTypes')}
                  onAdd={async (name, description) => {
                    await apiFetch({
                      method: 'POST',
                      path: '/api/admin/license-types',
                      body: { name, description }
                    })
                    await loadLicenseTypes()
                  }}
                >
                  <EditableDataTable
                    rows={licenseTypes}
                    columns={[
                      { key: 'name', label: t('admin.name'), editable: true, getValue: (r) => r.name },
                      {
                        key: 'description',
                        label: t('admin.description'),
                        editable: true,
                        getValue: (r) => r.description || ''
                      }
                    ]}
                    onSave={async (row, updates) => {
                      await apiFetch({
                        method: 'PUT',
                        path: `/api/admin/license-types/${row.id}`,
                        body: { name: updates.name, description: updates.description }
                      })
                      await loadLicenseTypes()
                    }}
                    onDelete={async (id) => {
                      await apiFetch({ method: 'DELETE', path: `/api/admin/license-types/${id}` })
                      await loadLicenseTypes()
                    }}
                  />
                </NamedEntityPanel>
            </div>
          )}

          {section === 'licenses' && (
            <div className="card p-4 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">{t('admin.licensesHint')}</p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)]">{t('admin.licenseTypes')}</label>
                    <select
                      className="input py-1.5 text-sm min-w-[160px]"
                      value={genLicenseTypeId}
                      onChange={(e) => setGenLicenseTypeId(e.target.value)}
                    >
                      {licenseTypes.map((lt) => (
                        <option key={lt.id} value={lt.id}>
                          {lt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)]">{t('admin.expiresAt')}</label>
                    <input
                      type="date"
                      className="input py-1.5 text-sm"
                      value={genExpiresAt}
                      onChange={(e) => setGenExpiresAt(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary cursor-pointer"
                    disabled={generating || !genLicenseTypeId}
                    onClick={() => void handleGenerateLicense()}
                  >
                    {generating ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-key" />}
                    {t('admin.generateLicense')}
                  </button>
                </div>
              </div>

              <EditableDataTable
                rows={licenseKeys}
                columns={[
                  {
                    key: 'code',
                    label: t('admin.licenseKey'),
                    editable: true,
                    getValue: () => MASKED_LICENSE_KEY,
                    render: () => (
                      <span className="font-mono text-xs tracking-widest text-[var(--color-text-muted)]">
                        {MASKED_LICENSE_KEY}
                      </span>
                    ),
                    renderEdit: (row) => (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs tracking-widest text-[var(--color-text-muted)]">
                          {MASKED_LICENSE_KEY}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost text-xs px-2 cursor-pointer whitespace-nowrap"
                          onClick={() => void handleRegenerateLicense(row.id)}
                        >
                          <i className="fas fa-rotate" /> {t('admin.regenerateLicense')}
                        </button>
                      </div>
                    )
                  },
                  {
                    key: 'licenseTypeId',
                    label: t('admin.licenseTypes'),
                    editable: true,
                    type: 'select',
                    options: licenseTypes.map((lt) => ({ value: lt.id, label: lt.name })),
                    getValue: (r) => r.licenseTypeName
                  },
                  {
                    key: 'status',
                    label: t('admin.status'),
                    editable: true,
                    type: 'select',
                    options: licenseStatusOptions,
                    getValue: (r) => r.status
                  },
                  {
                    key: 'expiresAt',
                    label: t('admin.expiresAt'),
                    editable: true,
                    type: 'date',
                    getValue: (r) =>
                      r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : t('admin.noExpiration')
                  },
                  {
                    key: 'assignedUserId',
                    label: t('admin.assignedTo'),
                    editable: true,
                    getValue: (r) => r.assignedUserName || t('admin.unassigned'),
                    renderEdit: (row, value, onChange) => (
                      <FilterableSelect
                        value={value}
                        options={getAssignOptions(row.id, row.assignedUserId)}
                        onChange={onChange}
                      />
                    )
                  }
                ]}
                getEditValues={(row) => ({
                  licenseTypeId: row.licenseTypeId,
                  status: row.status,
                  expiresAt: row.expiresAt ? row.expiresAt.slice(0, 10) : '',
                  assignedUserId: row.assignedUserId || ''
                })}
                onSave={async (row, updates) => {
                  const res = await apiFetch<LicenseKey>({
                    method: 'PUT',
                    path: `/api/admin/license-keys/${row.id}`,
                    body: {
                      licenseTypeId: updates.licenseTypeId,
                      status: updates.status,
                      expiresAt: updates.expiresAt || null,
                      assignedUserId: updates.assignedUserId || null
                    }
                  })
                  if (!res.ok) {
                    setMessage(res.error || t('admin.error'))
                    throw new Error(res.error || 'save failed')
                  }
                  setMessage(t('admin.saved'))
                  await loadLicenseKeys()
                }}
                onDelete={async (id) => {
                  await apiFetch({ method: 'DELETE', path: `/api/admin/license-keys/${id}` })
                  await loadLicenseKeys()
                }}
                extraActions={(row) => (
                  <button
                    type="button"
                    className="btn btn-ghost text-xs px-2 cursor-pointer"
                    title={t('admin.exportLicense')}
                    onClick={() => downloadLicenseCertificate(row)}
                  >
                    <i className="fas fa-file-export" />
                  </button>
                )}
              />
            </div>
          )}

          {section.startsWith('users-') && (
            <>
              {section === 'users-learners' && (
                <div className="mb-4 flex items-center gap-2">
                  <label className="text-sm">{t('admin.filterByGroup')}</label>
                  <select
                    className="input max-w-xs"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                  >
                    <option value="">{t('admin.allGroups')}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <form
                className="card p-4 mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleCreateUser(new FormData(e.currentTarget))
                  e.currentTarget.reset()
                }}
              >
                <input className="input" name="displayName" placeholder={t('settings.displayName')} required />
                <input className="input" name="email" type="email" placeholder={t('auth.email')} required />
                <input className="input" name="password" type="password" placeholder={t('auth.password')} required />
                <select className="input" name="groupId">
                  <option value="">{t('admin.noGroup')}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <select className="input" name="status" defaultValue="active">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary sm:col-span-2 lg:col-span-3 cursor-pointer" disabled={loading}>
                  <i className="fas fa-plus" /> {t('admin.addUser')}
                </button>
              </form>

              <EditableDataTable
                rows={users}
                columns={[
                  { key: 'displayName', label: t('settings.displayName'), editable: true, getValue: (r) => r.displayName },
                  { key: 'email', label: t('auth.email'), editable: true, getValue: (r) => r.email },
                  {
                    key: 'groupId',
                    label: t('admin.group'),
                    editable: true,
                    type: 'select',
                    options: groupOptions,
                    getValue: (r) => r.groupName || t('admin.noGroup')
                  },
                  {
                    key: 'status',
                    label: t('admin.status'),
                    editable: true,
                    type: 'select',
                    options: statusOptions,
                    getValue: (r) => r.status
                  }
                ]}
                getEditValues={(row) => ({
                  groupId: row.groupId || ''
                })}
                onSave={async (row, updates) => {
                  const role = roleForSection()
                  if (!role) return
                  await apiFetch({
                    method: 'PUT',
                    path: `/api/admin/users/${row.id}`,
                    body: {
                      displayName: updates.displayName,
                      email: updates.email,
                      groupId: updates.groupId || null,
                      status: updates.status as UserStatus
                    }
                  })
                  await loadUsers(role)
                  await loadAllUsers()
                }}
                onDelete={async (id) => {
                  const role = roleForSection()
                  if (!role) return
                  await apiFetch({ method: 'DELETE', path: `/api/admin/users/${id}` })
                  await loadUsers(role)
                  await loadAllUsers()
                }}
              />
            </>
          )}

          {section === 'relationships' && (
            <EnrollmentPanel
              enrollments={enrollments}
              instructors={instructors}
              learners={learners}
              onRefresh={loadEnrollments}
            />
          )}
        </main>
      </div>
    </AppLayout>
  )
}

function NamedEntityPanel({
  title,
  onAdd,
  children
}: {
  title: string
  onAdd: (name: string, description: string) => Promise<void>
  children: React.ReactNode
}): React.JSX.Element {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  return (
    <div className="card p-4 space-y-3">
      <h2 className="font-semibold">{title}</h2>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void onAdd(name, description).then(() => {
            setName('')
            setDescription('')
          })
        }}
      >
        <input
          className="input flex-1 min-w-[120px]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('admin.name')}
          required
        />
        <input
          className="input flex-1 min-w-[120px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('admin.description')}
        />
        <button type="submit" className="btn btn-primary cursor-pointer">
          <i className="fas fa-plus" />
        </button>
      </form>
      {children}
    </div>
  )
}

function EnrollmentPanel({
  enrollments,
  instructors,
  learners,
  onRefresh
}: {
  enrollments: CourseEnrollment[]
  instructors: User[]
  learners: User[]
  onRefresh: () => Promise<void>
}): React.JSX.Element {
  const { t } = useTranslation()
  const [courseId, setCourseId] = useState('')
  const [instructorId, setInstructorId] = useState('')
  const [learnerId, setLearnerId] = useState('')

  const instructorOptions = instructors.map((i) => ({ value: i.id, label: i.displayName }))
  const learnerOptions = learners.map((l) => ({ value: l.id, label: l.displayName }))

  return (
    <>
      <form
        className="card p-4 mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault()
          await apiFetch({
            method: 'POST',
            path: '/api/admin/enrollments',
            body: { courseId, instructorId, learnerId }
          })
          setCourseId('')
          setLearnerId('')
          await onRefresh()
        }}
      >
        <input
          className="input"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          placeholder={t('admin.courseId')}
          required
        />
        <select className="input" value={instructorId} onChange={(e) => setInstructorId(e.target.value)} required>
          <option value="">{t('admin.selectInstructor')}</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.displayName}
            </option>
          ))}
        </select>
        <select className="input" value={learnerId} onChange={(e) => setLearnerId(e.target.value)} required>
          <option value="">{t('admin.selectLearner')}</option>
          {learners.map((l) => (
            <option key={l.id} value={l.id}>
              {l.displayName}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary cursor-pointer">
          <i className="fas fa-link" /> {t('admin.enroll')}
        </button>
      </form>

      <EditableDataTable
        rows={enrollments}
        columns={[
          { key: 'courseId', label: t('admin.courseId'), editable: true, getValue: (r) => r.courseId },
          {
            key: 'instructorId',
            label: t('admin.instructor'),
            editable: true,
            type: 'select',
            options: instructorOptions,
            getValue: (r) => r.instructorName
          },
          {
            key: 'learnerId',
            label: t('admin.learner'),
            editable: true,
            type: 'select',
            options: learnerOptions,
            getValue: (r) => r.learnerName
          }
        ]}
        getEditValues={(row) => ({
          instructorId: row.instructorId,
          learnerId: row.learnerId
        })}
        onSave={async (row, updates) => {
          await apiFetch({
            method: 'PUT',
            path: `/api/admin/enrollments/${row.id}`,
            body: {
              courseId: updates.courseId,
              instructorId: updates.instructorId,
              learnerId: updates.learnerId
            }
          })
          await onRefresh()
        }}
        onDelete={async (id) => {
          await apiFetch({ method: 'DELETE', path: `/api/admin/enrollments/${id}` })
          await onRefresh()
        }}
      />
    </>
  )
}
