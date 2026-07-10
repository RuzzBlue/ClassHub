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
