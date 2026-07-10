import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface EditableColumn<T> {
  key: string
  label: string
  editable?: boolean
  type?: 'text' | 'select' | 'date'
  options?: { value: string; label: string }[]
  getValue: (row: T) => string
  render?: (row: T) => React.ReactNode
  renderEdit?: (row: T, value: string, onChange: (value: string) => void) => React.ReactNode
}

interface EditableDataTableProps<T extends { id: string }> {
  rows: T[]
  columns: EditableColumn<T>[]
  filterPlaceholder?: string
  filterExtra?: React.ReactNode
  onSave: (row: T, updates: Record<string, string>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  getEditValues?: (row: T) => Record<string, string>
  extraActions?: (row: T) => React.ReactNode
}

export function EditableDataTable<T extends { id: string }>({
  rows,
  columns,
  filterPlaceholder,
  filterExtra,
  onSave,
  onDelete,
  getEditValues,
  extraActions
}: EditableDataTableProps<T>): React.JSX.Element {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      columns.some((col) => col.getValue(row).toLowerCase().includes(q))
    )
  }, [rows, columns, filter])

  const startEdit = (row: T): void => {
    setEditingId(row.id)
    const values: Record<string, string> = {}
    for (const col of columns) {
      if (col.editable) values[col.key] = col.getValue(row)
    }
    if (getEditValues) Object.assign(values, getEditValues(row))
    setDraft(values)
  }

  const cancelEdit = (): void => {
    setEditingId(null)
    setDraft({})
  }

  const saveEdit = async (row: T): Promise<void> => {
    setSaving(true)
    try {
      await onSave(row, draft)
      cancelEdit()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-sm"
          placeholder={filterPlaceholder || t('admin.filterTable')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filterExtra}
      </div>
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left">
              {columns.map((col) => (
                <th key={col.key} className="p-3 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="p-3 w-36" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const isEditing = editingId === row.id
              return (
                <tr key={row.id} className="border-b border-[var(--color-border)]">
                  {columns.map((col) => (
                    <td key={col.key} className="p-2">
                      {isEditing && col.editable ? (
                        col.renderEdit ? (
                          col.renderEdit(row, draft[col.key] ?? '', (v) =>
                            setDraft((d) => ({ ...d, [col.key]: v }))
                          )
                        ) : col.type === 'select' ? (
                          <select
                            className="input py-1 text-sm"
                            value={draft[col.key] ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, [col.key]: e.target.value }))}
                          >
                            {col.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="input py-1 text-sm"
                            type={col.type === 'date' ? 'date' : 'text'}
                            value={draft[col.key] ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, [col.key]: e.target.value }))}
                          />
                        )
                      ) : col.render ? (
                        col.render(row)
                      ) : (
                        col.getValue(row) || '—'
                      )}
                    </td>
                  ))}
                  <td className="p-2 text-right whitespace-nowrap">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost text-xs px-2"
                          disabled={saving}
                          onClick={() => void saveEdit(row)}
                        >
                          <i className="fas fa-check text-[var(--color-success)]" />
                        </button>
                        <button type="button" className="btn btn-ghost text-xs px-2" onClick={cancelEdit}>
                          <i className="fas fa-times" />
                        </button>
                      </>
                    ) : (
                      <>
                        {extraActions?.(row)}
                        <button type="button" className="btn btn-ghost text-xs px-2 cursor-pointer" onClick={() => startEdit(row)}>
                          <i className="fas fa-pen" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost text-xs px-2"
                          onClick={() => {
                            if (confirm(t('admin.confirmDelete'))) void onDelete(row.id)
                          }}
                        >
                          <i className="fas fa-trash text-[var(--color-danger)]" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="p-6 text-center text-[var(--color-text-muted)]">
                  {t('admin.noRows')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
