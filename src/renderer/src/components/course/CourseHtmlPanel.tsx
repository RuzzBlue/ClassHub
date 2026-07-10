import { useEffect, useState } from 'react'
import { loadAssetContent } from '../../lib/utils'

interface Props {
  courseId: string
  path: string
}

export function CourseHtmlPanel({ courseId, path }: Props): React.JSX.Element {
  const [srcDoc, setSrcDoc] = useState<string>('')
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSrcDoc('')
    setError(false)

    loadAssetContent(courseId, path)
      .then((html) => {
        if (!cancelled) setSrcDoc(html)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [courseId, path])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="text-[var(--color-danger)]">Failed to load content.</p>
      </div>
    )
  }

  if (!srcDoc) {
    return (
      <div className="h-full flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-2xl" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-[var(--color-surface)]">
      <iframe
        className="course-html-frame flex-1 w-full min-h-0 border-0"
        srcDoc={srcDoc}
        sandbox=""
        title="Course content"
      />
    </div>
  )
}
