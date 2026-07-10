import { useState, useEffect, type ReactNode } from 'react'
import { useAppStore } from '../stores/app-store'
import { AppHeader } from './AppHeader'
import { LoginModal } from './LoginModal'
import { ProfileModal } from './ProfileModal'

interface AppLayoutProps {
  children: ReactNode
  showImport?: boolean
  search?: string
  onSearchChange?: (value: string) => void
}

export function AppLayout({
  children,
  showImport = true,
  search,
  onSearchChange
}: AppLayoutProps): React.JSX.Element {
  const { courses, loadCourses } = useAppStore()
  const [loginOpen, setLoginOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  return (
    <div className="flex flex-col h-screen">
      <AppHeader
        courses={courses}
        onCoursesChange={loadCourses}
        onLoginClick={() => setLoginOpen(true)}
        onProfileClick={() => setProfileOpen(true)}
        showImport={showImport}
        search={search}
        onSearchChange={onSearchChange}
      />
      {children}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
