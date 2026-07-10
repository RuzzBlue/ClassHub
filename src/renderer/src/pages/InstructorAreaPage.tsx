import { useTranslation } from 'react-i18next'
import { AppLayout } from '../components/AppLayout'
import { useAppStore } from '../stores/app-store'

export function InstructorAreaPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { user } = useAppStore()

  return (
    <AppLayout showImport={false}>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="card p-8 max-w-lg text-center">
          <i className="fas fa-chalkboard-teacher text-4xl mb-4" style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl font-bold mb-2">{t('roles.instructorArea')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('roles.instructorAreaHint')}</p>
          {user && (
            <p className="text-sm mt-4">
              {t('roles.signedInAs')} <strong>{user.displayName}</strong> ({user.role})
            </p>
          )}
        </div>
      </main>
    </AppLayout>
  )
}
