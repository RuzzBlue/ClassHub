import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { loadAssetContent } from '../lib/utils'
import { useCourseStore } from '../stores/app-store'
import { QuizPanel } from './QuizPanel'

interface Props {
  courseId: string
  courseTitle: string
  lessonEntry: string
  quizPath?: string | null
}

export function LessonViewer({ courseId, courseTitle, lessonEntry, quizPath }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const { currentSection, setCurrentSection, updateProgress, currentLessonId } = useCourseStore()
  const [sections, setSections] = useState<Array<{ id: string; title: string }>>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [htmlContent, setHtmlContent] = useState('')

  useEffect(() => {
    loadAssetContent(courseId, lessonEntry).then((html) => {
      setHtmlContent(html)
    })
  }, [courseId, lessonEntry])

  useEffect(() => {
    if (!containerRef.current || !htmlContent) return
    containerRef.current.innerHTML = htmlContent
    const slideEls = containerRef.current.querySelectorAll('[data-slide]')
    const parsed: Array<{ id: string; title: string }> = []
    slideEls.forEach((el, i) => {
      const id = el.getAttribute('id') || `s${i + 1}`
      const title = el.getAttribute('data-title') || `Slide ${i + 1}`
      el.classList.remove('active')
      parsed.push({ id, title })
    })
    setSections(parsed)
    const startIdx = currentSection ? parsed.findIndex((s) => s.id === currentSection) : 0
    const idx = startIdx >= 0 ? startIdx : 0
    setActiveIndex(idx)
    showSection(idx, slideEls)
  }, [htmlContent])

  const showSection = (index: number, slideEls?: NodeListOf<Element>): void => {
    const els = slideEls || containerRef.current?.querySelectorAll('[data-slide]')
    if (!els) return
    els.forEach((el, i) => {
      el.classList.toggle('active', i === index)
      if (i === index) el.classList.add('slide-enter')
    })
    setActiveIndex(index)
    const section = sections[index]
    if (section) {
      setCurrentSection(section.id)
      if (currentLessonId) {
        updateProgress(currentLessonId, {
          status: 'in_progress',
          currentSection: section.id,
          sectionsViewed: [section.id]
        })
      }
    }
  }

  const goNext = useCallback((): void => {
    if (activeIndex < sections.length - 1) showSection(activeIndex + 1)
    else if (quizPath) setShowQuiz(true)
    else if (currentLessonId) updateProgress(currentLessonId, { status: 'completed' })
  }, [activeIndex, sections.length, quizPath, currentLessonId])

  const goPrev = useCallback((): void => {
    if (activeIndex > 0) showSection(activeIndex - 1)
  }, [activeIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goNext()
      }
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev])

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <div className="flex gap-1 min-w-0">
          {sections.map((s, i) => (
            <button
              key={s.id}
              className="w-2 h-2 rounded-full transition-all shrink-0"
              style={{ background: i === activeIndex ? 'var(--accent)' : 'var(--color-border)' }}
              onClick={() => showSection(i)}
              title={s.title}
            />
          ))}
        </div>
        <h2 className="font-semibold text-center truncate px-4 max-w-md">{courseTitle}</h2>
        <div className="flex gap-2 justify-end min-w-0">
          <button className="btn btn-ghost text-sm" onClick={goPrev} disabled={activeIndex === 0}>
            <i className="fas fa-chevron-left" /> {t('course.prevSection')}
          </button>
          <span className="text-sm text-[var(--color-text-muted)] self-center whitespace-nowrap">
            {activeIndex + 1}/{sections.length}
          </span>
          <button className="btn btn-ghost text-sm" onClick={goNext}>
            {activeIndex < sections.length - 1 ? t('course.nextSection') : quizPath ? t('course.takeQuiz') : t('course.nextSection')}
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div ref={containerRef} className="max-w-4xl mx-auto lesson-content" />
      </div>

      {showQuiz && quizPath && currentLessonId && (
        <QuizPanel
          courseId={courseId}
          quizPath={quizPath}
          lessonId={currentLessonId}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </div>
  )
}
