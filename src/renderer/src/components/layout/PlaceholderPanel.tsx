import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/app-store'
import { formatUserRole } from '../../lib/role-label'

interface PlaceholderPanelProps {
  title: string
  hint: string
  icon: string
}

export function PlaceholderPanel({ title, hint, icon }: PlaceholderPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const { user } = useAppStore()

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="card p-8 max-w-lg text-center">
        <i className={`fas ${icon} text-4xl mb-4`} style={{ color: 'var(--accent)' }} />
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-[var(--color-text-muted)]">{hint}</p>
        {user && (
          <p className="text-sm mt-4">
            {t('roles.signedInAs')}{' '}
            <strong>
              {user.displayName} ({formatUserRole(user.role, t)})
            </strong>
          </p>
        )}
      </div>
    </div>
  )
}
