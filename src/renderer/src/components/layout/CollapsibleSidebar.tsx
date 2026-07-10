import { useTranslation } from 'react-i18next'

export interface SidebarItem {
  id: string
  label: string
  icon: string
}

interface CollapsibleSidebarProps {
  title: string
  items: SidebarItem[]
  activeId: string
  onSelect: (id: string) => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function CollapsibleSidebar({
  title,
  items,
  activeId,
  onSelect,
  collapsed,
  onToggleCollapsed
}: CollapsibleSidebarProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <aside
      className={`shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div
        className={`sidebar-title-bar flex items-center border-b border-[var(--color-border)] ${
          collapsed ? 'justify-center px-2' : 'justify-between px-3'
        }`}
      >
        {!collapsed && <p className="hub-area-title truncate">{title}</p>}
        <button
          type="button"
          className="btn btn-ghost p-2 text-xs cursor-pointer shrink-0"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          <i className={`fas fa-chevron-${collapsed ? 'right' : 'left'}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-auto p-2 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            title={collapsed ? item.label : undefined}
            className={`w-full rounded-lg text-sm flex items-center cursor-pointer transition-colors ${
              collapsed ? 'justify-center p-2.5' : 'text-left px-3 py-2 gap-2'
            } ${activeId === item.id ? 'bg-[var(--color-surface2)]' : 'hover:bg-[var(--color-surface2)]'}`}
            onClick={() => onSelect(item.id)}
          >
            <i className={`fas ${item.icon} sidebar-nav-icon`} aria-hidden="true" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}
