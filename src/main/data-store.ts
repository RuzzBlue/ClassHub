import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { createHash } from 'crypto'
import type {
  AppSettings,
  CourseProgress,
  LessonProgress,
  License,
  QuizResult,
  User
} from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { getCoursesPath, getDataRoot } from './paths'

interface ProgressData {
  users: User[]
  courseProgress: CourseProgress[]
  lessonProgress: LessonProgress[]
  quizResults: QuizResult[]
  licenses: License[]
}

const EMPTY_PROGRESS: ProgressData = {
  users: [],
  courseProgress: [],
  lessonProgress: [],
  quizResults: [],
  licenses: []
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export class DataStore {
  private dataRoot = ''
  private settingsPath = ''
  private progressPath = ''
  private progress: ProgressData = { ...EMPTY_PROGRESS }
  private initialized = false

  init(): void {
    if (this.initialized) return
    this.dataRoot = getDataRoot()
    this.settingsPath = join(this.dataRoot, 'settings.json')
    this.progressPath = join(this.dataRoot, 'progress.json')
    getCoursesPath()
    this.loadProgress()
    this.seedDefaultUser()
    this.ensureSettings()
    this.initialized = true
  }

  private ensureSettings(): void {
    const coursesPath = getCoursesPath()
    const existing = this.getSettings()
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...existing,
      dataRoot: this.dataRoot,
      coursesPath,
      setupComplete: true
    }
    this.saveSettings(settings)
  }

  private loadProgress(): void {
    if (!existsSync(this.progressPath)) {
      this.progress = { ...EMPTY_PROGRESS }
      this.saveProgress()
      return
    }
    try {
      this.progress = { ...EMPTY_PROGRESS, ...JSON.parse(readFileSync(this.progressPath, 'utf-8')) }
    } catch {
      this.progress = { ...EMPTY_PROGRESS }
    }
  }

  private saveProgress(): void {
    writeFileSync(this.progressPath, JSON.stringify(this.progress, null, 2))
  }

  private seedDefaultUser(): void {
    const demo = this.progress.users.find((u) => u.id === 'user-demo')
    if (!demo) {
      this.createUser({
        id: 'user-demo',
        displayName: 'Demo Learner',
        email: 'demo@classhub.local',
        passwordHash: hashPassword('demo123'),
        role: 'learner',
        avatar: null,
        prefs: {},
        createdAt: new Date().toISOString()
      })
    } else if (!demo.email) {
      demo.email = 'demo@classhub.local'
      if (!demo.passwordHash) demo.passwordHash = hashPassword('demo123')
      this.saveProgress()
    }
  }

  getSettings(): AppSettings {
    if (!existsSync(this.settingsPath)) {
      return {
        ...DEFAULT_SETTINGS,
        dataRoot: this.dataRoot,
        coursesPath: getCoursesPath(),
        setupComplete: true
      }
    }
    try {
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(readFileSync(this.settingsPath, 'utf-8')),
        setupComplete: true
      }
    } catch {
      return { ...DEFAULT_SETTINGS, setupComplete: true }
    }
  }

  saveSettings(settings: AppSettings): void {
    writeFileSync(this.settingsPath, JSON.stringify({ ...settings, setupComplete: true }, null, 2))
  }

  getRegistry(): { courses: Array<{ id: string; path: string; installedAt: string; version: string }> } {
    const path = join(this.dataRoot, 'registry.json')
    if (!existsSync(path)) return { courses: [] }
    try {
      return JSON.parse(readFileSync(path, 'utf-8'))
    } catch {
      return { courses: [] }
    }
  }

  saveRegistry(registry: { courses: Array<{ id: string; path: string; installedAt: string; version: string }> }): void {
    writeFileSync(join(this.dataRoot, 'registry.json'), JSON.stringify(registry, null, 2))
  }

  getUsers(): User[] {
    return this.progress.users.map((u) => ({ ...u, passwordHash: undefined })) as User[]
  }

  getUser(id: string): User | null {
    const user = this.progress.users.find((u) => u.id === id)
    if (!user) return null
    const { passwordHash: _, ...safe } = user
    return safe as User
  }

  getUserByEmail(email: string): (User & { passwordHash?: string }) | null {
    return this.progress.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
  }

  createUser(user: User & { passwordHash?: string }): User {
    const idx = this.progress.users.findIndex((u) => u.id === user.id)
    if (idx >= 0) this.progress.users[idx] = user
    else this.progress.users.push(user)
    this.saveProgress()
    const { passwordHash: _, ...safe } = user
    return safe as User
  }

  updateUser(id: string, updates: Partial<User & { passwordHash?: string }>): User | null {
    const user = this.progress.users.find((u) => u.id === id)
    if (!user) return null
    const updated = { ...user, ...updates, id }
    if (!updates.email?.trim()) {
      updated.email = user.email
    }
    this.createUser(updated)
    return this.getUser(id)
  }

  authenticate(email: string, password: string): User | null {
    const user = this.getUserByEmail(email)
    if (!user?.passwordHash) return null
    if (user.passwordHash !== hashPassword(password)) return null
    const settings = this.getSettings()
    settings.activeUserId = user.id
    this.saveSettings(settings)
    const { passwordHash: _, ...safe } = user
    return safe as User
  }

  logout(): void {
    const settings = this.getSettings()
    settings.activeUserId = null
    this.saveSettings(settings)
  }

  getCourseProgress(userId: string, courseId: string): CourseProgress | null {
    return this.progress.courseProgress.find((p) => p.userId === userId && p.courseId === courseId) ?? null
  }

  getAllLessonProgress(userId: string, courseId: string): LessonProgress[] {
    return this.progress.lessonProgress.filter((p) => p.userId === userId && p.courseId === courseId)
  }

  upsertLessonProgress(progress: LessonProgress): void {
    const idx = this.progress.lessonProgress.findIndex(
      (p) => p.userId === progress.userId && p.courseId === progress.courseId && p.lessonId === progress.lessonId
    )
    if (idx >= 0) this.progress.lessonProgress[idx] = progress
    else this.progress.lessonProgress.push(progress)
    this.saveProgress()
  }

  upsertCourseProgress(progress: CourseProgress): void {
    const idx = this.progress.courseProgress.findIndex(
      (p) => p.userId === progress.userId && p.courseId === progress.courseId
    )
    if (idx >= 0) this.progress.courseProgress[idx] = progress
    else this.progress.courseProgress.push(progress)
    this.saveProgress()
  }

  saveQuizResult(result: QuizResult): void {
    const idx = this.progress.quizResults.findIndex((r) => r.id === result.id)
    if (idx >= 0) this.progress.quizResults[idx] = result
    else this.progress.quizResults.push(result)
    this.saveProgress()
  }

  getQuizResults(userId: string, courseId: string): QuizResult[] {
    return this.progress.quizResults
      .filter((r) => r.userId === userId && r.courseId === courseId)
      .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
  }

  getLicense(userId: string, courseId: string): License | null {
    return this.progress.licenses.find((l) => l.userId === userId && l.courseId === courseId) ?? null
  }

  saveLicense(license: License): void {
    const idx = this.progress.licenses.findIndex(
      (l) => l.userId === license.userId && l.courseId === license.courseId
    )
    if (idx >= 0) this.progress.licenses[idx] = license
    else this.progress.licenses.push(license)
    this.saveProgress()
  }

  getDataRoot(): string {
    return this.dataRoot
  }
}

export const dataStore = new DataStore()
