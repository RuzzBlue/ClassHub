import type { AccessPolicy, CourseManifest } from './schemas'

export interface ThemeSettings {
  accent: string
  mode: 'dark' | 'light'
  sounds: boolean
}

export interface AppSettings {
  dataRoot: string
  coursesPath: string
  locale: 'en' | 'es'
  theme: ThemeSettings
  activeUserId: string | null
  setupComplete: boolean
}

export interface CourseRegistryEntry {
  id: string
  path: string
  installedAt: string
  version: string
}

export interface CourseRegistry {
  courses: CourseRegistryEntry[]
}

export interface User {
  id: string
  displayName: string
  email?: string
  passwordHash?: string
  role: 'learner' | 'instructor'
  avatar: string | null
  prefs: Record<string, unknown>
  createdAt: string
}

export interface LessonProgress {
  userId: string
  courseId: string
  lessonId: string
  status: 'not_started' | 'in_progress' | 'completed'
  sectionsViewed: string[]
  currentSection: string | null
  completedAt: string | null
}

export interface CourseProgress {
  userId: string
  courseId: string
  percent: number
  lastLessonId: string | null
  updatedAt: string
}

export interface QuizResult {
  id: string
  userId: string
  courseId: string
  quizId: string
  score: number
  maxScore: number
  passed: boolean
  answers: Record<string, string[]>
  attemptedAt: string
}

export interface License {
  userId: string
  courseId: string
  keyHash: string
  status: 'valid' | 'invalid' | 'expired'
  expiresAt: string | null
}

export interface CourseCardData {
  id: string
  title: string
  description: string
  author: string
  version: string
  level: string
  language: string
  estimatedHours?: number
  thumbnailUrl: string | null
  coverUrl: string | null
  imagePath: string | null
  tags: string[]
  moduleCount: number
  lessonCount: number
  progress: number
  accessPolicy: string
  installedAt: string
}

export interface ProgressSnapshot {
  course: CourseProgress | null
  lessons: LessonProgress[]
  quizzes: QuizResult[]
}

export interface GradeSummary {
  lessonId: string
  lessonTitle: string
  score: number | null
  maxScore: number
  passed: boolean | null
}

export interface ApiError {
  error: string
  details?: string[]
}

export interface ImportResult {
  success: boolean
  course?: CourseCardData
  errors?: string[]
}

export function resolveAccess(
  manifest: CourseManifest,
  targetType: 'module' | 'unit' | 'lesson',
  targetId: string,
  nodeAccess?: AccessPolicy
): AccessPolicy {
  if (nodeAccess) return nodeAccess
  const ruleKey = `${targetType}:${targetId}`
  const rule = manifest.access.rules.find((r) => r.target === ruleKey)
  if (rule) return rule.policy
  return manifest.access.defaultPolicy
}

export const DEFAULT_SETTINGS: AppSettings = {
  dataRoot: '',
  coursesPath: '',
  locale: 'en',
  theme: { accent: '#6c5ce7', mode: 'dark', sounds: true },
  activeUserId: null,
  setupComplete: true
}

export const DEMO_LICENSE_KEY = 'CLASSHUB-DEMO-2026'
