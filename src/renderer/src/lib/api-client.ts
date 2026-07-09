import type { ApiRequest, ApiResponse } from '@shared/api'

const isElectron = typeof window !== 'undefined' && window.classhub

async function httpFetch<T>(req: ApiRequest): Promise<ApiResponse<T>> {
  const url = new URL(req.path, 'http://localhost:8765')
  if (req.params) {
    Object.entries(req.params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body: req.body ? JSON.stringify(req.body) : undefined
  })
  const payload = await res.json()
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'error' in payload) {
    return { ok: false, status: res.status, error: payload.error, details: payload.details }
  }
  return { ok: res.ok, status: res.status, data: payload as T }
}

export async function apiFetch<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>> {
  if (isElectron) {
    return window.classhub.fetch<T>(req)
  }
  return httpFetch<T>(req)
}

export async function selectFolder(): Promise<string | null> {
  if (isElectron) return window.classhub.selectFolder()
  return null
}

export async function selectFile(): Promise<string | null> {
  if (isElectron) return window.classhub.selectFile([{ name: 'Course Bundle', extensions: ['zip'] }])
  return null
}

export async function selectSaveFile(defaultName: string): Promise<string | null> {
  if (isElectron) return window.classhub.selectSaveFile(defaultName)
  return null
}

export async function openPresenter(courseId: string, lessonId: string, sectionId: string): Promise<void> {
  if (isElectron) return window.classhub.openPresenter(courseId, lessonId, sectionId)
}
