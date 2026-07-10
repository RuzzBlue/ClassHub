interface HubPageHeaderProps {
  areaTitle: string
  sectionTitle: string
}

export function HubPageHeader({ areaTitle, sectionTitle }: HubPageHeaderProps): React.JSX.Element {
  return (
    <div className="hub-content-header border-b border-[var(--color-border)]">
      <p className="hub-area-title">{areaTitle}</p>
      <h1 className="hub-section-title">{sectionTitle}</h1>
    </div>
  )
}
