import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CourseCardData } from '@shared/types'
import { importCourse, syncCourses, exportCourse } from '../lib/course-actions'
import { ExportCourseModal } from './ExportCourseModal'

interface ImportCourseMenuProps {
  courses: CourseCardData[]
  onCoursesChange: () => Promise<void>
  compact?: boolean
}

export function ImportCourseMenu({
  courses,
  onCoursesChange,
  compact = false
}: ImportCourseMenuProps): React.JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleImport = async (): Promise<void> => {
    setOpen(false)
    setBusy(true)
    if (await importCourse()) await onCoursesChange()
    setBusy(false)
  }

  const handleSync = async (): Promise<void> => {
    setOpen(false)
    setBusy(true)
    await syncCourses()
    await onCoursesChange()
    setBusy(false)
  }

  const handleExportOpen = (): void => {
    setOpen(false)
    setExportOpen(true)
  }

  const handleExport = async (course: CourseCardData): Promise<boolean> => {
    setBusy(true)
    const ok = await exportCourse(course)
    setBusy(false)
    return ok
  }

  return (
    <>
      <div className="relative inline-flex" ref={menuRef}>
        <div className={`inline-flex rounded-lg overflow-hidden border border-[var(--color-border)] ${compact ? '' : ''}`}>
          <button
            type="button"
            className={`btn btn-ghost text-sm rounded-none border-0 ${compact ? 'px-3 py-2' : ''}`}
            onClick={handleImport}
            disabled={busy}
          >
            <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-file-import'}`} />
            {t('nav.import')}
          </button>
          <button
            type="button"
            className="btn btn-ghost text-sm rounded-none border-0 border-l border-[var(--color-border)] px-2"
            onClick={() => setOpen((v) => !v)}
            disabled={busy}
            aria-label={t('nav.importMore')}
          >
            <i className={`fas fa-chevron-down text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {open && (
          <div className="absolute top-full left-0 mt-1 min-w-[220px] z-50 card py-1 shadow-lg">
            <button
              type="button"
              className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface2)] flex items-center gap-2"
              onClick={handleSync}
            >
              <i className="fas fa-arrows-rotate w-4" />
              {t('nav.syncCourses')}
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface2)] flex items-center gap-2"
              onClick={handleExportOpen}
              disabled={courses.length === 0}
            >
              <i className="fas fa-file-export w-4" />
              {t('nav.exportCourse')}
            </button>
          </div>
        )}
      </div>

      <ExportCourseModal
        open={exportOpen}
        courses={courses}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
      />
    </>
  )
}
