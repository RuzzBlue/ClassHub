import { readFileSync } from 'fs'
import type { LabItem, CourseManifest } from '@shared/schemas'
import { findLesson } from '@shared/schemas'
import type { LabAttachment, LabSubmission, LabSubmissionStatus } from '@shared/types'
import { dataStore } from './data-store'
import { getManifest, resolveAssetPath } from './bundle-service'

export function localLabUserId(activeUserId: string | null | undefined): string {
  return activeUserId || 'guest'
}

export function getCourseLabs(courseId: string): LabItem[] {
  const manifest = getManifest(courseId)
  if (!manifest?.lab?.labs?.length) return []
  return [...manifest.lab.labs].sort((a, b) => a.order - b.order)
}

export function getLabDueLabel(manifest: CourseManifest, lessonId: string): string {
  const info = findLesson(manifest, lessonId)
  if (!info) return lessonId
  return `${info.module.title} / ${info.unit.title} / ${info.lesson.title}`
}

export function listLabStates(userId: string, courseId: string): Array<{
  lab: LabItem
  dueLabel: string
  submission: LabSubmission | null
}> {
  const manifest = getManifest(courseId)
  if (!manifest) return []
  const labs = getCourseLabs(courseId)
  const submissions = dataStore.getLabSubmissions(userId, courseId)
  return labs.map((lab) => ({
    lab,
    dueLabel: getLabDueLabel(manifest, lab.dueAfterLessonId),
    submission: submissions.find((s) => s.labId === lab.id) ?? null
  }))
}

function emptySubmission(userId: string, courseId: string, labId: string): LabSubmission {
  return {
    userId,
    courseId,
    labId,
    status: 'not_started',
    attachments: [],
    notes: '',
    updatedAt: new Date().toISOString(),
    submittedAt: null
  }
}

export function getOrCreateLabSubmission(
  userId: string,
  courseId: string,
  labId: string
): LabSubmission {
  return dataStore.getLabSubmission(userId, courseId, labId) ?? emptySubmission(userId, courseId, labId)
}

export function updateLabStatus(
  userId: string,
  courseId: string,
  labId: string,
  status: LabSubmissionStatus,
  notes?: string
): LabSubmission {
  const current = getOrCreateLabSubmission(userId, courseId, labId)
  const now = new Date().toISOString()
  const next: LabSubmission = {
    ...current,
    status,
    notes: notes ?? current.notes,
    updatedAt: now,
    submittedAt:
      status === 'submitted' || status === 'completed' ? current.submittedAt ?? now : current.submittedAt
  }
  dataStore.upsertLabSubmission(next)
  return next
}

export function addLabAttachment(
  userId: string,
  courseId: string,
  labId: string,
  originalName: string,
  mimeType: string,
  contentBase64: string
): LabSubmission {
  const safeBase = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file'
  const safeName = `${Date.now()}-${safeBase}`
  const buffer = Buffer.from(contentBase64, 'base64')
  dataStore.saveLabAttachmentFile(userId, courseId, labId, safeName, buffer)

  const attachment: LabAttachment = {
    name: safeName,
    originalName,
    mimeType: mimeType || 'application/octet-stream',
    size: buffer.length,
    uploadedAt: new Date().toISOString()
  }

  const current = getOrCreateLabSubmission(userId, courseId, labId)
  const next: LabSubmission = {
    ...current,
    attachments: [...current.attachments, attachment],
    status: current.status === 'not_started' ? 'in_progress' : current.status,
    updatedAt: new Date().toISOString()
  }
  dataStore.upsertLabSubmission(next)
  return next
}

export function removeLabAttachment(
  userId: string,
  courseId: string,
  labId: string,
  attachmentName: string
): LabSubmission {
  dataStore.deleteLabAttachmentFile(userId, courseId, labId, attachmentName)
  const current = getOrCreateLabSubmission(userId, courseId, labId)
  const next: LabSubmission = {
    ...current,
    attachments: current.attachments.filter((a) => a.name !== attachmentName),
    updatedAt: new Date().toISOString()
  }
  dataStore.upsertLabSubmission(next)
  return next
}

export function readLabHtml(courseId: string, entry: string): string | null {
  const resolved = resolveAssetPath(courseId, entry)
  if (!resolved) return null
  try {
    return readFileSync(resolved, 'utf-8')
  } catch {
    return null
  }
}
