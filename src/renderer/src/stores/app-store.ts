import { create } from 'zustand'
import type { AppSettings, CourseCardData, User } from '@shared/types'
import type { CourseManifest } from '@shared/schemas'
import type { ProgressSnapshot } from '@shared/types'
import { apiFetch } from '../lib/api-client'
import { applyTheme } from '../lib/utils'

interface AppState {
  settings: AppSettings | null
  user: User | null
  courses: CourseCardData[]
  loading: boolean
  loadSettings: () => Promise<void>
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>
  loadCourses: () => Promise<void>
  loadUser: () => Promise<void>
  logout: () => Promise<void>
  switchRole: (role: 'student' | 'instructor') => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: null,
  user: null,
  courses: [],
  loading: true,

  loadSettings: async () => {
    const res = await apiFetch<AppSettings>({ method: 'GET', path: '/api/settings' })
    if (res.ok && res.data) {
      set({ settings: res.data })
      applyTheme(res.data.theme.accent, res.data.theme.mode)
      if (res.data.locale) {
        const i18n = (await import('../i18n')).default
        i18n.changeLanguage(res.data.locale)
      }
    }
    set({ loading: false })
  },

  updateSettings: async (updates) => {
    const res = await apiFetch<AppSettings>({
      method: 'PUT',
      path: '/api/settings',
      body: { ...get().settings, ...updates }
    })
    if (res.ok && res.data) {
      set({ settings: res.data })
      applyTheme(res.data.theme.accent, res.data.theme.mode)
      if (updates.locale) {
        const i18n = (await import('../i18n')).default
        i18n.changeLanguage(updates.locale)
      }
    }
  },

  loadCourses: async () => {
    const res = await apiFetch<CourseCardData[]>({ method: 'GET', path: '/api/courses' })
    if (res.ok && res.data) set({ courses: res.data })
  },

  loadUser: async () => {
    const res = await apiFetch<{ user: User | null }>({ method: 'GET', path: '/api/auth/me' })
    if (res.ok) set({ user: res.data?.user ?? null })
  },

  logout: async () => {
    await apiFetch({ method: 'POST', path: '/api/auth/logout' })
    set({ user: null })
  },

  switchRole: async (role) => {
    const user = get().user
    if (!user) return
    const res = await apiFetch<User>({
      method: 'PUT',
      path: `/api/users/${user.id}`,
      body: { role }
    })
    if (res.ok && res.data) set({ user: res.data })
  }
}))

interface CourseState {
  manifest: CourseManifest | null
  progress: ProgressSnapshot | null
  grades: Array<{ lessonId: string; lessonTitle: string; score: number | null; passed: boolean | null }>
  currentLessonId: string | null
  currentSection: string | null
  sidebarOpen: boolean
  activeTab: 'nav' | 'dashboard'
  loadCourse: (courseId: string) => Promise<void>
  setCurrentLesson: (lessonId: string) => void
  setCurrentSection: (sectionId: string) => void
  updateProgress: (lessonId: string, updates: Record<string, unknown>) => Promise<void>
  toggleSidebar: () => void
  setActiveTab: (tab: 'nav' | 'dashboard') => void
}

export const useCourseStore = create<CourseState>((set, get) => ({
  manifest: null,
  progress: null,
  grades: [],
  currentLessonId: null,
  currentSection: null,
  sidebarOpen: true,
  activeTab: 'nav',

  loadCourse: async (courseId) => {
    const [manifestRes, progressRes] = await Promise.all([
      apiFetch<CourseManifest>({ method: 'GET', path: `/api/courses/${courseId}/manifest` }),
      apiFetch<ProgressSnapshot & { grades: CourseState['grades'] }>({
        method: 'GET',
        path: `/api/progress/${courseId}`
      })
    ])
    if (manifestRes.ok && manifestRes.data) {
      set({ manifest: manifestRes.data })
      const lessons = manifestRes.data.navigation.modules
        .flatMap((m) => m.units.flatMap((u) => u.lessons))
        .sort((a, b) => a.order - b.order)
      if (lessons.length > 0 && !get().currentLessonId) {
        set({ currentLessonId: lessons[0].id })
      }
    }
    if (progressRes.ok && progressRes.data) {
      set({
        progress: progressRes.data,
        grades: progressRes.data.grades || []
      })
    }
  },

  setCurrentLesson: (lessonId) => set({ currentLessonId: lessonId, currentSection: null }),
  setCurrentSection: (sectionId) => set({ currentSection: sectionId }),

  updateProgress: async (lessonId, updates) => {
    const manifest = get().manifest
    if (!manifest) return
    const res = await apiFetch<ProgressSnapshot>({
      method: 'POST',
      path: '/api/progress/lesson',
      body: { courseId: manifest.id, lessonId, ...updates }
    })
    if (res.ok && res.data) set({ progress: res.data })
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveTab: (tab) => set({ activeTab: tab })
}))
