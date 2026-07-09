import { join, dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'

function getElectronApp(): import('electron').App | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('electron').app as import('electron').App
  } catch {
    return null
  }
}

function isElectronDev(app: import('electron').App | null): boolean {
  return Boolean(app && !app.isPackaged)
}

/** Application root — repo root in dev / web server, install dir in production Electron. */
export function getAppRoot(): string {
  const electronApp = getElectronApp()
  if (!electronApp || isElectronDev(electronApp)) {
    return process.cwd()
  }
  return dirname(electronApp.getPath('exe'))
}

/** Bundled courses live in courses/ next to the app. */
export function getCoursesPath(): string {
  const electronApp = getElectronApp()
  const candidates = [
    join(getAppRoot(), 'courses'),
    ...(electronApp
      ? [join(process.resourcesPath, 'courses'), join(dirname(electronApp.getAppPath()), 'courses')]
      : [])
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  const primary = join(getAppRoot(), 'courses')
  mkdirSync(primary, { recursive: true })
  return primary
}

/** User progress, settings, and auth data. */
export function getDataRoot(): string {
  const dataPath = join(getAppRoot(), 'data')
  if (!existsSync(dataPath)) mkdirSync(dataPath, { recursive: true })
  return dataPath
}

export function getStagingPath(): string {
  const staging = join(getDataRoot(), 'staging')
  if (!existsSync(staging)) mkdirSync(staging, { recursive: true })
  return staging
}
