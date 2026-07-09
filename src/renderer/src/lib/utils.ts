import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function applyTheme(accent: string, mode: 'dark' | 'light'): void {
  const root = document.documentElement
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-hover', adjustColor(accent, -20))
  root.dataset.theme = mode
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export async function loadAssetContent(courseId: string, path: string): Promise<string> {
  const res = await import('./api-client').then((m) =>
    m.apiFetch<{ content: string; mimeType: string }>({
      method: 'GET',
      path: `/api/courses/${courseId}/asset`,
      params: { path }
    })
  )
  if (!res.ok || !res.data) throw new Error('Failed to load asset')
  return atob(res.data.content)
}

export async function getAssetBlobUrl(courseId: string, path: string): Promise<string> {
  const res = await import('./api-client').then((m) =>
    m.apiFetch<{ content: string; mimeType: string }>({
      method: 'GET',
      path: `/api/courses/${courseId}/asset`,
      params: { path }
    })
  )
  if (!res.ok || !res.data) throw new Error('Failed to load asset')
  const binary = atob(res.data.content)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: res.data.mimeType })
  return URL.createObjectURL(blob)
}
