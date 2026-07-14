import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCourseStore } from '../stores/app-store'
import { useAppStore } from '../stores/app-store'
import { CourseSidebar, checkAccess } from '../components/CourseSidebar'
import { CourseHeader } from '../components/CourseHeader'
import { LessonViewer } from '../components/LessonViewer'
import { CourseHtmlPanel } from '../components/course/CourseHtmlPanel'
import { CourseLinksPanel, CourseFilesPanel } from '../components/course/StudentCourseDashboard'
import { CourseLabPanel } from '../components/course/CourseLabPanel'
import { PlaceholderPanel } from '../components/layout/PlaceholderPanel'
import { LoginModal } from '../components/LoginModal'
import { ProfileModal } from '../components/ProfileModal'
import { apiFetch, openPresenter } from '../lib/api-client'
import {
  courseMenuRoleForUser,
  findCourseAppMenu
} from '../lib/course-app-menus'
import { findLesson } from '@shared/schemas'

export function CoursePage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>()
  const { t } = useTranslation()
  const { user } = useAppStore()
  const {
    manifest,
    currentLessonId,
    progress,
    contentView,
    loadCourse,
    setCurrentLesson
  } = useCourseStore()
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({})
  const [licenseKey, setLicenseKey] = useState('')
  const [showLicense, setShowLicense] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

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

  const lessonInfo =
    contentView.kind === 'lesson' && currentLessonId ? findLesson(manifest, currentLessonId) : null
  const isLocked = lessonInfo && currentLessonId ? !accessMap[currentLessonId] : false
  const showPresenter = user?.role === 'instructor' || user?.role === 'admin'

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

  const renderMainContent = (): React.JSX.Element => {
    if (contentView.kind === 'app-panel') {
      if (contentView.panel === 'lab') {
        return <CourseLabPanel courseId={courseId} />
      }
      const menuRole = courseMenuRoleForUser(user)
      const item = findCourseAppMenu(menuRole, manifest, contentView.panel)
      return (
        <PlaceholderPanel
          title={item?.titleOverride ?? t(item?.titleKey ?? 'course.menu')}
          hint={t(item?.hintKey ?? 'settings.comingSoon')}
          icon={item?.icon ?? 'fa-puzzle-piece'}
        />
      )
    }
    if (contentView.kind === 'html') {
      return <CourseHtmlPanel courseId={courseId} path={contentView.path} />
    }
    if (contentView.kind === 'links') {
      return <CourseLinksPanel courseId={courseId} path={contentView.path} />
    }
    if (contentView.kind === 'files') {
      return (
        <CourseFilesPanel courseId={courseId} path={contentView.path} title={contentView.title} />
      )
    }

    if (isLocked && currentLessonId) {
      return (
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
      )
    }

    if (lessonInfo) {
      return (
        <LessonViewer
          courseId={courseId}
          courseTitle={manifest.title}
          lessonEntry={lessonInfo.lesson.entry}
          quizPath={lessonInfo.lesson.quiz}
        />
      )
    }

    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] p-8 text-center">
        {manifest.description}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <CourseHeader
        showPresenter={showPresenter}
        onPresenterClick={handlePresenter}
        onLoginClick={() => setLoginOpen(true)}
        onProfileClick={() => setProfileOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <CourseSidebar
          manifest={manifest}
          progress={progress}
          currentLessonId={currentLessonId}
          onSelectLesson={setCurrentLesson}
          accessMap={accessMap}
        />
        <main className="flex-1 overflow-hidden min-w-0">{renderMainContent()}</main>
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

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
