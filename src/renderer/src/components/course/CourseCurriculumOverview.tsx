import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { CourseManifest } from '@shared/schemas'
import { findLesson } from '@shared/schemas'
import { cn } from '../../lib/utils'

interface Props {
  manifest: CourseManifest
  currentLessonId: string | null
  accessMap: Record<string, boolean>
  getLessonStatus: (lessonId: string) => string
  onSelectLesson: (lessonId: string) => void
}

export function CourseCurriculumOverview({
  manifest,
  currentLessonId,
  accessMap,
  getLessonStatus,
  onSelectLesson
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const mod of manifest.navigation.modules) {
      initial[mod.id] = mod.order === 1
    }
    return initial
  })
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({})

  const toggleModule = (id: string): void => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleUnit = (id: string): void => {
    setExpandedUnits((prev) => {
      const current = prev[id] ?? true
      return { ...prev, [id]: !current }
    })
  }

  useEffect(() => {
    if (!currentLessonId) return
    const found = findLesson(manifest, currentLessonId)
    if (!found) return
    setExpandedModules((prev) => ({ ...prev, [found.module.id]: true }))
    setExpandedUnits((prev) => ({ ...prev, [found.unit.id]: true }))
  }, [currentLessonId, manifest])

  const statusIcon = (status: string, locked: boolean, isActive: boolean): React.JSX.Element => {
    if (locked) return <i className="fas fa-lock text-xs text-[var(--color-danger)]" />
    if (status === 'completed') return <i className="fas fa-check-circle text-xs text-[var(--color-success)]" />
    if (isActive) return <i className="fas fa-circle text-xs" style={{ color: 'var(--accent)' }} />
    if (status === 'in_progress') return <i className="fas fa-circle-half-stroke text-xs text-[var(--color-warning)]" />
    return <i className="far fa-circle text-xs text-[var(--color-text-muted)]" />
  }

  return (
    <div className="flex-1 overflow-auto p-3">
      <p className="course-sidebar-label px-1 mb-3">{t('course.curriculumModules')}</p>
      <div className="space-y-2">
        {manifest.navigation.modules
          .sort((a, b) => a.order - b.order)
          .map((mod, modIndex) => {
            const modOpen = expandedModules[mod.id] ?? false
            return (
              <div key={mod.id} className="course-curriculum-module">
                <button
                  type="button"
                  className="course-curriculum-module-header"
                  onClick={() => toggleModule(mod.id)}
                >
                  <div className="course-curriculum-module-icon">
                    <i className="fas fa-layer-group" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="course-curriculum-module-tag">
                      {t('course.moduleN', { n: modIndex + 1 })}
                    </div>
                    <div className="font-semibold text-sm truncate">{mod.title}</div>
                  </div>
                  <i className={`fas fa-chevron-${modOpen ? 'down' : 'right'} text-xs text-[var(--color-text-muted)]`} />
                </button>

                {modOpen && (
                  <div className="course-curriculum-module-body">
                    {mod.units
                      .sort((a, b) => a.order - b.order)
                      .map((unit) => {
                        const unitOpen = expandedUnits[unit.id] ?? true
                        return (
                          <div key={unit.id} className="mb-2 last:mb-0">
                            <button
                              type="button"
                              className="course-curriculum-unit-header"
                              onClick={() => toggleUnit(unit.id)}
                            >
                              <span className="text-xs font-medium truncate">{unit.title}</span>
                              <i
                                className={`fas fa-chevron-${unitOpen ? 'down' : 'right'} text-[10px] text-[var(--color-text-muted)]`}
                              />
                            </button>
                            {unitOpen &&
                              unit.lessons
                                .sort((a, b) => a.order - b.order)
                                .map((lesson) => {
                                  const locked = !accessMap[lesson.id]
                                  const status = getLessonStatus(lesson.id)
                                  const isActive = currentLessonId === lesson.id
                                  return (
                                    <button
                                      key={lesson.id}
                                      type="button"
                                      disabled={locked}
                                      className={cn(
                                        'course-curriculum-lesson',
                                        isActive && 'course-curriculum-lesson-active',
                                        locked && 'opacity-50 cursor-not-allowed'
                                      )}
                                      onClick={() => !locked && onSelectLesson(lesson.id)}
                                    >
                                      {statusIcon(status, locked, isActive)}
                                      <span className="truncate flex-1 text-left">{lesson.title}</span>
                                      {lesson.quiz && (
                                        <span className="course-curriculum-quiz-badge">
                                          <i className="fas fa-question text-[10px]" />
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
