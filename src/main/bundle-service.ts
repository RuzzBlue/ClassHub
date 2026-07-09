import { join, resolve, normalize } from 'path'
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync, renameSync, statSync } from 'fs'
import AdmZip from 'adm-zip'
import {
  validateCourseManifest,
  collectAllIds,
  countLessons,
  countModules,
  type CourseManifest
} from '@shared/schemas'
import { dataStore } from './data-store'
import { getCoursesPath, getStagingPath } from './paths'
import type { CourseCardData, ImportResult } from '@shared/types'

function collectReferencedFiles(manifest: CourseManifest): string[] {
  const files: string[] = []
  if (manifest.thumbnail) files.push(manifest.thumbnail)
  if (manifest.cover) files.push(manifest.cover)
  for (const mod of manifest.navigation.modules) {
    if (mod.quiz) files.push(mod.quiz)
    for (const unit of mod.units) {
      if (unit.quiz) files.push(unit.quiz)
      for (const lesson of unit.lessons) {
        files.push(lesson.entry)
        if (lesson.quiz) files.push(lesson.quiz)
      }
    }
  }
  for (const extra of manifest.extras) {
    files.push(extra.entry)
  }
  if (manifest.instructor?.dashboard) files.push(manifest.instructor.dashboard)
  return files
}

export function validateBundle(bundlePath: string): { valid: boolean; manifest?: CourseManifest; errors: string[] } {
  const errors: string[] = []
  const manifestPath = join(bundlePath, 'course.json')
  if (!existsSync(manifestPath)) {
    return { valid: false, errors: ['Missing course.json at bundle root'] }
  }
  let manifest: CourseManifest
  try {
    const raw = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    manifest = validateCourseManifest(raw)
  } catch (e) {
    return { valid: false, errors: [`Invalid course.json: ${(e as Error).message}`] }
  }
  const ids = collectAllIds(manifest)
  const uniqueIds = new Set(ids)
  if (uniqueIds.size !== ids.length) {
    errors.push('Duplicate IDs found in course manifest')
  }
  if (manifest.schemaVersion !== '1.0') {
    errors.push(`Unsupported schema version: ${manifest.schemaVersion}`)
  }
  for (const file of collectReferencedFiles(manifest)) {
    const filePath = join(bundlePath, file)
    if (!existsSync(filePath)) {
      errors.push(`Referenced file not found: ${file}`)
    }
  }
  return { valid: errors.length === 0, manifest, errors }
}

/** Scan courses/ folder and sync registry with any bundle containing course.json. */
export function syncCourseRegistry(): void {
  const coursesPath = getCoursesPath()
  if (!existsSync(coursesPath)) {
    mkdirSync(coursesPath, { recursive: true })
    return
  }
  const registry = dataStore.getRegistry()
  const found = new Map<string, { id: string; path: string; installedAt: string; version: string }>()

  for (const entry of readdirSync(coursesPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const bundlePath = join(coursesPath, entry.name)
    const manifestPath = join(bundlePath, 'course.json')
    if (!existsSync(manifestPath)) continue
    try {
      const manifest = validateCourseManifest(JSON.parse(readFileSync(manifestPath, 'utf-8')))
      const existing = registry.courses.find((c) => c.id === manifest.id)
      const stat = statSync(bundlePath)
      found.set(manifest.id, {
        id: manifest.id,
        path: bundlePath,
        installedAt: existing?.installedAt ?? stat.mtime.toISOString(),
        version: manifest.version
      })
    } catch {
      /* skip invalid bundles */
    }
  }

  registry.courses = Array.from(found.values())
  dataStore.saveRegistry(registry)
}

export function importBundle(zipPath: string): ImportResult {
  const coursesPath = getCoursesPath()
  const stagingDir = join(getStagingPath(), `import-${Date.now()}`)
  mkdirSync(stagingDir, { recursive: true })
  try {
    const zip = new AdmZip(zipPath)
    zip.extractAllTo(stagingDir, true)
    const entries = readdirSync(stagingDir)
    let bundleRoot = stagingDir
    if (entries.length === 1 && !existsSync(join(stagingDir, 'course.json'))) {
      bundleRoot = join(stagingDir, entries[0])
    }
    const validation = validateBundle(bundleRoot)
    if (!validation.valid || !validation.manifest) {
      rmSync(stagingDir, { recursive: true, force: true })
      return { success: false, errors: validation.errors }
    }
    const manifest = validation.manifest
    const targetDir = join(coursesPath, manifest.id)
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true })
    }
    renameSync(bundleRoot, targetDir)
    if (existsSync(stagingDir)) {
      try {
        rmSync(stagingDir, { recursive: true, force: true })
      } catch {
        /* staging cleanup */
      }
    }
    const registry = dataStore.getRegistry()
    const existing = registry.courses.findIndex((c) => c.id === manifest.id)
    const entry = {
      id: manifest.id,
      path: targetDir,
      installedAt: new Date().toISOString(),
      version: manifest.version
    }
    if (existing >= 0) registry.courses[existing] = entry
    else registry.courses.push(entry)
    dataStore.saveRegistry(registry)
    syncCourseRegistry()
    return {
      success: true,
      course: buildCourseCard(manifest, entry.path, entry.installedAt)
    }
  } catch (e) {
    if (existsSync(stagingDir)) rmSync(stagingDir, { recursive: true, force: true })
    return { success: false, errors: [(e as Error).message] }
  }
}

export function removeCourse(courseId: string): boolean {
  const registry = dataStore.getRegistry()
  const idx = registry.courses.findIndex((c) => c.id === courseId)
  if (idx < 0) return false
  const entry = registry.courses[idx]
  if (existsSync(entry.path)) {
    rmSync(entry.path, { recursive: true, force: true })
  }
  registry.courses.splice(idx, 1)
  dataStore.saveRegistry(registry)
  return true
}

export function getManifest(courseId: string): CourseManifest | null {
  const registry = dataStore.getRegistry()
  const entry = registry.courses.find((c) => c.id === courseId)
  if (!entry) return null
  const manifestPath = join(entry.path, 'course.json')
  if (!existsSync(manifestPath)) return null
  try {
    return validateCourseManifest(JSON.parse(readFileSync(manifestPath, 'utf-8')))
  } catch {
    return null
  }
}

export function getCoursePath(courseId: string): string | null {
  const registry = dataStore.getRegistry()
  return registry.courses.find((c) => c.id === courseId)?.path ?? null
}

export function resolveAssetPath(courseId: string, relativePath: string): string | null {
  const coursePath = getCoursePath(courseId)
  if (!coursePath) return null
  const resolved = normalize(resolve(coursePath, relativePath))
  if (!resolved.startsWith(normalize(coursePath))) return null
  if (!existsSync(resolved)) return null
  return resolved
}

export function listCourses(userId: string): CourseCardData[] {
  syncCourseRegistry()
  const registry = dataStore.getRegistry()
  return registry.courses
    .map((entry) => {
      const manifest = getManifest(entry.id)
      if (!manifest) return null
      const progress = dataStore.getCourseProgress(userId, entry.id)
      return buildCourseCard(manifest, entry.path, entry.installedAt, progress?.percent ?? 0)
    })
    .filter((c): c is CourseCardData => c !== null)
}

function buildCourseCard(
  manifest: CourseManifest,
  coursePath: string,
  installedAt: string,
  progress = 0
): CourseCardData {
  return {
    id: manifest.id,
    title: manifest.title,
    description: manifest.description,
    author: manifest.author,
    version: manifest.version,
    level: manifest.level,
    language: manifest.language,
    estimatedHours: manifest.estimatedHours,
    thumbnailUrl: manifest.thumbnail ? `classhub://course/${manifest.id}/${manifest.thumbnail}` : null,
    coverUrl: manifest.cover ? `classhub://course/${manifest.id}/${manifest.cover}` : null,
    tags: manifest.tags,
    moduleCount: countModules(manifest),
    lessonCount: countLessons(manifest),
    progress,
    accessPolicy: manifest.access.defaultPolicy,
    installedAt
  }
}
