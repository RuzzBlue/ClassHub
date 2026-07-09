import { useTranslation } from 'react-i18next'
import type { CourseManifest } from '@shared/schemas'
import type { ProgressSnapshot } from '@shared/types'
import { useAppStore } from '../stores/app-store'
import { useCourseStore } from '../stores/app-store'
import { apiFetch } from '../lib/api-client'
import { cn } from '../lib/utils'

interface Props {
  manifest: CourseManifest
  progress: ProgressSnapshot | null
  currentLessonId: string | null
  onSelectLesson: (lessonId: string) => void
  accessMap: Record<string, boolean>
}

export function CourseSidebar({
  manifest,
  progress,
  currentLessonId,
  onSelectLesson,
  accessMap
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  const { sidebarOpen, activeTab, setActiveTab } = useCourseStore()
  const { user } = useAppStore()

  const getLessonStatus = (lessonId: string): string => {
    const lp = progress?.lessons.find((l) => l.lessonId === lessonId)
    if (!lp || lp.status === 'not_started') return 'not_started'
    if (lp.status === 'completed') return 'completed'
    return 'in_progress'
  }

  const statusIcon = (status: string, locked: boolean): React.JSX.Element => {
    if (locked) return <i className="fas fa-lock text-xs text-[var(--color-danger)]" />
    if (status === 'completed') return <i className="fas fa-check-circle text-xs text-[var(--color-success)]" />
    if (status === 'in_progress') return <i className="fas fa-circle-half-stroke text-xs text-[var(--color-warning)]" />
    return <i className="far fa-circle text-xs text-[var(--color-text-muted)]" />
  }

  if (!sidebarOpen) return <div />

  return (
    <aside className="w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0">
      <div className="flex border-b border-[var(--color-border)]">
        <button
          className={cn('flex-1 py-2 text-sm', activeTab === 'nav' && 'border-b-2')}
          style={activeTab === 'nav' ? { borderColor: 'var(--accent)' } : {}}
          onClick={() => setActiveTab('nav')}
        >
          {t('course.overview')}
        </button>
        <button
          className={cn('flex-1 py-2 text-sm', activeTab === 'dashboard' && 'border-b-2')}
          style={activeTab === 'dashboard' ? { borderColor: 'var(--accent)' } : {}}
          onClick={() => setActiveTab('dashboard')}
        >
          {t('course.dashboard')}
        </button>
      </div>

      {activeTab === 'nav' ? (
        <div className="flex-1 overflow-auto p-3">
          {manifest.navigation.modules
            .sort((a, b) => a.order - b.order)
            .map((mod) => (
              <div key={mod.id} className="mb-3">
                <div className="text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1 px-1">
                  {mod.title}
                </div>
                {mod.units
                  .sort((a, b) => a.order - b.order)
                  .map((unit) => (
                    <div key={unit.id} className="ml-1 mb-2">
                      <div className="text-xs text-[var(--color-text-muted)] px-1 mb-0.5">{unit.title}</div>
                      {unit.lessons
                        .sort((a, b) => a.order - b.order)
                        .map((lesson) => {
                          const locked = !accessMap[lesson.id]
                          const status = getLessonStatus(lesson.id)
                          return (
                            <button
                              key={lesson.id}
                              className={cn(
                                'w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-[var(--color-surface2)]',
                                currentLessonId === lesson.id && 'bg-[var(--color-surface2)]'
                              )}
                              onClick={() => !locked && onSelectLesson(lesson.id)}
                              disabled={locked}
                            >
                              {statusIcon(status, locked)}
                              <span className={cn('truncate', locked && 'opacity-50')}>{lesson.title}</span>
                              {lesson.quiz && (
                                <i className="fas fa-question-circle text-xs text-[var(--color-text-muted)] ml-auto" />
                              )}
                            </button>
                          )
                        })}
                    </div>
                  ))}
              </div>
            ))}
        </div>
      ) : (
        <CourseDashboard manifest={manifest} />
      )}

      {manifest.extras.length > 0 && (
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">{t('course.extras')}</div>
          {manifest.extras
            .filter((e) => e.roles.includes(user?.role || 'learner'))
            .sort((a, b) => a.order - b.order)
            .map((extra) => (
              <button key={extra.id} className="btn btn-ghost w-full text-sm justify-start mb-1">
                <i className="fas fa-puzzle-piece" /> {extra.title}
              </button>
            ))}
        </div>
      )}
    </aside>
  )
}

function CourseDashboard({ manifest }: { manifest: CourseManifest }): React.JSX.Element {
  const { t } = useTranslation()
  const { progress, grades } = useCourseStore()
  const completed = progress?.lessons.filter((l) => l.status === 'completed').length ?? 0
  const total = manifest.navigation.modules.reduce((a, m) => a + m.units.reduce((b, u) => b + u.lessons.length, 0), 0)

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div className="card p-4">
        <div className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
          {progress?.course?.percent ?? 0}%
        </div>
        <div className="text-sm text-[var(--color-text-muted)]">{t('library.progress')}</div>
        <div className="text-xs mt-1">
          {completed}/{total} {t('library.lessons')}
        </div>
      </div>
      {grades.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">{t('course.quiz')}</h4>
          {grades.map((g) => (
            <div key={g.lessonId} className="flex justify-between text-sm py-1 border-b border-[var(--color-border)]">
              <span className="truncate mr-2">{g.lessonTitle}</span>
              <span>
                {g.score !== null ? (
                  <span className={g.passed ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                    {g.score}%
                  </span>
                ) : (
                  '—'
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export async function checkAccess(
  courseId: string,
  targetType: string,
  targetId: string,
  nodeAccess?: string
): Promise<boolean> {
  const res = await apiFetch<{ allowed: boolean }>({
    method: 'GET',
    path: `/api/access/${courseId}`,
    params: { targetType, targetId, nodeAccess: nodeAccess || '' }
  })
  return res.ok && res.data?.allowed === true
}
