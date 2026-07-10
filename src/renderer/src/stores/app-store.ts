import { create } from 'zustand'
import type { AppSettings, CourseCardData, User } from '@shared/types'
import type { CourseManifest, Extra, CourseView } from '@shared/schemas'
import { getOrderedLessons } from '@shared/schemas'
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

import { getDefaultRoleView, getRoleViewsForUser } from '../lib/course-views'

export type CourseContentView =
  | { kind: 'lesson' }
  | { kind: 'student-dashboard' }
  | { kind: 'html'; path: string; menuId: string }
  | { kind: 'links'; extraId: string; path: string }
  | { kind: 'files'; extraId: string; path: string; title: string }

interface CourseState {
  manifest: CourseManifest | null
  progress: ProgressSnapshot | null
  grades: Array<{ lessonId: string; lessonTitle: string; score: number | null; passed: boolean | null }>
  currentLessonId: string | null
  currentSection: string | null
  sidebarOpen: boolean
  activeTab: 'menu' | 'overview'
  contentView: CourseContentView
  selectedMenuId: string | null
  loadCourse: (courseId: string) => Promise<void>
  setCurrentLesson: (lessonId: string) => void
  setCurrentSection: (sectionId: string) => void
  updateProgress: (lessonId: string, updates: Record<string, unknown>) => Promise<void>
  toggleSidebar: () => void
  setActiveTab: (tab: 'menu' | 'overview') => void
  selectRoleView: (view: CourseView) => void
  selectExtra: (extra: Extra) => void
}

export const useCourseStore = create<CourseState>((set, get) => ({
  manifest: null,
  progress: null,
  grades: [],
  currentLessonId: null,
  currentSection: null,
  sidebarOpen: true,
  activeTab: 'menu',
  contentView: { kind: 'lesson' },
  selectedMenuId: null,

  loadCourse: async (courseId) => {
    const [manifestRes, progressRes] = await Promise.all([
      apiFetch<CourseManifest>({ method: 'GET', path: `/api/courses/${courseId}/manifest` }),
      apiFetch<ProgressSnapshot & { grades: CourseState['grades'] }>({
        method: 'GET',
        path: `/api/progress/${courseId}`
      })
    ])
    if (manifestRes.ok && manifestRes.data) {
      const manifest = manifestRes.data
      const lessons = manifest.navigation.modules
        .flatMap((m) => m.units.flatMap((u) => u.lessons))
        .sort((a, b) => a.order - b.order)
      const firstLessonId = lessons[0]?.id ?? null

      set({
        manifest,
        currentLessonId: firstLessonId,
        activeTab: 'menu',
        contentView: { kind: 'lesson' },
        selectedMenuId: null
      })

      const user = useAppStore.getState().user
      const defaultView = getDefaultRoleView(manifest, user)
      if (defaultView) {
        get().selectRoleView(defaultView)
      } else if (firstLessonId) {
        set({ currentLessonId: firstLessonId, contentView: { kind: 'lesson' } })
      }
    }
    if (progressRes.ok && progressRes.data) {
      set({
        progress: progressRes.data,
        grades: progressRes.data.grades || []
      })
    }
  },

  setCurrentLesson: (lessonId) =>
    set({
      currentLessonId: lessonId,
      currentSection: null,
      contentView: { kind: 'lesson' },
      selectedMenuId: null
    }),
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

  setActiveTab: (tab) => {
    const { manifest, progress } = get()
    if (!manifest) {
      set({ activeTab: tab })
      return
    }

    if (tab === 'menu') {
      const user = useAppStore.getState().user
      const defaultView = getDefaultRoleView(manifest, user)
      if (defaultView) {
        get().selectRoleView(defaultView)
      }
      set({ activeTab: 'menu' })
      return
    }

    const lessons = getOrderedLessons(manifest)
    const nextLesson =
      lessons.find((lesson) => {
        const lp = progress?.lessons.find((l) => l.lessonId === lesson.id)
        return !lp || lp.status !== 'completed'
      }) ?? lessons[0]
    if (nextLesson) {
      get().setCurrentLesson(nextLesson.id)
    }
    set({ activeTab: 'overview' })
  },

  selectRoleView: (view) => {
    if (view.render === 'app' && view.appPanel === 'student-dashboard') {
      set({
        contentView: { kind: 'student-dashboard' },
        selectedMenuId: view.id
      })
      return
    }
    set({
      contentView: { kind: 'html', path: view.entry, menuId: view.id },
      selectedMenuId: view.id
    })
  },

  selectExtra: (extra) => {
    if (extra.type === 'html') {
      set({
        contentView: { kind: 'html', path: extra.entry, menuId: extra.id },
        selectedMenuId: extra.id
      })
    } else if (extra.type === 'links') {
      set({
        contentView: { kind: 'links', extraId: extra.id, path: extra.entry },
        selectedMenuId: extra.id
      })
    } else {
      set({
        contentView: { kind: 'files', extraId: extra.id, path: extra.entry, title: extra.title },
        selectedMenuId: extra.id
      })
    }
  }
}))
