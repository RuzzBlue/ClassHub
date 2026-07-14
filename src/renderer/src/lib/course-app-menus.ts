import type { CourseManifest } from '@shared/schemas'

/** Built-in course Menu panels (not shipped inside course packs). */
export type CourseAppPanelId =
  | 'instructor-panel'
  | 'student-panel'
  | 'attendance'
  | 'grades'
  | 'tickets'
  | 'config'
  | 'progress'
  | 'achievements'
  | 'material'
  | 'lab'

export type CourseMenuRole = 'instructor' | 'student'

export interface CourseAppMenuItem {
  id: CourseAppPanelId
  icon: string
  titleKey: string
  hintKey: string
  /** When set (e.g. Lab from course.json), prefer over titleKey. */
  titleOverride?: string
}

const INSTRUCTOR_MENUS: CourseAppMenuItem[] = [
  {
    id: 'instructor-panel',
    icon: 'fa-gauge-high',
    titleKey: 'course.appMenus.instructorPanel',
    hintKey: 'course.appMenus.instructorPanelHint'
  },
  {
    id: 'attendance',
    icon: 'fa-clipboard-check',
    titleKey: 'course.appMenus.attendance',
    hintKey: 'course.appMenus.attendanceHint'
  },
  {
    id: 'grades',
    icon: 'fa-chart-line',
    titleKey: 'course.appMenus.grades',
    hintKey: 'course.appMenus.gradesHint'
  },
  {
    id: 'tickets',
    icon: 'fa-ticket',
    titleKey: 'course.appMenus.tickets',
    hintKey: 'course.appMenus.ticketsHint'
  },
  {
    id: 'config',
    icon: 'fa-gear',
    titleKey: 'course.appMenus.config',
    hintKey: 'course.appMenus.configHint'
  }
]

const STUDENT_MENUS: CourseAppMenuItem[] = [
  {
    id: 'student-panel',
    icon: 'fa-gauge-high',
    titleKey: 'course.appMenus.studentPanel',
    hintKey: 'course.appMenus.studentPanelHint'
  },
  {
    id: 'progress',
    icon: 'fa-chart-simple',
    titleKey: 'course.appMenus.progress',
    hintKey: 'course.appMenus.progressHint'
  },
  {
    id: 'achievements',
    icon: 'fa-trophy',
    titleKey: 'course.appMenus.achievements',
    hintKey: 'course.appMenus.achievementsHint'
  },
  {
    id: 'grades',
    icon: 'fa-chart-line',
    titleKey: 'course.appMenus.grades',
    hintKey: 'course.appMenus.gradesHint'
  },
  {
    id: 'tickets',
    icon: 'fa-ticket',
    titleKey: 'course.appMenus.tickets',
    hintKey: 'course.appMenus.ticketsHint'
  },
  {
    id: 'material',
    icon: 'fa-folder-open',
    titleKey: 'course.appMenus.material',
    hintKey: 'course.appMenus.materialHint'
  }
]

export function courseMenuRoleForUser(user: { role: string } | null | undefined): CourseMenuRole {
  if (user?.role === 'instructor' || user?.role === 'admin') return 'instructor'
  return 'student'
}

export function getDefaultCoursePanelId(role: CourseMenuRole): CourseAppPanelId {
  return role === 'instructor' ? 'instructor-panel' : 'student-panel'
}

export function getCourseAppMenus(
  role: CourseMenuRole,
  manifest: CourseManifest
): CourseAppMenuItem[] {
  const base = role === 'instructor' ? INSTRUCTOR_MENUS : STUDENT_MENUS
  if (!manifest.lab) return [...base]

  return [
    ...base,
    {
      id: 'lab',
      icon: manifest.lab.icon || 'fa-flask',
      titleKey: 'course.appMenus.lab',
      hintKey: 'course.appMenus.labHint',
      titleOverride: manifest.lab.title
    }
  ]
}

export function findCourseAppMenu(
  role: CourseMenuRole,
  manifest: CourseManifest,
  panelId: string
): CourseAppMenuItem | undefined {
  return getCourseAppMenus(role, manifest).find((item) => item.id === panelId)
}
