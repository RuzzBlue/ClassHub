import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/app-store'
import { apiFetch } from '../lib/api-client'
import type { User } from '@shared/types'

interface Props {
  open: boolean
  onClose: () => void
}

export function LoginModal({ open, onClose }: Props): React.JSX.Element | null {
  const { t } = useTranslation()
  const { loadUser } = useAppStore()
  const [email, setEmail] = useState('admin@classhub.local')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleLogin = async (): Promise<void> => {
    setLoading(true)
    setError('')
    const res = await apiFetch<{ user: User }>({
      method: 'POST',
      path: '/api/auth/login',
      body: { email, password }
    })
    if (res.ok && res.data?.user) {
      await loadUser()
      onClose()
    } else {
      setError(t('auth.invalidCredentials'))
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('auth.login')}</h2>
          <button className="btn btn-ghost p-2" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-[var(--color-text-muted)]">{t('auth.email')}</label>
            <input
              className="input mt-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-sm text-[var(--color-text-muted)]">{t('auth.password')}</label>
            <input
              className="input mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <p className="text-xs text-[var(--color-text-muted)]">{t('auth.demoHint')}</p>
          <button className="btn btn-primary w-full justify-center" onClick={handleLogin} disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-sign-in-alt" />}
            {t('auth.signIn')}
          </button>
        </div>
      </div>
    </div>
  )
}
