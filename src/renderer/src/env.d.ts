import type { ApiRequest, ApiResponse } from '@shared/api'

declare global {
  interface Window {
    classhub: {
      fetch: <T = unknown>(req: ApiRequest) => Promise<ApiResponse<T>>
      selectFolder: () => Promise<string | null>
      selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>
      selectSaveFile: (defaultName: string) => Promise<string | null>
      openPresenter: (courseId: string, lessonId: string, sectionId: string) => Promise<void>
      closePresenter: () => Promise<void>
      getAppPath: (name: string) => Promise<string>
      getVersion: () => Promise<string>
      onMenuAction: (callback: (action: string) => void) => () => void
      onPresenterUpdate: (callback: (data: unknown) => void) => () => void
    }
    electron: {
      ipcRenderer: unknown
    }
  }
}

export {}
