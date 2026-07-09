import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: Props): React.JSX.Element | null {
  const { t } = useTranslation()
  const [version, setVersion] = useState('1.0.0')

  useEffect(() => {
    if (open && window.classhub?.getVersion) {
      window.classhub.getVersion().then(setVersion).catch(() => setVersion('1.0.0'))
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <i className="fas fa-graduation-cap text-4xl mb-3" style={{ color: 'var(--accent)' }} />
        <h2 className="text-xl font-bold mb-1">ClassHub</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          {t('help.version', { version })}
        </p>
        <div className="text-sm space-y-1 border-t border-[var(--color-border)] pt-4">
          <p>{t('help.createdBy')}</p>
          <p className="font-medium">Branko Pereira</p>
          <p className="text-[var(--color-text-muted)] mt-3">{t('help.builtWith')}</p>
          <p className="font-medium">Cursor AI</p>
        </div>
        <button className="btn btn-primary w-full justify-center mt-6" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
