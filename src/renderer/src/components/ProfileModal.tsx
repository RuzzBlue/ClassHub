import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/app-store'
import { apiFetch } from '../lib/api-client'
import { PasswordField } from './PasswordField'
import { formatUserRole } from '../lib/role-label'
import type { User } from '@shared/types'
import { cn } from '../lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = 'profile' | 'app' | 'role'

export function ProfileModal({ open, onClose }: Props): React.JSX.Element | null {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { settings, user, updateSettings, loadUser, logout } = useAppStore()
  const [tab, setTab] = useState<Tab>('profile')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accent, setAccent] = useState('#6c5ce7')
  const [mode, setMode] = useState<'dark' | 'light'>('dark')
  const [sounds, setSounds] = useState(true)
  const [locale, setLocale] = useState<'en' | 'es'>('en')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName)
      setEmail(user.email || '')
      setPassword('')
      setConfirmPassword('')
      setMessage('')
      setTab('profile')
    }
  }, [open, user])

  useEffect(() => {
    if (open && settings) {
      setAccent(settings.theme.accent)
      setMode(settings.theme.mode)
      setSounds(settings.theme.sounds)
      setLocale(settings.locale)
    }
  }, [open, settings])

  if (!open || !user) return null

  const handleSaveProfile = async (): Promise<void> => {
    if (password && password !== confirmPassword) {
      setMessage(t('auth.passwordMismatch'))
      return
    }
    const body: Record<string, string> = { displayName }
    if (email.trim()) body.email = email.trim()
    if (password) body.password = password
    const res = await apiFetch<User>({ method: 'PUT', path: `/api/users/${user.id}`, body })
    if (res.ok) {
      await loadUser()
      setPassword('')
      setConfirmPassword('')
      setMessage(t('settings.saved'))
    }
  }

  const handleSaveApp = async (): Promise<void> => {
    await updateSettings({
      locale,
      theme: { accent, mode, sounds }
    })
    i18n.changeLanguage(locale)
    setMessage(t('settings.saved'))
  }

  const handleLogout = async (): Promise<void> => {
    await apiFetch({ method: 'POST', path: '/api/auth/logout' })
    await logout()
    onClose()
    navigate('/')
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile', label: t('settings.profile'), icon: 'fa-user' },
    { id: 'app', label: t('settings.appSettings'), icon: 'fa-palette' },
    { id: 'role', label: t('settings.role'), icon: 'fa-user-tag' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="card p-0 w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: 'var(--accent)' }}
            >
              {user.displayName[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold">{user.displayName}</h2>
              <p className="text-xs text-[var(--color-text-muted)]">{user.email || '—'}</p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost p-2 cursor-pointer" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="flex border-b border-[var(--color-border)]">
          {tabs.map((titem) => (
            <button
              key={titem.id}
              type="button"
              className={cn(
                'flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer',
                tab === titem.id && 'border-b-2'
              )}
              style={tab === titem.id ? { borderColor: 'var(--accent)' } : {}}
              onClick={() => setTab(titem.id)}
            >
              <i className={`fas ${titem.icon}`} />
              {titem.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 max-h-[50vh] overflow-auto">
          {tab === 'profile' && (
            <>
              <div>
                <label className="text-sm text-[var(--color-text-muted)]">{t('settings.displayName')}</label>
                <input className="input mt-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-[var(--color-text-muted)]">{t('auth.email')}</label>
                <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-[var(--color-text-muted)]">{t('auth.newPassword')}</label>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  placeholder={t('auth.leaveBlank')}
                />
              </div>
              {password && (
                <div>
                  <label className="text-sm text-[var(--color-text-muted)]">{t('auth.confirmPassword')}</label>
                  <PasswordField value={confirmPassword} onChange={setConfirmPassword} />
                </div>
              )}
              <button type="button" className="btn btn-primary w-full justify-center cursor-pointer" onClick={handleSaveProfile}>
                {t('settings.save')}
              </button>
            </>
          )}

          {tab === 'app' && (
            <>
              <div className="flex items-end gap-4">
                <div className="flex-1 min-w-0">
                  <label className="text-sm text-[var(--color-text-muted)]">{t('settings.language')}</label>
                  <select
                    className="input mt-1 w-full"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as 'en' | 'es')}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div className="shrink-0">
                  <label className="text-sm text-[var(--color-text-muted)] block mb-1">{t('settings.accentColor')}</label>
                  <input
                    type="color"
                    className="color-picker-circle"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    title={t('settings.accentColor')}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`btn flex-1 justify-center cursor-pointer ${mode === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMode('dark')}
                >
                  {t('settings.darkMode')}
                </button>
                <button
                  type="button"
                  className={`btn flex-1 justify-center cursor-pointer ${mode === 'light' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMode('light')}
                >
                  {t('settings.lightMode')}
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sounds} onChange={(e) => setSounds(e.target.checked)} />
                {t('settings.sounds')}
              </label>
              <button type="button" className="btn btn-primary w-full justify-center cursor-pointer" onClick={handleSaveApp}>
                {t('settings.save')}
              </button>
            </>
          )}

          {tab === 'role' && user && (
            <>
              <div className="card p-4 bg-[var(--color-surface2)]">
                <p className="text-sm text-[var(--color-text-muted)]">{t('settings.role')}</p>
                <p className="font-semibold">{formatUserRole(user.role, t)}</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">{t('admin.status')}</p>
                <p className="capitalize">{user.status}</p>
                {user.groupName && (
                  <>
                    <p className="text-sm text-[var(--color-text-muted)] mt-2">{t('admin.group')}</p>
                    <p>{user.groupName}</p>
                  </>
                )}
              </div>
              {(user.role === 'instructor' || user.role === 'admin') && (
                <button
                  type="button"
                  className="btn btn-primary w-full justify-center cursor-pointer"
                  onClick={() => {
                    onClose()
                    navigate('/instructor/dashboard')
                  }}
                >
                  <i className="fas fa-chalkboard-teacher" /> {t('roles.instructorArea')}
                </button>
              )}
              {(user.role === 'student' || user.role === 'admin') && (
                <button
                  type="button"
                  className="btn btn-ghost w-full justify-center border border-[var(--color-border)] cursor-pointer"
                  onClick={() => {
                    onClose()
                    navigate('/student-hub/dashboard')
                  }}
                >
                  <i className="fas fa-user-graduate" /> {t('roles.studentHub')}
                </button>
              )}
            </>
          )}

          {message && <p className="text-sm text-center text-[var(--color-success)]">{message}</p>}
        </div>

        <div className="px-6 py-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            className="btn btn-ghost w-full justify-center text-[var(--color-danger)] cursor-pointer"
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt" /> {t('auth.signOut')}
          </button>
        </div>
      </div>
    </div>
  )
}
