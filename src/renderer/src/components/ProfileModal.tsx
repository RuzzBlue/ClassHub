import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/app-store'
import { apiFetch } from '../lib/api-client'
import type { User } from '@shared/types'
import { cn } from '../lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = 'profile' | 'app' | 'role' | 'license'

export function ProfileModal({ open, onClose }: Props): React.JSX.Element | null {
  const { t, i18n } = useTranslation()
  const { settings, user, updateSettings, loadUser, logout } = useAppStore()
  const [tab, setTab] = useState<Tab>('profile')
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accent, setAccent] = useState(settings?.theme.accent || '#6c5ce7')
  const [mode, setMode] = useState<'dark' | 'light'>(settings?.theme.mode || 'dark')
  const [sounds, setSounds] = useState(settings?.theme.sounds ?? true)
  const [locale, setLocale] = useState(settings?.locale || 'en')
  const [message, setMessage] = useState('')

  if (!open || !user) return null

  const handleSaveProfile = async (): Promise<void> => {
    if (password && password !== confirmPassword) {
      setMessage(t('auth.passwordMismatch'))
      return
    }
    const body: Record<string, string> = { displayName, email }
    if (password) body.password = password
    await apiFetch<User>({ method: 'PUT', path: `/api/users/${user.id}`, body })
    await loadUser()
    setPassword('')
    setConfirmPassword('')
    setMessage(t('settings.saved'))
  }

  const handleSaveApp = async (): Promise<void> => {
    await updateSettings({
      locale: locale as 'en' | 'es',
      theme: { accent, mode, sounds }
    })
    i18n.changeLanguage(locale)
    setMessage(t('settings.saved'))
  }

  const handleLogout = async (): Promise<void> => {
    await apiFetch({ method: 'POST', path: '/api/auth/logout' })
    await logout()
    onClose()
  }

  const tabs: { id: Tab; label: string; icon: string; disabled?: boolean }[] = [
    { id: 'profile', label: t('settings.profile'), icon: 'fa-user' },
    { id: 'app', label: t('settings.appSettings'), icon: 'fa-palette' },
    { id: 'role', label: t('settings.role'), icon: 'fa-user-tag', disabled: true },
    { id: 'license', label: t('settings.license'), icon: 'fa-key', disabled: true }
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
              <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
            </div>
          </div>
          <button className="btn btn-ghost p-2" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="flex border-b border-[var(--color-border)]">
          {tabs.map((titem) => (
            <button
              key={titem.id}
              className={cn(
                'flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1',
                tab === titem.id && 'border-b-2',
                titem.disabled && 'opacity-40 cursor-not-allowed'
              )}
              style={tab === titem.id ? { borderColor: 'var(--accent)' } : {}}
              onClick={() => !titem.disabled && setTab(titem.id)}
              disabled={titem.disabled}
              title={titem.disabled ? t('settings.comingSoon') : undefined}
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
                <input
                  className="input mt-1"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.leaveBlank')}
                />
              </div>
              {password && (
                <div>
                  <label className="text-sm text-[var(--color-text-muted)]">{t('auth.confirmPassword')}</label>
                  <input
                    className="input mt-1"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}
              <button className="btn btn-primary w-full justify-center" onClick={handleSaveProfile}>
                {t('settings.save')}
              </button>
            </>
          )}

          {tab === 'app' && (
            <>
              <div>
                <label className="text-sm text-[var(--color-text-muted)]">{t('settings.language')}</label>
                <select className="input mt-1" value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'es')}>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-[var(--color-text-muted)]">{t('settings.accentColor')}</label>
                <input type="color" className="w-full h-10 mt-1 rounded cursor-pointer" value={accent} onChange={(e) => setAccent(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button
                  className={`btn flex-1 justify-center ${mode === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMode('dark')}
                >
                  {t('settings.darkMode')}
                </button>
                <button
                  className={`btn flex-1 justify-center ${mode === 'light' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMode('light')}
                >
                  {t('settings.lightMode')}
                </button>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={sounds} onChange={(e) => setSounds(e.target.checked)} />
                {t('settings.sounds')}
              </label>
              <button className="btn btn-primary w-full justify-center" onClick={handleSaveApp}>
                {t('settings.save')}
              </button>
            </>
          )}

          {tab === 'role' && (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">{t('settings.comingSoon')}</p>
          )}

          {tab === 'license' && (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">{t('settings.comingSoon')}</p>
          )}

          {message && <p className="text-sm text-center text-[var(--color-success)]">{message}</p>}
        </div>

        <div className="px-6 py-3 border-t border-[var(--color-border)]">
          <button className="btn btn-ghost w-full justify-center text-[var(--color-danger)]" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt" /> {t('auth.signOut')}
          </button>
        </div>
      </div>
    </div>
  )
}
