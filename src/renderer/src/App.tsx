import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from './stores/app-store'
import { LibraryPage } from './pages/LibraryPage'
import { CoursePage } from './pages/CoursePage'
import { PresenterPage } from './pages/PresenterPage'
import { AdminPage } from './pages/AdminPage'
import { InstructorAreaPage } from './pages/InstructorAreaPage'
import { StudentHubPage } from './pages/StudentHubPage'
import { importCourse } from './lib/course-actions'

function MenuListener(): null {
  const navigate = useNavigate()
  const { loadCourses } = useAppStore()

  useEffect(() => {
    if (!window.classhub?.onMenuAction) return
    return window.classhub.onMenuAction(async (action) => {
      if (action === 'library') navigate('/')
      if (action === 'import') {
        if (await importCourse()) await loadCourses()
      }
      if (action === 'help') {
        window.dispatchEvent(new CustomEvent('classhub:help'))
      }
    })
  }, [navigate, loadCourses])

  return null
}

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
      <MenuListener />
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/instructor" element={<Navigate to="/instructor/dashboard" replace />} />
        <Route path="/instructor/:section" element={<InstructorAreaPage />} />
        <Route path="/student-hub" element={<Navigate to="/student-hub/dashboard" replace />} />
        <Route path="/student-hub/:section" element={<StudentHubPage />} />
        <Route path="/learner-hub/*" element={<Navigate to="/student-hub/dashboard" replace />} />
        <Route path="/course/:courseId" element={<CoursePage />} />
        <Route path="/presenter/:courseId/:lessonId/:sectionId" element={<PresenterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
