import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/app-store'
import { CourseCard } from '../components/CourseCard'
import { HelpModal } from '../components/HelpModal'
import { AppLayout } from '../components/AppLayout'
import { apiFetch } from '../lib/api-client'

export function LibraryPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { courses, loadCourses } = useAppStore()
  const [search, setSearch] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    const openHelp = (): void => setHelpOpen(true)
    window.addEventListener('classhub:help', openHelp)
    return () => window.removeEventListener('classhub:help', openHelp)
  }, [])

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.author.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  )

  const handleRemove = async (id: string): Promise<void> => {
    await apiFetch({ method: 'DELETE', path: `/api/courses/${id}` })
    await loadCourses()
  }

  return (
    <>
      <AppLayout search={search} onSearchChange={setSearch}>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">{t('library.title')}</h1>
              <p className="text-[var(--color-text-muted)]">{t('app.tagline')}</p>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <i className="fas fa-book-open text-5xl text-[var(--color-text-muted)] mb-4" />
                <p className="text-lg">{t('library.noCourses')}</p>
                <p className="text-[var(--color-text-muted)]">{t('library.importFirst')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onOpen={() => navigate(`/course/${course.id}`)}
                    onRemove={() => handleRemove(course.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </AppLayout>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
