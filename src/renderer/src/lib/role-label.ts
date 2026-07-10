import type { TFunction } from 'i18next'
import type { UserRole } from '@shared/types'

export function formatUserRole(role: UserRole, t: TFunction): string {
  if (role === 'admin') return t('settings.admin')
  if (role === 'instructor') return t('settings.instructor')
  return t('settings.student')
}

/** Course manifest extras still use learner/instructor role names. */
export function courseRoleForUser(role: UserRole | null | undefined): 'learner' | 'instructor' {
  if (role === 'instructor' || role === 'admin') return 'instructor'
  return 'learner'
}
