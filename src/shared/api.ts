export const API_CHANNELS = {
  FETCH: 'api:fetch',
  SELECT_FOLDER: 'dialog:selectFolder',
  SELECT_FILE: 'dialog:selectFile',
  OPEN_PRESENTER: 'window:openPresenter',
  CLOSE_PRESENTER: 'window:closePresenter',
  GET_APP_PATH: 'app:getPath',
  GET_VERSION: 'app:getVersion'
} as const

export interface ApiRequest {
  method: string
  path: string
  body?: unknown
  params?: Record<string, string>
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
  details?: string[]
}
