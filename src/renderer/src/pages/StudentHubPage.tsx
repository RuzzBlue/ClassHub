import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '../components/AppLayout'
import { CollapsibleSidebar } from '../components/layout/CollapsibleSidebar'
import { HubPageHeader } from '../components/layout/HubPageHeader'
import { PlaceholderPanel } from '../components/layout/PlaceholderPanel'
import { useSidebarCollapsed } from '../lib/use-sidebar-collapsed'
import { useAppStore } from '../stores/app-store'

type StudentSection = 'dashboard' | 'progress' | 'assistance' | 'grades' | 'chat'

const SECTIONS: StudentSection[] = ['dashboard', 'progress', 'assistance', 'grades', 'chat']

export function StudentHubPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { section: sectionParam } = useParams<{ section?: string }>()
  const { user } = useAppStore()
  const [collapsed, toggleCollapsed] = useSidebarCollapsed('classhub.student.sidebar')

  const section = (SECTIONS.includes(sectionParam as StudentSection)
    ? sectionParam
    : 'dashboard') as StudentSection

  if (!user) return <Navigate to="/" replace />
  if (user.role !== 'student' && user.role !== 'admin') return <Navigate to="/" replace />
  if (!sectionParam || !SECTIONS.includes(sectionParam as StudentSection)) {
    return <Navigate to="/student-hub/dashboard" replace />
  }

  const sidebarItems = [
    { id: 'dashboard', label: t('student.dashboard'), icon: 'fa-gauge-high' },
    { id: 'progress', label: t('student.progress'), icon: 'fa-chart-simple' },
    { id: 'assistance', label: t('student.assistance'), icon: 'fa-life-ring' },
    { id: 'grades', label: t('student.grades'), icon: 'fa-chart-line' },
    { id: 'chat', label: t('student.chat'), icon: 'fa-comments' }
  ]

  const activeItem = sidebarItems.find((item) => item.id === section)

  return (
    <AppLayout>
      <div className="flex flex-1 min-h-0">
        <CollapsibleSidebar
          title={t('roles.studentHub')}
          items={sidebarItems}
          activeId={section}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onSelect={(id) => navigate(`/student-hub/${id}`)}
        />
        <main className="flex-1 flex flex-col min-h-0 overflow-auto">
          <HubPageHeader
            areaTitle={t('roles.studentHub')}
            sectionTitle={activeItem?.label ?? t('student.dashboard')}
          />
          <PlaceholderPanel
            title={t('roles.studentHub')}
            hint={t('roles.studentHubHint')}
            icon="fa-user-graduate"
          />
        </main>
      </div>
    </AppLayout>
  )
}
