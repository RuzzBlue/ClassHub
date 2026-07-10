import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/app-store'
import { ImportCourseMenu } from './ImportCourseMenu'
import type { CourseCardData } from '@shared/types'

interface AppHeaderProps {
  courses: CourseCardData[]
  onCoursesChange: () => Promise<void>
  onLoginClick: () => void
  onProfileClick: () => void
  showImport?: boolean
  search?: string
  onSearchChange?: (value: string) => void
}

export function AppHeader({
  courses,
  onCoursesChange,
  onLoginClick,
  onProfileClick,
  showImport = true,
  search,
  onSearchChange
}: AppHeaderProps): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAppStore()
  const onAdmin = location.pathname.startsWith('/admin')
  const onInstructor = location.pathname.startsWith('/instructor')
  const onLearner = location.pathname.startsWith('/learner-hub')
  const onLibrary = location.pathname === '/'

  return (
    <header className="flex items-center gap-4 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 flex-nowrap">
      <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/')}>
        <i className="fas fa-graduation-cap text-xl" style={{ color: 'var(--accent)' }} />
        <span className="font-bold text-lg">{t('app.name')}</span>
      </div>

      <nav className="flex gap-1 ml-2 items-center min-w-0 overflow-x-auto">
        <button
          type="button"
          className={`btn btn-ghost text-sm ${onLibrary ? 'bg-[var(--color-surface2)]' : ''}`}
          onClick={() => navigate('/')}
        >
          <i className="fas fa-th-large" /> {t('nav.library')}
        </button>

        {user?.role === 'admin' && (
          <button
            type="button"
            className={`btn btn-ghost text-sm ${onAdmin ? 'bg-[var(--color-surface2)]' : ''}`}
            onClick={() => navigate('/admin')}
          >
            <i className="fas fa-shield-halved" /> {t('nav.adminDashboard')}
          </button>
        )}

        {(user?.role === 'instructor' || user?.role === 'admin') && (
          <button
            type="button"
            className={`btn btn-ghost text-sm ${onInstructor ? 'bg-[var(--color-surface2)]' : ''}`}
            onClick={() => navigate('/instructor')}
          >
            <i className="fas fa-chalkboard-teacher" /> {t('roles.instructorArea')}
          </button>
        )}

        {(user?.role === 'learner' || user?.role === 'admin') && (
          <button
            type="button"
            className={`btn btn-ghost text-sm ${onLearner ? 'bg-[var(--color-surface2)]' : ''}`}
            onClick={() => navigate('/learner-hub')}
          >
            <i className="fas fa-user-graduate" /> {t('roles.studentHub')}
          </button>
        )}

        {showImport && !onAdmin && (
          <ImportCourseMenu courses={courses} onCoursesChange={onCoursesChange} />
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        {onSearchChange && (
          <div className="flex items-center gap-2 bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 w-64">
            <i className="fas fa-search text-[var(--color-text-muted)] text-sm shrink-0" />
            <input
              className="bg-transparent border-none outline-none text-sm w-full text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
              placeholder={t('library.search')}
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        {user ? (
          <button
            type="button"
            className="btn btn-ghost p-1 rounded-full cursor-pointer"
            onClick={onProfileClick}
            title={t('settings.profile')}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'var(--accent)' }}
            >
              {user.displayName[0]?.toUpperCase()}
            </div>
          </button>
        ) : (
          <button type="button" className="btn btn-primary text-sm cursor-pointer" onClick={onLoginClick}>
            <i className="fas fa-sign-in-alt" /> {t('auth.login')}
          </button>
        )}
      </div>
    </header>
  )
}
