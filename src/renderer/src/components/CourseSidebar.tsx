import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { CourseManifest } from '@shared/schemas'
import type { ProgressSnapshot } from '@shared/types'
import { useAppStore } from '../stores/app-store'
import { useCourseStore } from '../stores/app-store'
import { apiFetch } from '../lib/api-client'
import { courseRoleForUser } from '../lib/role-label'
import {
  courseMenuRoleForUser,
  getCourseAppMenus,
  getDefaultCoursePanelId
} from '../lib/course-app-menus'
import { cn } from '../lib/utils'
import { CourseProgressWidget } from './course/CourseProgressWidget'
import { CourseCurriculumOverview } from './course/CourseCurriculumOverview'

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
  const { sidebarOpen, activeTab, setActiveTab, toggleSidebar, selectedMenuId, selectCourseMenu, selectExtra } =
    useCourseStore()
  const { user } = useAppStore()

  const courseRole = courseRoleForUser(user?.role)
  const menuRole = courseMenuRoleForUser(user)
  const appMenus = getCourseAppMenus(menuRole, manifest)

  // If auth finishes after course load, ensure a menu panel is selected on the Menu tab.
  useEffect(() => {
    if (activeTab !== 'menu') return
    if (!selectedMenuId || !appMenus.some((item) => item.id === selectedMenuId)) {
      selectCourseMenu(getDefaultCoursePanelId(menuRole))
    }
  }, [activeTab, manifest.id, user?.id, user?.role, selectedMenuId, menuRole, selectCourseMenu])

  const extras = manifest.extras
    .filter((e) => user?.role === 'admin' || e.roles.includes(courseRole))
    .sort((a, b) => a.order - b.order)

  const getLessonStatus = (lessonId: string): string => {
    const lp = progress?.lessons.find((l) => l.lessonId === lessonId)
    if (!lp || lp.status === 'not_started') return 'not_started'
    if (lp.status === 'completed') return 'completed'
    return 'in_progress'
  }

  if (!sidebarOpen) {
    return (
      <button
        type="button"
        className="course-sidebar-expand"
        onClick={toggleSidebar}
        aria-label={t('nav.expandSidebar')}
        title={t('nav.expandSidebar')}
      >
        <i className="fas fa-chevron-right" />
      </button>
    )
  }

  return (
    <aside className="course-sidebar w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0">
      <div className="flex border-b border-[var(--color-border)] items-stretch">
        <button
          type="button"
          className={cn('course-sidebar-tab flex-1', activeTab === 'menu' && 'course-sidebar-tab-active')}
          onClick={() => setActiveTab('menu')}
        >
          {t('course.menu')}
        </button>
        <button
          type="button"
          className={cn('course-sidebar-tab flex-1', activeTab === 'overview' && 'course-sidebar-tab-active')}
          onClick={() => setActiveTab('overview')}
        >
          {t('course.overview')}
        </button>
        <button
          type="button"
          className="btn btn-ghost px-3 border-l border-[var(--color-border)] shrink-0"
          onClick={toggleSidebar}
          aria-label={t('nav.collapseSidebar')}
          title={t('nav.collapseSidebar')}
        >
          <i className="fas fa-chevron-left" />
        </button>
      </div>

      {activeTab === 'menu' ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-3 border-b border-[var(--color-border)] shrink-0">
            <CourseProgressWidget manifest={manifest} progress={progress} />
          </div>

          <div className="flex-1 overflow-auto p-2 space-y-1 min-h-0">
            {appMenus.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'course-sidebar-menu-item',
                  selectedMenuId === item.id && 'course-sidebar-menu-item-active'
                )}
                onClick={() => selectCourseMenu(item.id)}
              >
                <i className={`fas ${item.icon} course-sidebar-menu-icon`} aria-hidden="true" />
                <span className="truncate">{item.titleOverride ?? t(item.titleKey)}</span>
              </button>
            ))}
          </div>

          {extras.length > 0 && (
            <div className="border-t border-[var(--color-border)] p-2 mt-auto shrink-0">
              <p className="course-sidebar-label px-2 mb-2">{t('course.extras')}</p>
              <div className="space-y-1">
                {extras.map((extra) => (
                  <button
                    key={extra.id}
                    type="button"
                    className={cn(
                      'course-sidebar-menu-item',
                      selectedMenuId === extra.id && 'course-sidebar-menu-item-active'
                    )}
                    onClick={() => selectExtra(extra)}
                  >
                    <i className={`fas ${extra.icon} course-sidebar-menu-icon`} aria-hidden="true" />
                    <span className="truncate">{extra.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-3 border-b border-[var(--color-border)] shrink-0">
            <CourseProgressWidget manifest={manifest} progress={progress} />
          </div>
          <CourseCurriculumOverview
            manifest={manifest}
            currentLessonId={currentLessonId}
            accessMap={accessMap}
            getLessonStatus={getLessonStatus}
            onSelectLesson={onSelectLesson}
          />
        </div>
      )}
    </aside>
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
