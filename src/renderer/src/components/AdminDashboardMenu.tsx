import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function AdminDashboardMenu(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const onAdmin = location.pathname.startsWith('/admin')
  const onInstructor = location.pathname.startsWith('/instructor')
  const onLearner = location.pathname.startsWith('/learner-hub')
  const active = onAdmin || onInstructor || onLearner

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative inline-flex shrink-0" ref={menuRef}>
      <div className="inline-flex rounded-lg overflow-hidden border border-[var(--color-border)]">
        <button
          type="button"
          className={`btn btn-ghost text-sm rounded-none border-0 ${active ? 'bg-[var(--color-surface2)]' : ''}`}
          onClick={() => navigate('/admin')}
        >
          <i className="fas fa-shield-halved" /> {t('nav.adminDashboard')}
        </button>
        <button
          type="button"
          className="btn btn-ghost text-sm rounded-none border-0 border-l border-[var(--color-border)] px-2 cursor-pointer"
          onClick={() => setOpen((v) => !v)}
          aria-label={t('nav.roleViewsMore')}
        >
          <i className={`fas fa-chevron-down text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="header-dropdown">
          <button
            type="button"
            className="header-dropdown-item"
            onClick={() => {
              setOpen(false)
              navigate('/instructor')
            }}
          >
            <i className="fas fa-chalkboard-teacher w-4" />
            {t('roles.instructorArea')}
          </button>
          <button
            type="button"
            className="header-dropdown-item"
            onClick={() => {
              setOpen(false)
              navigate('/learner-hub')
            }}
          >
            <i className="fas fa-user-graduate w-4" />
            {t('roles.studentHub')}
          </button>
        </div>
      )}
    </div>
  )
}
