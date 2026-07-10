import { protocol } from 'electron'

// Must run before app.ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'classhub',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

import './env'
import { app, shell, BrowserWindow, ipcMain, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { handleApiRequest, selectFile, selectSaveFile, setPresenterCallback } from './api-router'
import { dataStore } from './data-store'
import { initDatabase } from './db/migrate'
import { syncCourseRegistry } from './bundle-service'
import { resolveAssetPath } from './bundle-service'
import { buildAppMenu } from './menu'
import type { ApiRequest } from '@shared/api'
import { API_CHANNELS } from '@shared/api'

let mainWindow: BrowserWindow | null = null
let presenterWindow: BrowserWindow | null = null

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'ClassHub',
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createPresenterWindow(courseId: string, lessonId: string, sectionId: string): void {
  if (presenterWindow) {
    presenterWindow.focus()
    presenterWindow.webContents.send('presenter:update', { courseId, lessonId, sectionId })
    return
  }
  presenterWindow = new BrowserWindow({
    width: 900,
    height: 700,
    title: 'ClassHub — Presenter Mode',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  const url = is.dev
    ? `${process.env['ELECTRON_RENDERER_URL']}#/presenter/${courseId}/${lessonId}/${sectionId}`
    : `file://${join(__dirname, '../renderer/index.html')}#/presenter/${courseId}/${lessonId}/${sectionId}`
  presenterWindow.loadURL(url)
  presenterWindow.on('closed', () => {
    presenterWindow = null
  })
}

function registerProtocol(): void {
  protocol.handle('classhub', async (request) => {
    const url = new URL(request.url)
    if (url.hostname === 'course') {
      const pathParts = url.pathname.split('/').filter(Boolean)
      const courseId = pathParts[0]
      const assetPath = pathParts.slice(1).join('/')
      if (courseId && assetPath) {
        const resolved = resolveAssetPath(courseId, decodeURIComponent(assetPath))
        if (resolved) {
          return net.fetch(pathToFileURL(resolved).toString())
        }
      }
    }
    return new Response('Not found', { status: 404 })
  })
}

function initDataStore(): void {
  dataStore.init()
  syncCourseRegistry()
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.classhub.app')
  await initDatabase()
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerProtocol()
  initDataStore()

  ipcMain.handle(API_CHANNELS.FETCH, async (_, req: ApiRequest) => {
    return handleApiRequest(req)
  })

  ipcMain.handle(API_CHANNELS.SELECT_FILE, async (_, filters) => selectFile(filters))

  ipcMain.handle(API_CHANNELS.SELECT_SAVE_FILE, async (_, defaultName: string) => selectSaveFile(defaultName))

  ipcMain.handle(API_CHANNELS.OPEN_PRESENTER, (_, { courseId, lessonId, sectionId }) => {
    createPresenterWindow(courseId, lessonId, sectionId)
  })

  ipcMain.handle(API_CHANNELS.CLOSE_PRESENTER, () => {
    presenterWindow?.close()
    presenterWindow = null
  })

  ipcMain.handle(API_CHANNELS.GET_APP_PATH, (_, name: string) => app.getPath(name as 'documents'))

  setPresenterCallback((data) => {
    presenterWindow?.webContents.send('presenter:update', data)
  })

  createMainWindow()
  buildAppMenu(mainWindow!)

  ipcMain.handle(API_CHANNELS.GET_VERSION, () => app.getVersion())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

export { mainWindow }
