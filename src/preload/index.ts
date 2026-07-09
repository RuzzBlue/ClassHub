import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { API_CHANNELS } from '@shared/api'
import type { ApiRequest, ApiResponse } from '@shared/api'

const classhubApi = {
  fetch: <T = unknown>(req: ApiRequest): Promise<ApiResponse<T>> =>
    ipcRenderer.invoke(API_CHANNELS.FETCH, req),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke(API_CHANNELS.SELECT_FOLDER),
  selectFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
    ipcRenderer.invoke(API_CHANNELS.SELECT_FILE, filters),
  selectSaveFile: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke(API_CHANNELS.SELECT_SAVE_FILE, defaultName),
  openPresenter: (courseId: string, lessonId: string, sectionId: string): Promise<void> =>
    ipcRenderer.invoke(API_CHANNELS.OPEN_PRESENTER, { courseId, lessonId, sectionId }),
  closePresenter: (): Promise<void> => ipcRenderer.invoke(API_CHANNELS.CLOSE_PRESENTER),
  getAppPath: (name: string): Promise<string> => ipcRenderer.invoke(API_CHANNELS.GET_APP_PATH, name),
  getVersion: (): Promise<string> => ipcRenderer.invoke(API_CHANNELS.GET_VERSION),
  onMenuAction: (callback: (action: string) => void): (() => void) => {
    const handler = (_: unknown, action: string): void => callback(action)
    ipcRenderer.on('menu:action', handler)
    return () => ipcRenderer.removeListener('menu:action', handler)
  },
  onPresenterUpdate: (callback: (data: unknown) => void): (() => void) => {
    const handler = (_: unknown, data: unknown): void => callback(data)
    ipcRenderer.on('presenter:update', handler)
    return () => ipcRenderer.removeListener('presenter:update', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('classhub', classhubApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error fallback
  window.electron = electronAPI
  // @ts-expect-error fallback
  window.classhub = classhubApi
}
