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
}

export function AppHeader({
  courses,
  onCoursesChange,
  onLoginClick,
  onProfileClick,
  showImport = true
}: AppHeaderProps): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAppStore()
  const isAdmin = user?.role === 'admin'
  const onAdmin = location.pathname.startsWith('/admin')

  return (
    <header className="flex items-center gap-4 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <i className="fas fa-graduation-cap text-xl" style={{ color: 'var(--accent)' }} />
        <span className="font-bold text-lg">{t('app.name')}</span>
      </div>
      <nav className="flex gap-1 ml-4">
        <button
          className={`btn btn-ghost text-sm ${!onAdmin && location.pathname === '/' ? 'bg-[var(--color-surface2)]' : ''}`}
          onClick={() => navigate('/')}
        >
          <i className="fas fa-th-large" /> {t('nav.library')}
        </button>
        {isAdmin && (
          <button
            className={`btn btn-ghost text-sm ${onAdmin ? 'bg-[var(--color-surface2)]' : ''}`}
            onClick={() => navigate('/admin')}
          >
            <i className="fas fa-shield-halved" /> {t('nav.adminDashboard')}
          </button>
        )}
        {!onAdmin && showImport && (
          <ImportCourseMenu courses={courses} onCoursesChange={onCoursesChange} />
        )}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <button className="btn btn-ghost p-1 rounded-full" onClick={onProfileClick} title={t('settings.profile')}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'var(--accent)' }}
            >
              {user.displayName[0]?.toUpperCase()}
            </div>
          </button>
        ) : (
          <button className="btn btn-primary text-sm" onClick={onLoginClick}>
            <i className="fas fa-sign-in-alt" /> {t('auth.login')}
          </button>
        )}
      </div>
    </header>
  )
}
