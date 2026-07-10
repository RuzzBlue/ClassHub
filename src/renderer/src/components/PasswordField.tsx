import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface PasswordFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  className?: string
}

export function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
  onKeyDown,
  className = 'input mt-1'
}: PasswordFieldProps): React.JSX.Element {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        className={`${className} pr-10`}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 cursor-pointer"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        tabIndex={-1}
      >
        <i className={`fas ${visible ? 'fa-eye-slash' : 'fa-eye'}`} />
      </button>
    </div>
  )
}
