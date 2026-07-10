import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function RoleViewsMenu(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const onInstructor = location.pathname.startsWith('/instructor')
  const onLearner = location.pathname.startsWith('/learner-hub')
  const active = onInstructor || onLearner

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative inline-flex" ref={menuRef}>
      <div className="inline-flex rounded-lg overflow-hidden border border-[var(--color-border)]">
        <button
          type="button"
          className={`btn btn-ghost text-sm rounded-none border-0 ${active ? 'bg-[var(--color-surface2)]' : ''}`}
          onClick={() => navigate(onLearner ? '/learner-hub' : '/instructor')}
        >
          <i className={`fas ${onLearner ? 'fa-user-graduate' : 'fa-chalkboard-teacher'}`} />
          {onLearner ? t('roles.studentHub') : t('roles.instructorArea')}
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
        <div className="absolute top-full left-0 mt-1 min-w-[220px] z-50 card py-1 shadow-lg">
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface2)] flex items-center gap-2 cursor-pointer"
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
            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface2)] flex items-center gap-2 cursor-pointer"
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
