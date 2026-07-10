import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Option {
  value: string
  label: string
}

interface FilterableSelectProps {
  value: string
  options: Option[]
  onChange: (value: string) => void
  placeholder?: string
}

export function FilterableSelect({
  value,
  options,
  onChange,
  placeholder
}: FilterableSelectProps): React.JSX.Element {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  return (
    <div className="space-y-1 min-w-[200px]">
      <input
        className="input py-1 text-sm"
        placeholder={placeholder || t('admin.filterAssignee')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        className="input py-1 text-sm max-h-40"
        size={Math.min(6, Math.max(3, filtered.length))}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {filtered.map((opt) => (
          <option key={opt.value || '__empty'} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {filtered.length === 0 && (
          <option value="" disabled>
            {t('admin.noRows')}
          </option>
        )}
      </select>
    </div>
  )
}
