import type { CourseCardData } from '@shared/types'
import { apiFetch, selectFile, selectSaveFile } from './api-client'

const isElectron = typeof window !== 'undefined' && Boolean(window.classhub)

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function pickZipFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip,application/zip'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}

export async function importCourse(): Promise<boolean> {
  if (isElectron) {
    const zipPath = await selectFile()
    if (!zipPath) return false
    const res = await apiFetch({ method: 'POST', path: '/api/courses/import', body: { zipPath } })
    return res.ok
  }

  const file = await pickZipFile()
  if (!file) return false
  const content = arrayBufferToBase64(await file.arrayBuffer())
  const res = await apiFetch({
    method: 'POST',
    path: '/api/courses/import',
    body: { fileName: file.name, content }
  })
  return res.ok
}

export async function syncCourses(): Promise<CourseCardData[] | null> {
  const res = await apiFetch<{ synced: number; courseIds: string[]; courses: CourseCardData[] }>({
    method: 'POST',
    path: '/api/courses/sync'
  })
  if (!res.ok || !res.data) return null
  return res.data.courses
}

export async function exportCourse(course: CourseCardData): Promise<boolean> {
  if (isElectron) {
    const savePath = await selectSaveFile(`${course.id}.zip`)
    if (!savePath) return false
    const res = await apiFetch({
      method: 'POST',
      path: `/api/courses/${course.id}/export`,
      body: { savePath }
    })
    return res.ok
  }

  const res = await apiFetch<{ fileName: string; content: string }>({
    method: 'POST',
    path: `/api/courses/${course.id}/export`,
    body: {}
  })
  if (!res.ok || !res.data) return false

  const bytes = Uint8Array.from(atob(res.data.content), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = res.data.fileName
  link.click()
  URL.revokeObjectURL(url)
  return true
}
