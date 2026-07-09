import { dialog, app } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { nanoid } from 'nanoid'
import type { ApiRequest, ApiResponse } from '@shared/api'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { dataStore, hashPassword } from './data-store'
import {
  importBundle,
  removeCourse,
  getManifest,
  listCourses,
  resolveAssetPath,
  syncCourseRegistry
} from './bundle-service'
import {
  getProgressSnapshot,
  updateLessonProgress,
  submitQuiz,
  getGradeSummaries,
  canAccess,
  activateLicense,
  getInstructorNotes
} from './progress-service'
import { validateQuiz } from '@shared/schemas'

let presenterCallback: ((data: unknown) => void) | null = null

export function setPresenterCallback(cb: (data: unknown) => void): void {
  presenterCallback = cb
}

export async function handleApiRequest(req: ApiRequest): Promise<ApiResponse> {
  try {
    const { method, path, body, params } = req

    if (method === 'GET' && path === '/api/settings') {
      return ok(dataStore.getSettings())
    }

    if (method === 'PUT' && path === '/api/settings') {
      const settings = { ...dataStore.getSettings(), ...(body as Partial<AppSettings>) }
      dataStore.saveSettings(settings)
      return ok(settings)
    }

    if (method === 'POST' && path === '/api/auth/login') {
      const { email, password } = body as { email: string; password: string }
      const user = dataStore.authenticate(email, password)
      if (!user) return err('Invalid email or password', 401)
      return ok({ user })
    }

    if (method === 'POST' && path === '/api/auth/logout') {
      dataStore.logout()
      return ok({ loggedOut: true })
    }

    if (method === 'GET' && path === '/api/auth/me') {
      const settings = dataStore.getSettings()
      if (!settings.activeUserId) return ok({ user: null })
      return ok({ user: dataStore.getUser(settings.activeUserId) })
    }

    if (method === 'GET' && path === '/api/courses') {
      syncCourseRegistry()
      const settings = dataStore.getSettings()
      const userId = settings.activeUserId || 'guest'
      return ok(listCourses(userId))
    }

    if (method === 'POST' && path === '/api/courses/import') {
      const { zipPath } = body as { zipPath: string }
      if (!zipPath) return err('zipPath required', 400)
      const result = importBundle(zipPath)
      if (!result.success) return { ok: false, status: 400, error: 'Import failed', details: result.errors }
      return ok(result)
    }

    if (method === 'DELETE' && path.startsWith('/api/courses/')) {
      const courseId = path.split('/').pop()!
      const removed = removeCourse(courseId)
      if (!removed) return err('Course not found', 404)
      return ok({ removed: true })
    }

    if (method === 'GET' && path.match(/^\/api\/courses\/[^/]+\/manifest$/)) {
      const courseId = path.split('/')[3]
      const manifest = getManifest(courseId)
      if (!manifest) return err('Course not found', 404)
      return ok(manifest)
    }

    if (method === 'GET' && path.startsWith('/api/courses/') && path.includes('/asset')) {
      const courseId = path.split('/')[3]
      const assetPath = params?.path
      if (!assetPath) return err('path param required', 400)
      const resolved = resolveAssetPath(courseId, assetPath)
      if (!resolved) return err('Asset not found', 404)
      const content = readFileSync(resolved)
      const ext = resolved.split('.').pop()?.toLowerCase()
      const mimeTypes: Record<string, string> = {
        html: 'text/html',
        json: 'application/json',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        svg: 'image/svg+xml',
        pdf: 'application/pdf',
        css: 'text/css',
        js: 'application/javascript',
        md: 'text/markdown'
      }
      return ok({
        content: content.toString('base64'),
        mimeType: mimeTypes[ext || ''] || 'application/octet-stream',
        path: resolved
      })
    }

    if (method === 'GET' && path.match(/^\/api\/progress\/[^/]+$/)) {
      const courseId = path.split('/').pop()!
      const settings = dataStore.getSettings()
      if (!settings.activeUserId) {
        return ok({ course: null, lessons: [], quizzes: [], grades: [] })
      }
      const userId = settings.activeUserId
      const snapshot = getProgressSnapshot(userId, courseId)
      const grades = getGradeSummaries(userId, courseId)
      return ok({ ...snapshot, grades })
    }

    if (method === 'POST' && path === '/api/progress/lesson') {
      const settings = dataStore.getSettings()
      if (!settings.activeUserId) return err('Login required', 401)
      const userId = settings.activeUserId
      const { courseId, lessonId, ...updates } = body as {
        courseId: string
        lessonId: string
        status?: string
        sectionsViewed?: string[]
        currentSection?: string
      }
      const snapshot = updateLessonProgress(userId, courseId, lessonId, {
        status: updates.status as 'not_started' | 'in_progress' | 'completed' | undefined,
        sectionsViewed: updates.sectionsViewed,
        currentSection: updates.currentSection ?? undefined
      })
      return ok(snapshot)
    }

    if (method === 'POST' && path === '/api/quiz/submit') {
      const settings = dataStore.getSettings()
      if (!settings.activeUserId) return err('Login required', 401)
      const userId = settings.activeUserId
      const { courseId, quizPath, answers } = body as {
        courseId: string
        quizPath: string
        answers: Record<string, string[]>
      }
      const result = submitQuiz(userId, courseId, quizPath, answers)
      return ok(result)
    }

    if (method === 'GET' && path.match(/^\/api\/quiz\/[^/]+$/)) {
      const parts = path.split('/')
      const courseId = parts[3]
      const quizPath = params?.path
      if (!quizPath) return err('path required', 400)
      const resolved = resolveAssetPath(courseId, quizPath)
      if (!resolved) return err('Quiz not found', 404)
      const quiz = validateQuiz(JSON.parse(readFileSync(resolved, 'utf-8')))
      const sanitized = {
        ...quiz,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options.map((_, i) => String.fromCharCode(97 + i))
        }))
      }
      return ok(sanitized)
    }

    if (method === 'GET' && path === '/api/users') {
      return ok(dataStore.getUsers())
    }

    if (method === 'POST' && path === '/api/users') {
      const { displayName, role, switchTo } = body as {
        displayName?: string
        role?: 'learner' | 'instructor'
        switchTo?: string
      }
      if (switchTo) {
        const settings = dataStore.getSettings()
        settings.activeUserId = switchTo
        dataStore.saveSettings(settings)
        return ok(dataStore.getUser(switchTo))
      }
      const user = dataStore.createUser({
        id: nanoid(),
        displayName: displayName || 'User',
        role: role || 'learner',
        avatar: null,
        prefs: {},
        createdAt: new Date().toISOString()
      })
      const settings = dataStore.getSettings()
      settings.activeUserId = user.id
      dataStore.saveSettings(settings)
      return ok(user)
    }

    if (method === 'PUT' && path.startsWith('/api/users/')) {
      const userId = path.split('/').pop()!
      const updates = body as Partial<{ displayName: string; role: string; email: string; password: string }>
      const patch: Record<string, unknown> = { ...updates }
      if (updates.password) {
        patch.passwordHash = hashPassword(updates.password)
        delete patch.password
      }
      const updated = dataStore.updateUser(userId, patch)
      if (!updated) return err('User not found', 404)
      return ok(updated)
    }

    if (method === 'GET' && path.match(/^\/api\/access\/[^/]+$/)) {
      const courseId = path.split('/').pop()!
      const settings = dataStore.getSettings()
      const userId = settings.activeUserId || 'guest'
      const { targetType, targetId, nodeAccess } = params || {}
      const allowed = canAccess(
        userId,
        courseId,
        (targetType as 'module' | 'unit' | 'lesson') || 'lesson',
        targetId || '',
        nodeAccess
      )
      return ok({ allowed })
    }

    if (method === 'POST' && path === '/api/license/activate') {
      const settings = dataStore.getSettings()
      if (!settings.activeUserId) return err('Login required', 401)
      const userId = settings.activeUserId
      const { courseId, key } = body as { courseId: string; key: string }
      const valid = activateLicense(userId, courseId, key)
      return ok({ valid })
    }

    if (method === 'GET' && path.match(/^\/api\/notes\/[^/]+$/)) {
      const parts = path.split('/')
      const courseId = parts[3]
      const lessonId = params?.lessonId || ''
      const notes = getInstructorNotes(courseId, lessonId)
      return ok({ notes })
    }

    if (method === 'POST' && path === '/api/presenter/broadcast') {
      if (presenterCallback) presenterCallback(body)
      return ok({ sent: true })
    }

    return err('Not found', 404)
  } catch (e) {
    return err((e as Error).message, 500)
  }
}

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, status: 200, data }
}

function err(message: string, status: number): ApiResponse {
  return { ok: false, status, error: message }
}

export async function selectFolder(): Promise<string | null> {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
  return result.canceled ? null : result.filePaths[0]
}

export async function selectFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters || [{ name: 'Course Bundle', extensions: ['zip'] }]
  })
  return result.canceled ? null : result.filePaths[0]
}
