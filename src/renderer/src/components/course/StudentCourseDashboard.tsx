import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CourseManifest } from '@shared/schemas'
import { countLessons, countQuizzes } from '@shared/schemas'
import { useCourseStore } from '../../stores/app-store'
import { loadAssetContent } from '../../lib/utils'

interface Props {
  courseId: string
  manifest: CourseManifest
}

interface LinkItem {
  title: string
  url: string
  description?: string
}

interface LinksFile {
  links?: LinkItem[]
}

function parseLinksJson(raw: string): LinkItem[] {
  const parsed = JSON.parse(raw) as LinkItem[] | LinksFile
  if (Array.isArray(parsed)) return parsed
  if (parsed && Array.isArray(parsed.links)) return parsed.links
  return []
}

export function CourseLinksPanel({ courseId, path }: { courseId: string; path: string }): React.JSX.Element {
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadAssetContent(courseId, path)
      .then((raw) => {
        if (!cancelled) setLinks(parseLinksJson(raw))
      })
      .catch(() => {
        if (!cancelled) setLinks([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [courseId, path])

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-3xl mx-auto space-y-3">
        <h2 className="text-xl font-semibold mb-4">{t('course.usefulLinks')}</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <i className="fas fa-spinner fa-spin text-xl" style={{ color: 'var(--accent)' }} />
          </div>
        ) : links.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">{t('course.noLinks')}</p>
        ) : (
          links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="card p-4 block hover:bg-[var(--color-surface2)] transition-colors"
            >
              <div className="font-medium">{link.title}</div>
              {link.description && (
                <p className="text-sm text-[var(--color-text-muted)] mt-1">{link.description}</p>
              )}
            </a>
          ))
        )}
      </div>
    </div>
  )
}

export function CourseFilesPanel({ courseId, path, title }: { courseId: string; path: string; title: string }): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p className="text-[var(--color-text-muted)] mb-4">{t('course.downloadsHint')}</p>
        <a
          className="btn btn-primary"
          href={`/api/courses/${courseId}/asset?path=${encodeURIComponent(path)}`}
          download
        >
          <i className="fas fa-download" /> {t('course.openDownloadsFolder')}
        </a>
      </div>
    </div>
  )
}

export function StudentCourseDashboard({ courseId, manifest }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const { progress, grades } = useCourseStore()

  const totalLessons = countLessons(manifest)
  const completedLessons = progress?.lessons.filter((l) => l.status === 'completed').length ?? 0
  const totalQuizzes = countQuizzes(manifest)
  const clearedQuizzes = grades.filter((g) => g.passed === true).length
  const scored = grades.filter((g) => g.score !== null)
  const avgScore =
    scored.length > 0 ? Math.round(scored.reduce((a, g) => a + (g.score ?? 0), 0) / scored.length) : 0
  const percent = progress?.course?.percent ?? 0
  const certificateReady = percent >= 100

  const achievements = [
    { id: 'first-lesson', label: t('course.achievementFirstLesson'), done: completedLessons >= 1, icon: 'fa-seedling' },
    { id: 'halfway', label: t('course.achievementHalfway'), done: percent >= 50, icon: 'fa-chart-line' },
    { id: 'quiz-master', label: t('course.achievementQuizMaster'), done: clearedQuizzes >= 2, icon: 'fa-trophy' },
    { id: 'graduate', label: t('course.achievementGraduate'), done: certificateReady, icon: 'fa-graduation-cap' }
  ]

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{t('course.studentDashboard')}</h2>
          <p className="text-[var(--color-text-muted)] mt-1">{manifest.title}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard value={`${percent}%`} label={t('course.courseComplete')} accent />
          <StatCard value={`${completedLessons}/${totalLessons}`} label={t('course.lessonsFinished')} />
          <StatCard value={`${clearedQuizzes}/${totalQuizzes}`} label={t('course.quizzesCleared')} />
          <StatCard value={`${avgScore}%`} label={t('course.averageQuizScore')} />
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">{t('course.quizGrades')}</h3>
          {grades.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">{t('course.noQuizGrades')}</p>
          ) : (
            <div className="space-y-2">
              {grades.map((g) => (
                <div
                  key={g.lessonId}
                  className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0"
                >
                  <span className="text-sm truncate mr-4">{g.lessonTitle}</span>
                  <span
                    className={`text-sm font-medium ${
                      g.passed ? 'text-[var(--color-success)]' : g.score !== null ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {g.score !== null ? `${g.score}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">{t('course.achievements')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 rounded-lg p-3 border ${
                  a.done
                    ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]'
                    : 'border-[var(--color-border)] opacity-60'
                }`}
              >
                <i className={`fas ${a.icon} text-lg`} style={{ color: a.done ? 'var(--accent)' : undefined }} />
                <span className="text-sm font-medium">{a.label}</span>
                {a.done && <i className="fas fa-check-circle ml-auto text-[var(--color-success)]" />}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold">{t('course.certificate')}</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('course.certificateHint')}</p>
          </div>
          <button className="btn btn-primary shrink-0" disabled={!certificateReady}>
            <i className="fas fa-file-certificate" /> {t('course.downloadCertificate')}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  value,
  label,
  accent = false
}: {
  value: string
  label: string
  accent?: boolean
}): React.JSX.Element {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold" style={accent ? { color: 'var(--accent)' } : undefined}>
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mt-1">{label}</div>
    </div>
  )
}
