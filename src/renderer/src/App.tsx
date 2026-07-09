import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './stores/app-store'
import { LibraryPage } from './pages/LibraryPage'
import { CoursePage } from './pages/CoursePage'
import { PresenterPage } from './pages/PresenterPage'

export default function App(): React.JSX.Element {
  const { loading, loadSettings, loadUser } = useAppStore()

  useEffect(() => {
    loadSettings().then(() => loadUser())
  }, [loadSettings, loadUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <i className="fas fa-spinner fa-spin text-3xl" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/course/:courseId" element={<CoursePage />} />
        <Route path="/presenter/:courseId/:lessonId/:sectionId" element={<PresenterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
