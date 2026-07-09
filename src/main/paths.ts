import { app } from 'electron'
import { join, dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { is } from '@electron-toolkit/utils'

/** Application root — repo root in dev, install dir in production. */
export function getAppRoot(): string {
  if (is.dev) {
    return process.cwd()
  }
  return dirname(app.getPath('exe'))
}

/** Bundled courses live in courses/ next to the app. */
export function getCoursesPath(): string {
  const candidates = [
    join(getAppRoot(), 'courses'),
    join(process.resourcesPath, 'courses'),
    join(dirname(app.getAppPath()), 'courses')
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
