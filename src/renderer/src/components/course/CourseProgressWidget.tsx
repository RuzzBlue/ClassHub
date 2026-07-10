import { useTranslation } from 'react-i18next'
import type { ProgressSnapshot } from '@shared/types'
import { countLessons } from '@shared/schemas'
import type { CourseManifest } from '@shared/schemas'

interface Props {
  manifest: CourseManifest
  progress: ProgressSnapshot | null
}

export function CourseProgressWidget({ manifest, progress }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const total = countLessons(manifest)
  const completed = progress?.lessons.filter((l) => l.status === 'completed').length ?? 0
  const percent = progress?.course?.percent ?? 0

  return (
    <div className="course-progress-widget">
      <div className="flex items-center justify-between mb-2">
        <span className="course-sidebar-label">{t('course.courseProgress')}</span>
        <span className="course-progress-percent">{percent}%</span>
      </div>
      <div className="course-progress-track">
        <div className="course-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="course-sidebar-sublabel mt-2">
        {completed}/{total} {t('course.lessonsCompleted')}
      </p>
    </div>
  )
}
