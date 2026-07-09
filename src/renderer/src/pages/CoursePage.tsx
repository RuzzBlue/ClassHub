import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCourseStore } from '../stores/app-store'
import { useAppStore } from '../stores/app-store'
import { CourseSidebar, checkAccess } from '../components/CourseSidebar'
import { LessonViewer } from '../components/LessonViewer'
import { apiFetch, openPresenter } from '../lib/api-client'
import { findLesson } from '@shared/schemas'

export function CoursePage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAppStore()
  const {
    manifest,
    currentLessonId,
    sidebarOpen,
    progress,
    loadCourse,
    setCurrentLesson,
    toggleSidebar
  } = useCourseStore()
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({})
  const [licenseKey, setLicenseKey] = useState('')
  const [showLicense, setShowLicense] = useState(false)

  useEffect(() => {
    if (courseId) loadCourse(courseId)
  }, [courseId, loadCourse])

  useEffect(() => {
    if (!manifest || !courseId) return
    const checkAll = async (): Promise<void> => {
      const map: Record<string, boolean> = {}
      for (const mod of manifest.navigation.modules) {
        for (const unit of mod.units) {
          for (const lesson of unit.lessons) {
            map[lesson.id] = await checkAccess(courseId, 'lesson', lesson.id, lesson.access)
          }
        }
      }
      setAccessMap(map)
    }
    checkAll()
  }, [manifest, courseId, user?.role])

  if (!manifest || !courseId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <i className="fas fa-spinner fa-spin text-3xl" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  const lessonInfo = currentLessonId ? findLesson(manifest, currentLessonId) : null
  const isLocked = currentLessonId ? !accessMap[currentLessonId] : false

  const handleActivateLicense = async (): Promise<void> => {
    const res = await apiFetch<{ valid: boolean }>({
      method: 'POST',
      path: '/api/license/activate',
      body: { courseId, key: licenseKey }
    })
    if (res.ok && res.data?.valid) {
      setShowLicense(false)
      if (courseId) loadCourse(courseId)
      const map: Record<string, boolean> = {}
      for (const mod of manifest.navigation.modules) {
        for (const unit of mod.units) {
          for (const lesson of unit.lessons) {
            map[lesson.id] = await checkAccess(courseId, 'lesson', lesson.id, lesson.access)
          }
        }
      }
      setAccessMap(map)
    }
  }

  const handlePresenter = (): void => {
    if (currentLessonId) {
      openPresenter(courseId, currentLessonId, useCourseStore.getState().currentSection || 's1')
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <button className="btn btn-ghost p-2" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left" />
        </button>
        <button className="btn btn-ghost p-2" onClick={toggleSidebar}>
          <i className={`fas ${sidebarOpen ? 'fa-indent' : 'fa-outdent'}`} />
        </button>
        <h1 className="font-semibold truncate flex-1">{manifest.title}</h1>
        {user?.role === 'instructor' && (
          <button className="btn btn-ghost text-sm" onClick={handlePresenter}>
            <i className="fas fa-chalkboard-teacher" /> {t('course.presenter')}
          </button>
        )}
        <button className="btn btn-ghost text-sm" onClick={() => setShowLicense(true)}>
          <i className="fas fa-key" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <CourseSidebar
          manifest={manifest}
          progress={progress}
          currentLessonId={currentLessonId}
          onSelectLesson={setCurrentLesson}
          accessMap={accessMap}
        />
        <main className="flex-1 overflow-hidden">
          {isLocked ? (
            <div className="flex items-center justify-center h-full">
              <div className="card p-8 text-center max-w-md">
                <i className="fas fa-lock text-4xl text-[var(--color-danger)] mb-4" />
                <p className="mb-4">{t('course.enterLicense')}</p>
                <input
                  className="input mb-3"
                  placeholder={t('course.licensePlaceholder')}
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                />
                <button className="btn btn-primary w-full justify-center" onClick={handleActivateLicense}>
                  {t('settings.activate')}
                </button>
              </div>
            </div>
          ) : lessonInfo ? (
            <LessonViewer
              courseId={courseId}
              lessonEntry={lessonInfo.lesson.entry}
              quizPath={lessonInfo.lesson.quiz}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
              {manifest.description}
            </div>
          )}
        </main>
      </div>

      {showLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowLicense(false)}>
          <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">{t('settings.license')}</h3>
            <input
              className="input mb-3"
              placeholder={t('course.licensePlaceholder')}
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
            />
            <button className="btn btn-primary w-full justify-center" onClick={handleActivateLicense}>
              {t('settings.activate')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
