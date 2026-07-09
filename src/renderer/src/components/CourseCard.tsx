import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { CourseCardData } from '@shared/types'
import { cn } from '../lib/utils'

interface Props {
  course: CourseCardData
  onOpen: () => void
  onRemove: () => void
}

export function CourseCard({ course, onOpen, onRemove }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [flipped, setFlipped] = useState(false)

  return (
    <motion.div
      className="relative h-80 cursor-pointer perspective-1000"
      whileHover={{ scale: 1.02 }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className={cn(
          'card h-full transition-transform duration-500 preserve-3d',
          flipped && 'rotate-y-180'
        )}
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : '' }}
      >
        {/* Front */}
        <div className="absolute inset-0 p-0 overflow-hidden rounded-xl" style={{ backfaceVisibility: 'hidden' }}>
          <div className="h-40 bg-[var(--color-surface2)] relative overflow-hidden">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <i className="fas fa-book-open text-4xl text-[var(--color-text-muted)]" />
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/50 text-white">
                {t(`levels.${course.level}`)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/50 text-white">
                {course.accessPolicy === 'free' ? t('library.free') : t('library.licensed')}
              </span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg truncate">{course.title}</h3>
            <p className="text-sm text-[var(--color-text-muted)]">{course.author}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-[var(--color-surface2)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${course.progress}%`, background: 'var(--accent)' }}
                />
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{course.progress}%</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              {course.moduleCount} {t('library.modules')} · {course.lessonCount} {t('library.lessons')}
            </p>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 p-4 flex flex-col rounded-xl bg-[var(--color-surface)]"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <h3 className="font-semibold mb-2">{course.title}</h3>
          <p className="text-sm text-[var(--color-text-muted)] flex-1 overflow-auto">{course.description}</p>
          <div className="flex flex-wrap gap-1 my-2">
            {course.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface2)]">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            v{course.version}
            {course.estimatedHours ? ` · ${course.estimatedHours} ${t('library.hours')}` : ''}
          </p>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-primary flex-1 justify-center" onClick={onOpen}>
              <i className="fas fa-play" /> {t('library.open')}
            </button>
            <button className="btn btn-ghost" onClick={onRemove}>
              <i className="fas fa-trash" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
