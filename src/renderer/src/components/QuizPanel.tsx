import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../lib/api-client'
import { useCourseStore } from '../stores/app-store'

interface QuizQuestion {
  id: string
  type: 'single' | 'multiple'
  prompt: string
  options: string[]
}

interface Props {
  courseId: string
  quizPath: string
  lessonId: string
  onClose: () => void
}

export function QuizPanel({ courseId, quizPath, lessonId, onClose }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const { loadCourse } = useCourseStore()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [title, setTitle] = useState('')
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiFetch<{ id: string; title: string; questions: QuizQuestion[] }>({
      method: 'GET',
      path: `/api/quiz/${courseId}`,
      params: { path: quizPath }
    }).then((res) => {
      if (res.ok && res.data) {
        setQuestions(res.data.questions)
        setTitle(res.data.title)
      }
    })
  }, [courseId, quizPath])

  const toggleAnswer = (qId: string, option: string, type: string): void => {
    setAnswers((prev) => {
      if (type === 'single') return { ...prev, [qId]: [option] }
      const current = prev[qId] || []
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option]
      return { ...prev, [qId]: next }
    })
  }

  const handleSubmit = async (): Promise<void> => {
    setLoading(true)
    const res = await apiFetch<{ result: { score: number; passed: boolean } }>({
      method: 'POST',
      path: '/api/quiz/submit',
      body: { courseId, quizPath, answers }
    })
    if (res.ok && res.data) {
      setResult(res.data.result)
      await loadCourse(courseId)
      if (res.data.result.passed) {
        await apiFetch({
          method: 'POST',
          path: '/api/progress/lesson',
          body: { courseId, lessonId, status: 'completed' }
        })
      }
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="card p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">{title || t('course.quiz')}</h3>
          <button className="btn btn-ghost p-2" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        {result ? (
          <div className="text-center py-6">
            <i
              className={`fas ${result.passed ? 'fa-check-circle' : 'fa-times-circle'} text-5xl mb-4`}
              style={{ color: result.passed ? 'var(--color-success)' : 'var(--color-danger)' }}
            />
            <p className="text-2xl font-bold">{result.score}%</p>
            <p className="mt-2">{result.passed ? t('course.quizPassed') : t('course.quizFailed')}</p>
            <button className="btn btn-primary mt-4" onClick={onClose}>
              {t('course.nextSection')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={q.id} className="border-b border-[var(--color-border)] pb-4">
                <p className="font-medium mb-2">
                  {qi + 1}. {q.prompt}
                </p>
                <div className="space-y-1">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--color-surface2)]">
                      <input
                        type={q.type === 'single' ? 'radio' : 'checkbox'}
                        name={q.id}
                        checked={(answers[q.id] || []).includes(opt)}
                        onChange={() => toggleAnswer(q.id, opt, q.type)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn btn-primary w-full justify-center" onClick={handleSubmit} disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin" /> : null}
              {t('course.submitQuiz')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
