import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CourseCardData } from '@shared/types'

interface ExportCourseModalProps {
  open: boolean
  courses: CourseCardData[]
  onClose: () => void
  onExport: (course: CourseCardData) => Promise<boolean>
}

export function ExportCourseModal({
  open,
  courses,
  onClose,
  onExport
}: ExportCourseModalProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState(courses[0]?.id ?? '')
  const [exporting, setExporting] = useState(false)

  if (!open) return null

  const selected = courses.find((c) => c.id === selectedId) ?? courses[0]

  const handleExport = async (): Promise<void> => {
    if (!selected) return
    setExporting(true)
    const ok = await onExport(selected)
    setExporting(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold mb-2">{t('nav.exportCourse')}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">{t('nav.exportCourseHint')}</p>

        {courses.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">{t('library.noCourses')}</p>
        ) : (
          <select
            className="w-full mb-4 px-3 py-2 rounded-lg bg-[var(--color-surface2)] border border-[var(--color-border)] text-[var(--color-text)]"
            value={selected?.id ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={exporting}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting || !selected}
          >
            <i className={`fas ${exporting ? 'fa-spinner fa-spin' : 'fa-file-export'}`} />
            {t('nav.exportCourse')}
          </button>
        </div>
      </div>
    </div>
  )
}
