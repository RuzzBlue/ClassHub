import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '../components/AppLayout'
import { apiFetch } from '../lib/api-client'
import { useAppStore } from '../stores/app-store'
import type {
  CourseEnrollment,
  Group,
  LicenseType,
  User,
  UserRole,
  UserStatus
} from '@shared/types'

type AdminSection =
  | 'general'
  | 'users-admins'
  | 'users-instructors'
  | 'users-learners'
  | 'relationships'

const STATUSES: UserStatus[] = ['paid', 'active', 'unpaid', 'deactivated']

export function AdminPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { user } = useAppStore()
  const [section, setSection] = useState<AdminSection>('general')
  const [groups, setGroups] = useState<Group[]>([])
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [instructors, setInstructors] = useState<User[]>([])
  const [learners, setLearners] = useState<User[]>([])
  const [groupFilter, setGroupFilter] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const loadGroups = useCallback(async () => {
    const res = await apiFetch<Group[]>({ method: 'GET', path: '/api/admin/groups' })
    if (res.ok && res.data) setGroups(res.data)
  }, [])

  const loadLicenseTypes = useCallback(async () => {
    const res = await apiFetch<LicenseType[]>({ method: 'GET', path: '/api/admin/license-types' })
    if (res.ok && res.data) setLicenseTypes(res.data)
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

  const loadEnrollments = useCallback(async () => {
    const res = await apiFetch<CourseEnrollment[]>({ method: 'GET', path: '/api/admin/enrollments' })
    if (res.ok && res.data) setEnrollments(res.data)
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') return
    void loadGroups()
    void loadLicenseTypes()
  }, [user, loadGroups, loadLicenseTypes])

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
        licenseKey: form.get('licenseKey') || undefined,
        groupId: (form.get('groupId') as string) || null,
        licenseTypeId: (form.get('licenseTypeId') as string) || null,
        role,
        status: (form.get('status') as UserStatus) || 'active'
      }
    })
    setLoading(false)
    if (res.ok) {
      setMessage(t('admin.saved'))
      await loadUsers(role)
    } else setMessage(res.error || t('admin.error'))
  }

  const handleDeleteUser = async (id: string): Promise<void> => {
    const role = roleForSection()
    if (!role || !confirm(t('admin.confirmDelete'))) return
    await apiFetch({ method: 'DELETE', path: `/api/admin/users/${id}` })
    await loadUsers(role)
  }

  const sidebarItems: { id: AdminSection; label: string; icon: string }[] = [
    { id: 'general', label: t('admin.general'), icon: 'fa-sliders' },
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
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 mb-1 ${
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
          <h1 className="text-xl font-bold mb-4">
            {sidebarItems.find((s) => s.id === section)?.label}
          </h1>
          {message && <p className="text-sm mb-4 text-[var(--color-success)]">{message}</p>}

          {section === 'general' && (
            <div className="grid gap-8 lg:grid-cols-2">
              <SimpleCrudTable
                title={t('admin.groups')}
                rows={groups.map((g) => ({ id: g.id, name: g.name, extra: g.description || '—' }))}
                onAdd={async (name, desc) => {
                  await apiFetch({ method: 'POST', path: '/api/admin/groups', body: { name, description: desc } })
                  await loadGroups()
                }}
                onDelete={async (id) => {
                  await apiFetch({ method: 'DELETE', path: `/api/admin/groups/${id}` })
                  await loadGroups()
                }}
              />
              <SimpleCrudTable
                title={t('admin.licenseTypes')}
                rows={licenseTypes.map((l) => ({ id: l.id, name: l.name, extra: l.description || '—' }))}
                onAdd={async (name, desc) => {
                  await apiFetch({
                    method: 'POST',
                    path: '/api/admin/license-types',
                    body: { name, description: desc }
                  })
                  await loadLicenseTypes()
                }}
                onDelete={async (id) => {
                  await apiFetch({ method: 'DELETE', path: `/api/admin/license-types/${id}` })
                  await loadLicenseTypes()
                }}
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
                <input className="input" name="licenseKey" placeholder={t('admin.licenseKeyOptional')} />
                <select className="input" name="groupId">
                  <option value="">{t('admin.noGroup')}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <select className="input" name="licenseTypeId">
                  <option value="">{t('admin.noLicenseType')}</option>
                  {licenseTypes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
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
                <button type="submit" className="btn btn-primary sm:col-span-2 lg:col-span-3" disabled={loading}>
                  <i className="fas fa-plus" /> {t('admin.addUser')}
                </button>
              </form>

              <div className="card overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-left">
                      <th className="p-3">{t('settings.displayName')}</th>
                      <th className="p-3">{t('auth.email')}</th>
                      <th className="p-3">{t('admin.group')}</th>
                      <th className="p-3">{t('admin.status')}</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-[var(--color-border)]">
                        <td className="p-3">{u.displayName}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3">{u.groupName || '—'}</td>
                        <td className="p-3">{u.status}</td>
                        <td className="p-3 text-right">
                          <button type="button" className="btn btn-ghost text-xs text-[var(--color-danger)]" onClick={() => void handleDeleteUser(u.id)}>
                            <i className="fas fa-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

function SimpleCrudTable({
  title,
  rows,
  onAdd,
  onDelete
}: {
  title: string
  rows: { id: string; name: string; extra: string }[]
  onAdd: (name: string, description: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}): React.JSX.Element {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  return (
    <div className="card p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      <form
        className="flex flex-wrap gap-2 mb-4"
        onSubmit={(e) => {
          e.preventDefault()
          void onAdd(name, description).then(() => {
            setName('')
            setDescription('')
          })
        }}
      >
        <input className="input flex-1 min-w-[120px]" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('admin.name')} required />
        <input className="input flex-1 min-w-[120px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('admin.description')} />
        <button type="submit" className="btn btn-primary">
          <i className="fas fa-plus" />
        </button>
      </form>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
            <div>
              <span className="font-medium">{row.name}</span>
              <span className="text-xs text-[var(--color-text-muted)] ml-2">{row.extra}</span>
            </div>
            <button type="button" className="btn btn-ghost text-xs" onClick={() => void onDelete(row.id)}>
              <i className="fas fa-trash text-[var(--color-danger)]" />
            </button>
          </li>
        ))}
      </ul>
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
        <input className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder={t('admin.courseId')} required />
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
        <button type="submit" className="btn btn-primary">
          <i className="fas fa-link" /> {t('admin.enroll')}
        </button>
      </form>
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left">
              <th className="p-3">{t('admin.courseId')}</th>
              <th className="p-3">{t('admin.instructor')}</th>
              <th className="p-3">{t('admin.learner')}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id} className="border-b border-[var(--color-border)]">
                <td className="p-3 font-mono">{e.courseId}</td>
                <td className="p-3">{e.instructorName}</td>
                <td className="p-3">{e.learnerName}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    onClick={async () => {
                      await apiFetch({ method: 'DELETE', path: `/api/admin/enrollments/${e.id}` })
                      await onRefresh()
                    }}
                  >
                    <i className="fas fa-trash text-[var(--color-danger)]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
