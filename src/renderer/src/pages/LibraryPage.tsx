import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/app-store'
import { CourseCard } from '../components/CourseCard'
import { LoginModal } from '../components/LoginModal'
import { ProfileModal } from '../components/ProfileModal'
import { apiFetch, selectFile } from '../lib/api-client'

export function LibraryPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { courses, user, loadCourses } = useAppStore()
  const [search, setSearch] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.author.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  )

  const handleImport = async (): Promise<void> => {
    const zipPath = await selectFile()
    if (!zipPath) return
    setImporting(true)
    const res = await apiFetch({ method: 'POST', path: '/api/courses/import', body: { zipPath } })
    if (res.ok) await loadCourses()
    setImporting(false)
  }

  const handleRemove = async (id: string): Promise<void> => {
    await apiFetch({ method: 'DELETE', path: `/api/courses/${id}` })
    await loadCourses()
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-4 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <div className="flex items-center gap-2">
          <i className="fas fa-graduation-cap text-xl" style={{ color: 'var(--accent)' }} />
          <span className="font-bold text-lg">{t('app.name')}</span>
        </div>
        <nav className="flex gap-1 ml-4">
          <button className="btn btn-ghost text-sm">
            <i className="fas fa-th-large" /> {t('nav.library')}
          </button>
          <button className="btn btn-ghost text-sm" onClick={handleImport} disabled={importing}>
            <i className={`fas ${importing ? 'fa-spinner fa-spin' : 'fa-file-import'}`} /> {t('nav.import')}
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm" />
            <input
              className="input pl-9 py-1.5 text-sm w-64"
              placeholder={t('library.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {user ? (
            <button
              className="btn btn-ghost p-1 rounded-full"
              onClick={() => setProfileOpen(true)}
              title={t('settings.profile')}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: 'var(--accent)' }}
              >
                {user.displayName[0]?.toUpperCase()}
              </div>
            </button>
          ) : (
            <button className="btn btn-primary text-sm" onClick={() => setLoginOpen(true)}>
              <i className="fas fa-sign-in-alt" /> {t('auth.login')}
            </button>
          )}
        </div>
      </header>

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
              <button className="btn btn-primary mt-4" onClick={handleImport}>
                <i className="fas fa-file-import" /> {t('nav.import')}
              </button>
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

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
