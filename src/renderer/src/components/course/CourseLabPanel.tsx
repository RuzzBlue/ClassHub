import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LabItem } from '@shared/schemas'
import type { LabSubmission, LabSubmissionStatus } from '@shared/types'
import { apiFetch } from '../../lib/api-client'
import { cn } from '../../lib/utils'
import { courseMenuRoleForUser } from '../../lib/course-app-menus'
import { useAppStore } from '../../stores/app-store'

interface LabListState {
  lab: LabItem
  dueLabel: string
  submission: LabSubmission | null
}

interface LabDetail {
  lab: LabItem
  dueLabel: string
  submission: LabSubmission | null
  html: string | null
}

interface Props {
  courseId: string
}

function statusTone(status: LabSubmissionStatus | undefined): string {
  switch (status) {
    case 'completed':
      return 'lab-status-done'
    case 'submitted':
      return 'lab-status-submitted'
    case 'in_progress':
      return 'lab-status-progress'
    default:
      return 'lab-status-new'
  }
}

export function CourseLabPanel({ courseId }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const { user } = useAppStore()
  const menuRole = courseMenuRoleForUser(user)
  const isInstructor = menuRole === 'instructor'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState<string | null>(null)
  const [labs, setLabs] = useState<LabListState[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<LabDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadList = useCallback(async (opts?: { silent?: boolean }): Promise<LabListState[] | null> => {
    if (!opts?.silent) setLoading(true)
    setError(null)
    const res = await apiFetch<{ title: string | null; labs: LabListState[] }>({
      method: 'GET',
      path: `/api/labs/${courseId}`
    })
    if (res.ok && res.data) {
      setTitle(res.data.title)
      setLabs(res.data.labs)
      if (!opts?.silent) setLoading(false)
      return res.data.labs
    }
    setError(res.error || 'Failed to load labs')
    if (!opts?.silent) setLoading(false)
    return null
  }, [courseId])

  const loadDetail = useCallback(
    async (labId: string): Promise<void> => {
      const res = await apiFetch<LabDetail>({
        method: 'GET',
        path: `/api/labs/${courseId}/${labId}`
      })
      if (res.ok && res.data) setDetail(res.data)
    },
    [courseId]
  )

  useEffect(() => {
    loadList().then((items) => {
      if (items?.length) {
        setSelectedId((prev) => prev ?? items[0].lab.id)
      }
    })
  }, [courseId, loadList])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const refresh = async (): Promise<void> => {
    await loadList({ silent: true })
    if (selectedId) await loadDetail(selectedId)
  }

  const setStatus = async (status: LabSubmissionStatus): Promise<void> => {
    if (!selectedId || isInstructor) return
    setBusy(true)
    await apiFetch({
      method: 'POST',
      path: `/api/labs/${courseId}/${selectedId}/status`,
      body: { status }
    })
    await refresh()
    setBusy(false)
  }

  const onPickFiles = async (files: FileList | null): Promise<void> => {
    if (!files?.length || !selectedId || isInstructor) return
    setBusy(true)
    for (const file of Array.from(files)) {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = String(reader.result || '')
          const base64 = result.includes(',') ? result.split(',')[1] : result
          resolve(base64)
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      await apiFetch({
        method: 'POST',
        path: `/api/labs/${courseId}/${selectedId}/attachments`,
        body: {
          filename: file.name,
          mimeType: file.type,
          contentBase64
        }
      })
    }
    await refresh()
    setBusy(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = async (name: string): Promise<void> => {
    if (!selectedId || isInstructor) return
    setBusy(true)
    await apiFetch({
      method: 'DELETE',
      path: `/api/labs/${courseId}/${selectedId}/attachments/${encodeURIComponent(name)}`
    })
    await refresh()
    setBusy(false)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-2xl" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-[var(--color-danger)]">
        {error}
      </div>
    )
  }

  if (!labs.length) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-[var(--color-text-muted)]">
        {t('course.lab.none')}
      </div>
    )
  }

  const completed = labs.filter(
    (l) => l.submission?.status === 'completed' || l.submission?.status === 'submitted'
  ).length
  const submission = detail?.submission
  const status = submission?.status ?? 'not_started'

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--color-border)] px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <i className="fas fa-flask" style={{ color: 'var(--accent)' }} />
            {title || t('course.appMenus.lab')}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {t('course.lab.progressCount', { done: completed, total: labs.length })}
          </p>
        </div>
        {isInstructor && (
          <p className="text-sm text-[var(--color-text-muted)] max-w-md text-right">
            {t('course.lab.instructorHint')}
          </p>
        )}
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 shrink-0 border-r border-[var(--color-border)] overflow-auto p-3 space-y-2">
          {labs.map(({ lab, dueLabel, submission: sub }) => {
            const st = sub?.status ?? 'not_started'
            return (
              <button
                key={lab.id}
                type="button"
                className={cn(
                  'lab-list-item w-full text-left',
                  selectedId === lab.id && 'lab-list-item-active'
                )}
                onClick={() => setSelectedId(lab.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm">{lab.title}</span>
                  <span className={cn('lab-status-pill', statusTone(st))}>
                    {t(`course.lab.status.${st}`)}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">
                  {t('course.lab.dueAfter')}: {dueLabel}
                </p>
              </button>
            )
          })}
        </aside>

        <section className="flex-1 min-w-0 overflow-auto p-5 space-y-4">
          {detail && (
            <>
              <div className="card p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <h2 className="text-lg font-semibold">{detail.lab.title}</h2>
                  <span className={cn('lab-status-pill', statusTone(status))}>
                    {t(`course.lab.status.${status}`)}
                  </span>
                </div>
                {detail.lab.summary && (
                  <p className="text-sm text-[var(--color-text-muted)]">{detail.lab.summary}</p>
                )}
                <p className="text-sm">
                  <span className="font-semibold">{t('course.lab.dueAfter')}:</span> {detail.dueLabel}
                </p>
                {detail.lab.expectedResult && (
                  <div className="lab-expected">
                    <p className="font-semibold text-sm mb-1">{t('course.lab.expectedResult')}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{detail.lab.expectedResult}</p>
                  </div>
                )}
              </div>

              <div className="card overflow-hidden">
                <div className="px-4 py-2 border-b border-[var(--color-border)] font-semibold text-sm">
                  {t('course.lab.instructions')}
                </div>
                {detail.html ? (
                  <iframe
                    className="w-full min-h-[280px] border-0 bg-white"
                    srcDoc={detail.html}
                    sandbox=""
                    title={detail.lab.title}
                  />
                ) : (
                  <p className="p-4 text-sm text-[var(--color-danger)]">{t('course.lab.missingHtml')}</p>
                )}
              </div>

              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{t('course.lab.evidence')}</h3>
                  {!isInstructor && (
                    <button
                      type="button"
                      className="btn btn-ghost text-sm"
                      disabled={busy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <i className="fas fa-upload" /> {t('course.lab.upload')}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.zip,.txt,.md"
                  onChange={(e) => onPickFiles(e.target.files)}
                />
                {(submission?.attachments?.length ?? 0) === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">{t('course.lab.noEvidence')}</p>
                ) : (
                  <ul className="space-y-2">
                    {submission!.attachments.map((att) => (
                      <li
                        key={att.name}
                        className="flex items-center justify-between gap-2 text-sm border border-[var(--color-border)] rounded-md px-3 py-2"
                      >
                        <span className="truncate">
                          <i className="fas fa-paperclip mr-2 text-[var(--color-text-muted)]" />
                          {att.originalName}
                          <span className="text-[var(--color-text-muted)] ml-2">
                            ({Math.round(att.size / 1024)} KB)
                          </span>
                        </span>
                        {!isInstructor && (
                          <button
                            type="button"
                            className="btn btn-ghost text-xs"
                            disabled={busy}
                            onClick={() => removeAttachment(att.name)}
                          >
                            {t('course.lab.remove')}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {!isInstructor && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {status === 'not_started' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() => setStatus('in_progress')}
                      >
                        {t('course.lab.start')}
                      </button>
                    )}
                    {(status === 'in_progress' || status === 'not_started') && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy || !(submission?.attachments?.length)}
                        onClick={() => setStatus('submitted')}
                      >
                        {t('course.lab.submit')}
                      </button>
                    )}
                    {status === 'submitted' && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={busy}
                        onClick={() => setStatus('in_progress')}
                      >
                        {t('course.lab.reopen')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
