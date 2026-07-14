import { dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import type { ApiRequest, ApiResponse } from '@shared/api'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { handleAdminRequest } from './admin-router'
import { dataStore } from './data-store'
import { getDatabaseUrl } from './db/pool'
import { authenticateUser, getUserById, updateUser } from './db/users'
import { getStagingPath } from './paths'
import {
  importBundle,
  removeCourse,
  getManifest,
  listCourses,
  resolveAssetPath,
  syncCourseRegistry,
  exportCourse,
  exportCourseAsBase64
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
import {
  addLabAttachment,
  getCourseLabs,
  listLabStates,
  localLabUserId,
  readLabHtml,
  removeLabAttachment,
  updateLabStatus
} from './lab-service'
import { validateQuiz } from '@shared/schemas'
import type { LabSubmissionStatus } from '@shared/types'

let presenterCallback: ((data: unknown) => void) | null = null

export function setPresenterCallback(cb: (data: unknown) => void): void {
  presenterCallback = cb
}

export async function handleApiRequest(req: ApiRequest): Promise<ApiResponse> {
  try {
    const { method, path, body, params } = req

    const adminResponse = await handleAdminRequest(req)
    if (adminResponse) return adminResponse

    if (method === 'GET' && path === '/api/settings') {
      return ok(dataStore.getSettings())
    }

    if (method === 'PUT' && path === '/api/settings') {
      const settings = { ...dataStore.getSettings(), ...(body as Partial<AppSettings>) }
      dataStore.saveSettings(settings)
      return ok(settings)
    }

    if (method === 'POST' && path === '/api/auth/login') {
      if (!getDatabaseUrl()) return err('Database not configured. Add DATABASE_URL to .env', 503)
      const { email, password } = body as { email: string; password: string }
      const user = await authenticateUser(email, password)
      if (!user) return err('Invalid email or password', 401)
      const settings = dataStore.getSettings()
      settings.activeUserId = user.id
      dataStore.saveSettings(settings)
      return ok({ user })
    }

    if (method === 'POST' && path === '/api/auth/logout') {
      dataStore.logout()
      return ok({ loggedOut: true })
    }

    if (method === 'GET' && path === '/api/auth/me') {
      const settings = dataStore.getSettings()
      if (!settings.activeUserId) return ok({ user: null })
      if (!getDatabaseUrl()) return ok({ user: null })
      const user = await getUserById(settings.activeUserId)
      return ok({ user })
    }

    if (method === 'GET' && path === '/api/courses') {
      syncCourseRegistry()
      const settings = dataStore.getSettings()
      const userId = settings.activeUserId || 'guest'
      return ok(listCourses(userId))
    }

    if (method === 'POST' && path === '/api/courses/sync') {
      const result = syncCourseRegistry()
      const settings = dataStore.getSettings()
      const userId = settings.activeUserId || 'guest'
      return ok({ ...result, courses: listCourses(userId) })
    }

    if (method === 'POST' && path === '/api/courses/import') {
      const { zipPath, fileName, content } = body as {
        zipPath?: string
        fileName?: string
        content?: string
      }
      let pathToImport = zipPath
      if (!pathToImport && content) {
        pathToImport = join(getStagingPath(), fileName || `import-${Date.now()}.zip`)
        writeFileSync(pathToImport, Buffer.from(content, 'base64'))
      }
      if (!pathToImport) return err('zipPath or content required', 400)
      const result = importBundle(pathToImport)
      if (!result.success) return { ok: false, status: 400, error: 'Import failed', details: result.errors }
      return ok(result)
    }

    if (method === 'POST' && path.match(/^\/api\/courses\/[^/]+\/export$/)) {
      const courseId = path.split('/')[3]
      const { savePath } = body as { savePath?: string }
      if (savePath) {
        const result = exportCourse(courseId, savePath)
        if (!result.success) return err(result.error || 'Export failed', 400)
        return ok({ success: true, path: savePath })
      }
      const exported = exportCourseAsBase64(courseId)
      if (!exported) return err('Course not found', 404)
      return ok(exported)
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

    if (method === 'PUT' && path.startsWith('/api/users/')) {
      if (!getDatabaseUrl()) return err('Database not configured', 503)
      const userId = path.split('/').pop()!
      const settings = dataStore.getSettings()
      if (!settings.activeUserId) return err('Login required', 401)
      if (settings.activeUserId !== userId) {
        const actor = await getUserById(settings.activeUserId)
        if (actor?.role !== 'admin') return err('Forbidden', 403)
      }
      const updates = body as Partial<{ displayName: string; email: string; password: string }>
      const updated = await updateUser(userId, {
        displayName: updates.displayName,
        email: updates.email,
        password: updates.password
      })
      if (!updated) return err('User not found', 404)
      return ok(updated)
    }

    if (method === 'GET' && path.match(/^\/api\/access\/[^/]+$/)) {
      const courseId = path.split('/').pop()!
      const settings = dataStore.getSettings()
      const userId = settings.activeUserId || 'guest'
      const { targetType, targetId, nodeAccess } = params || {}
      const allowed = await canAccess(
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

    if (method === 'GET' && path.match(/^\/api\/labs\/[^/]+$/)) {
      const courseId = path.split('/').pop()!
      const settings = dataStore.getSettings()
      const userId = localLabUserId(settings.activeUserId)
      const labs = getCourseLabs(courseId)
      if (!labs.length) return ok({ title: null, labs: [] })
      const manifest = getManifest(courseId)
      return ok({
        title: manifest?.lab?.title ?? null,
        labs: listLabStates(userId, courseId)
      })
    }

    if (method === 'GET' && path.match(/^\/api\/labs\/[^/]+\/[^/]+$/)) {
      const parts = path.split('/')
      const courseId = parts[3]
      const labId = parts[4]
      const settings = dataStore.getSettings()
      const userId = localLabUserId(settings.activeUserId)
      const lab = getCourseLabs(courseId).find((l) => l.id === labId)
      if (!lab) return err('Lab not found', 404)
      const html = readLabHtml(courseId, lab.entry)
      const states = listLabStates(userId, courseId)
      const state = states.find((s) => s.lab.id === labId)
      return ok({
        lab,
        dueLabel: state?.dueLabel ?? lab.dueAfterLessonId,
        submission: state?.submission ?? null,
        html
      })
    }

    if (method === 'POST' && path.match(/^\/api\/labs\/[^/]+\/[^/]+\/status$/)) {
      const parts = path.split('/')
      const courseId = parts[3]
      const labId = parts[4]
      const settings = dataStore.getSettings()
      const userId = localLabUserId(settings.activeUserId)
      if (!getCourseLabs(courseId).some((l) => l.id === labId)) return err('Lab not found', 404)
      const { status, notes } = body as { status: LabSubmissionStatus; notes?: string }
      const submission = updateLabStatus(userId, courseId, labId, status, notes)
      return ok({ submission })
    }

    if (method === 'POST' && path.match(/^\/api\/labs\/[^/]+\/[^/]+\/attachments$/)) {
      const parts = path.split('/')
      const courseId = parts[3]
      const labId = parts[4]
      const settings = dataStore.getSettings()
      const userId = localLabUserId(settings.activeUserId)
      if (!getCourseLabs(courseId).some((l) => l.id === labId)) return err('Lab not found', 404)
      const { filename, mimeType, contentBase64 } = body as {
        filename: string
        mimeType?: string
        contentBase64: string
      }
      if (!filename || !contentBase64) return err('filename and contentBase64 required', 400)
      const submission = addLabAttachment(
        userId,
        courseId,
        labId,
        filename,
        mimeType || 'application/octet-stream',
        contentBase64
      )
      return ok({ submission })
    }

    if (method === 'DELETE' && path.match(/^\/api\/labs\/[^/]+\/[^/]+\/attachments\/[^/]+$/)) {
      const parts = path.split('/')
      const courseId = parts[3]
      const labId = parts[4]
      const attachmentName = decodeURIComponent(parts[6])
      const settings = dataStore.getSettings()
      const userId = localLabUserId(settings.activeUserId)
      const submission = removeLabAttachment(userId, courseId, labId, attachmentName)
      return ok({ submission })
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

export async function selectSaveFile(defaultName: string): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName.endsWith('.zip') ? defaultName : `${defaultName}.zip`,
    filters: [{ name: 'Course Bundle', extensions: ['zip'] }]
  })
  return result.canceled || !result.filePath ? null : result.filePath
}
