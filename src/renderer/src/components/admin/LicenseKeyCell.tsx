import { useTranslation } from 'react-i18next'

const MASKED = '••••••••••••'

interface Props {
  code: string
  visible: boolean
  onToggle: () => void
}

export function LicenseKeyCell({ code, visible, onToggle }: Props): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-mono text-xs ${visible ? '' : 'tracking-widest text-[var(--color-text-muted)]'}`}>
        {visible ? code : MASKED}
      </span>
      <button
        type="button"
        className="btn btn-ghost p-1 text-xs cursor-pointer shrink-0"
        onClick={onToggle}
        aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        title={visible ? t('auth.hidePassword') : t('auth.showPassword')}
      >
        <i className={`fas ${visible ? 'fa-eye-slash' : 'fa-eye'}`} />
      </button>
    </div>
  )
}
