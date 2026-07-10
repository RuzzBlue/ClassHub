import type { CourseManifest } from '@shared/schemas'
import type { CourseView } from '@shared/schemas'

/** Instructor views from manifest, with legacy dashboard fallback. */
export function getInstructorViews(manifest: CourseManifest): CourseView[] {
  if (manifest.instructor?.views?.length) {
    return manifest.instructor.views
  }
  if (manifest.instructor?.dashboard) {
    return [
      {
        id: 'dashboard',
        title: 'Dashboard',
        icon: 'fa-gauge-high',
        entry: manifest.instructor.dashboard,
        render: 'html'
      }
    ]
  }
  return []
}

export function getStudentViews(manifest: CourseManifest): CourseView[] {
  return [...(manifest.student?.views ?? [])]
}

/** Role-specific course menus for the current user (guests get student views). */
export function getRoleViewsForUser(
  manifest: CourseManifest,
  user: { role: string } | null | undefined
): CourseView[] {
  const instructorViews =
    user?.role === 'instructor' || user?.role === 'admin' ? getInstructorViews(manifest) : []
  const studentViews =
    !user || user.role === 'student' || user?.role === 'admin' ? getStudentViews(manifest) : []
  return [...instructorViews, ...studentViews]
}

export function getDefaultRoleView(
  manifest: CourseManifest,
  user: { role: string } | null | undefined
): CourseView | null {
  const views = getRoleViewsForUser(manifest, user)
  return views[0] ?? null
}
