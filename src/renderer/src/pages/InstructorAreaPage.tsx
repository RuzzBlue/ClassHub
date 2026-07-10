import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '../components/AppLayout'
import { CollapsibleSidebar } from '../components/layout/CollapsibleSidebar'
import { HubPageHeader } from '../components/layout/HubPageHeader'
import { PlaceholderPanel } from '../components/layout/PlaceholderPanel'
import { useSidebarCollapsed } from '../lib/use-sidebar-collapsed'
import { useAppStore } from '../stores/app-store'

type InstructorSection =
  | 'dashboard'
  | 'courses'
  | 'creator-lab'
  | 'grades'
  | 'attendance'
  | 'assistance'
  | 'settings'

const SECTIONS: InstructorSection[] = [
  'dashboard',
  'courses',
  'creator-lab',
  'grades',
  'attendance',
  'assistance',
  'settings'
]

export function InstructorAreaPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { section: sectionParam } = useParams<{ section?: string }>()
  const { user } = useAppStore()
  const [collapsed, toggleCollapsed] = useSidebarCollapsed('classhub.instructor.sidebar')

  const section = (SECTIONS.includes(sectionParam as InstructorSection)
    ? sectionParam
    : 'dashboard') as InstructorSection

  if (!user) return <Navigate to="/" replace />
  if (user.role !== 'instructor' && user.role !== 'admin') return <Navigate to="/" replace />
  if (!sectionParam || !SECTIONS.includes(sectionParam as InstructorSection)) {
    return <Navigate to="/instructor/dashboard" replace />
  }

  const sidebarItems = [
    { id: 'dashboard', label: t('instructor.dashboard'), icon: 'fa-gauge-high' },
    { id: 'courses', label: t('instructor.courses'), icon: 'fa-book' },
    { id: 'creator-lab', label: t('instructor.creatorLab'), icon: 'fa-flask' },
    { id: 'grades', label: t('instructor.grades'), icon: 'fa-chart-line' },
    { id: 'attendance', label: t('instructor.attendance'), icon: 'fa-clipboard-check' },
    { id: 'assistance', label: t('instructor.assistance'), icon: 'fa-life-ring' },
    { id: 'settings', label: t('instructor.settings'), icon: 'fa-gear' }
  ]

  const activeItem = sidebarItems.find((item) => item.id === section)

  return (
    <AppLayout>
      <div className="flex flex-1 min-h-0">
        <CollapsibleSidebar
          title={t('roles.instructorArea')}
          items={sidebarItems}
          activeId={section}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onSelect={(id) => navigate(`/instructor/${id}`)}
        />
        <main className="flex-1 flex flex-col min-h-0 overflow-auto">
          <HubPageHeader
            areaTitle={t('roles.instructorArea')}
            sectionTitle={activeItem?.label ?? t('instructor.dashboard')}
          />
          <PlaceholderPanel
            title={t('roles.instructorArea')}
            hint={t('roles.instructorAreaHint')}
            icon="fa-chalkboard-teacher"
          />
        </main>
      </div>
    </AppLayout>
  )
}
