import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/app-store'
import { AdminDashboardMenu } from './AdminDashboardMenu'

interface CourseHeaderProps {
  onPresenterClick?: () => void
  showPresenter?: boolean
  onLoginClick: () => void
  onProfileClick: () => void
}

export function CourseHeader({
  onPresenterClick,
  showPresenter = false,
  onLoginClick,
  onProfileClick
}: CourseHeaderProps): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAppStore()
  const onLibrary = location.pathname === '/'

  return (
    <header className="app-top-header flex items-center gap-4 px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 flex-nowrap relative z-40 overflow-visible">
      <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/')}>
        <i className="fas fa-house text-xl" style={{ color: 'var(--accent)' }} />
        <span className="font-bold text-lg">{t('app.name')}</span>
      </div>

      <nav className="flex gap-1 ml-2 items-center shrink-0 overflow-visible">
        <button
          type="button"
          className={`btn btn-ghost text-sm ${onLibrary ? 'bg-[var(--color-surface2)]' : ''}`}
          onClick={() => navigate('/')}
        >
          <i className="fas fa-th-large" /> {t('nav.library')}
        </button>

        {user?.role === 'admin' && <AdminDashboardMenu />}

        {user?.role === 'instructor' && (
          <button
            type="button"
            className={`btn btn-ghost text-sm ${location.pathname.startsWith('/instructor') ? 'bg-[var(--color-surface2)]' : ''}`}
            onClick={() => navigate('/instructor/dashboard')}
          >
            <i className="fas fa-chalkboard-teacher" /> {t('roles.instructorArea')}
          </button>
        )}

        {user?.role === 'student' && (
          <button
            type="button"
            className={`btn btn-ghost text-sm ${location.pathname.startsWith('/student-hub') ? 'bg-[var(--color-surface2)]' : ''}`}
            onClick={() => navigate('/student-hub/dashboard')}
          >
            <i className="fas fa-user-graduate" /> {t('roles.studentHub')}
          </button>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        {showPresenter && onPresenterClick && (
          <button type="button" className="btn btn-ghost text-sm cursor-pointer" onClick={onPresenterClick}>
            <i className="fas fa-chalkboard-teacher" /> {t('course.presenter')}
          </button>
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
