import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../lib/api-client'

export function PresenterPage(): React.JSX.Element {
  const { courseId, lessonId, sectionId } = useParams<{
    courseId: string
    lessonId: string
    sectionId: string
  }>()
  const { t } = useTranslation()
  const [notes, setNotes] = useState('')
  const [currentSection, setCurrentSection] = useState(sectionId || '')

  useEffect(() => {
    if (!courseId || !lessonId) return
    apiFetch<{ notes: string }>({
      method: 'GET',
      path: `/api/notes/${courseId}`,
      params: { lessonId }
    }).then((res) => {
      if (res.ok && res.data) setNotes(res.data.notes)
    })
  }, [courseId, lessonId])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.classhub) {
      return window.classhub.onPresenterUpdate((data: unknown) => {
        const d = data as { sectionId?: string }
        if (d.sectionId) setCurrentSection(d.sectionId)
      })
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      <header className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <h1 className="text-lg font-bold">
          <i className="fas fa-chalkboard-teacher mr-2" style={{ color: 'var(--accent)' }} />
          {t('presenter.title')}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t('presenter.currentSlide')}: {currentSection}
        </p>
      </header>
      <div className="flex-1 overflow-auto p-6 grid grid-cols-2 gap-6">
        <div className="card p-4">
          <h3 className="font-semibold mb-3">{t('presenter.notes')}</h3>
          <div className="prose text-sm whitespace-pre-wrap text-[var(--color-text-muted)]">
            {notes || 'No notes available for this lesson.'}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-3">{t('presenter.nextSlide')}</h3>
          <p className="text-sm text-[var(--color-text-muted)]">Preview coming in next update.</p>
          <div className="mt-6 p-3 rounded bg-[var(--color-surface2)] text-sm opacity-50">
            <i className="fas fa-broadcast-tower mr-2" />
            {t('presenter.followMode')}
          </div>
        </div>
      </div>
    </div>
  )
}
