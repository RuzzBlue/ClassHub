import { nanoid } from 'nanoid'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  getOrderedLessons,
  validateQuiz,
  findLesson,
  type CourseManifest
} from '@shared/schemas'
import { dataStore } from './data-store'
import { getUserById } from './db/users'
import { getManifest, resolveAssetPath } from './bundle-service'
import type {
  CourseProgress,
  LessonProgress,
  ProgressSnapshot,
  QuizResult,
  GradeSummary
} from '@shared/types'
import { resolveAccess, DEMO_LICENSE_KEY } from '@shared/types'
import { createHash } from 'crypto'

export function getProgressSnapshot(userId: string, courseId: string): ProgressSnapshot {
  return {
    course: dataStore.getCourseProgress(userId, courseId),
    lessons: dataStore.getAllLessonProgress(userId, courseId),
    quizzes: dataStore.getQuizResults(userId, courseId)
  }
}

export function updateLessonProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  updates: Partial<LessonProgress>
): ProgressSnapshot {
  const existing =
    dataStore.getAllLessonProgress(userId, courseId).find((l) => l.lessonId === lessonId) ?? {
      userId,
      courseId,
      lessonId,
      status: 'not_started' as const,
      sectionsViewed: [],
      currentSection: null,
      completedAt: null
    }
  const merged: LessonProgress = { ...existing, ...updates, userId, courseId, lessonId }
  if (updates.sectionsViewed) {
    const viewed = new Set([...existing.sectionsViewed, ...updates.sectionsViewed])
    merged.sectionsViewed = Array.from(viewed)
  }
  if (merged.status === 'completed' && !merged.completedAt) {
    merged.completedAt = new Date().toISOString()
  }
  dataStore.upsertLessonProgress(merged)
  recalculateCourseProgress(userId, courseId)
  return getProgressSnapshot(userId, courseId)
}

function recalculateCourseProgress(userId: string, courseId: string): void {
  const manifest = getManifest(courseId)
  if (!manifest) return
  const allLessons = getOrderedLessons(manifest)
  const lessonProgress = dataStore.getAllLessonProgress(userId, courseId)
  const completed = lessonProgress.filter((l) => l.status === 'completed').length
  const percent = allLessons.length > 0 ? Math.round((completed / allLessons.length) * 100) : 0
  const lastCompleted = lessonProgress
    .filter((l) => l.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
  const progress: CourseProgress = {
    userId,
    courseId,
    percent,
    lastLessonId: lastCompleted?.lessonId ?? null,
    updatedAt: new Date().toISOString()
  }
  dataStore.upsertCourseProgress(progress)
}

export function submitQuiz(
  userId: string,
  courseId: string,
  quizPath: string,
  answers: Record<string, string[]>
): { result: QuizResult; snapshot: ProgressSnapshot } {
  const fullPath = resolveAssetPath(courseId, quizPath)
  if (!fullPath) throw new Error('Quiz not found')
  const quiz = validateQuiz(JSON.parse(readFileSync(fullPath, 'utf-8')))
  let score = 0
  const maxScore = quiz.questions.length
  for (const q of quiz.questions) {
    const userAnswer = answers[q.id] ?? []
    const correct = [...q.correct].sort().join(',')
    const given = [...userAnswer].sort().join(',')
    if (correct === given) score++
  }
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const result: QuizResult = {
    id: nanoid(),
    userId,
    courseId,
    quizId: quiz.id,
    score: percent,
    maxScore: 100,
    passed: percent >= quiz.passingScore,
    answers,
    attemptedAt: new Date().toISOString()
  }
  dataStore.saveQuizResult(result)
  return { result, snapshot: getProgressSnapshot(userId, courseId) }
}

export function getGradeSummaries(userId: string, courseId: string): GradeSummary[] {
  const manifest = getManifest(courseId)
  if (!manifest) return []
  const quizResults = dataStore.getQuizResults(userId, courseId)
  const summaries: GradeSummary[] = []
  for (const mod of manifest.navigation.modules) {
    for (const unit of mod.units) {
      for (const lesson of unit.lessons) {
        if (lesson.quiz) {
          const quizPath = lesson.quiz
          let quizId = ''
          try {
            const fullPath = resolveAssetPath(courseId, quizPath)
            if (fullPath) quizId = validateQuiz(JSON.parse(readFileSync(fullPath, 'utf-8'))).id
          } catch {
            /* skip */
          }
          const result = quizResults.find((r) => r.quizId === quizId)
          summaries.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            score: result?.score ?? null,
            maxScore: 100,
            passed: result ? result.passed : null
          })
        }
      }
    }
  }
  return summaries
}

export async function canAccess(
  userId: string,
  courseId: string,
  targetType: 'module' | 'unit' | 'lesson',
  targetId: string,
  nodeAccess?: string
): Promise<boolean> {
  const manifest = getManifest(courseId)
  if (!manifest) return false
  const user = await getUserById(userId)
  if (!user) return false
  if (user.role === 'instructor' || user.role === 'admin') return true
  const policy = resolveAccess(manifest, targetType, targetId, nodeAccess as 'free' | 'licensed' | 'instructor' | undefined)
  if (policy === 'free') return true
  if (policy === 'instructor') return user.role === 'instructor' || user.role === 'admin'
  if (policy === 'licensed') {
    const license = dataStore.getLicense(userId, courseId)
    return license?.status === 'valid'
  }
  return false
}

export function activateLicense(userId: string, courseId: string, key: string): boolean {
  const manifest = getManifest(courseId)
  if (!manifest) return false
  const validKey = manifest.demoLicenseKey ?? DEMO_LICENSE_KEY
  if (key.trim().toUpperCase() !== validKey.toUpperCase()) return false
  const keyHash = createHash('sha256').update(key).digest('hex')
  dataStore.saveLicense({
    userId,
    courseId,
    keyHash,
    status: 'valid',
    expiresAt: null
  })
  return true
}

export function getInstructorNotes(courseId: string, lessonId: string): string {
  const manifest = getManifest(courseId)
  if (!manifest?.instructor?.notesRoot) return ''
  const notesPath = join(manifest.instructor.notesRoot, `${lessonId}.md`)
  const fullPath = resolveAssetPath(courseId, notesPath)
  if (!fullPath) return ''
  try {
    return readFileSync(fullPath, 'utf-8')
  } catch {
    return ''
  }
}

export function getLessonInfo(manifest: CourseManifest, lessonId: string) {
  return findLesson(manifest, lessonId)
}
