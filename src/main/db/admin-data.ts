import type { CourseEnrollment, Group, LicenseType } from '@shared/types'
import { query, queryOne } from './pool'

export async function listGroups(): Promise<Group[]> {
  const rows = await query<{ id: string; name: string; description: string | null; created_at: string }>(
    'SELECT id, name, description, created_at FROM groups ORDER BY name ASC'
  )
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, createdAt: r.created_at }))
}

export async function createGroup(name: string, description?: string): Promise<Group> {
  const row = await queryOne<{ id: string; name: string; description: string | null; created_at: string }>(
    'INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at',
    [name.trim(), description?.trim() || null]
  )
  if (!row) throw new Error('Failed to create group')
  return { id: row.id, name: row.name, description: row.description, createdAt: row.created_at }
}

export async function updateGroup(id: string, name: string, description?: string): Promise<Group | null> {
  const row = await queryOne<{ id: string; name: string; description: string | null; created_at: string }>(
    'UPDATE groups SET name = $2, description = $3 WHERE id = $1 RETURNING id, name, description, created_at',
    [id, name.trim(), description?.trim() || null]
  )
  return row ? { id: row.id, name: row.name, description: row.description, createdAt: row.created_at } : null
}

export async function deleteGroup(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM groups WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}

export async function listLicenseTypes(): Promise<LicenseType[]> {
  const rows = await query<{ id: string; name: string; description: string | null; created_at: string }>(
    'SELECT id, name, description, created_at FROM license_types ORDER BY name ASC'
  )
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, createdAt: r.created_at }))
}

export async function createLicenseType(name: string, description?: string): Promise<LicenseType> {
  const row = await queryOne<{ id: string; name: string; description: string | null; created_at: string }>(
    'INSERT INTO license_types (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at',
    [name.trim(), description?.trim() || null]
  )
  if (!row) throw new Error('Failed to create license type')
  return { id: row.id, name: row.name, description: row.description, createdAt: row.created_at }
}

export async function updateLicenseType(id: string, name: string, description?: string): Promise<LicenseType | null> {
  const row = await queryOne<{ id: string; name: string; description: string | null; created_at: string }>(
    'UPDATE license_types SET name = $2, description = $3 WHERE id = $1 RETURNING id, name, description, created_at',
    [id, name.trim(), description?.trim() || null]
  )
  return row ? { id: row.id, name: row.name, description: row.description, createdAt: row.created_at } : null
}

export async function deleteLicenseType(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM license_types WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}

export async function listEnrollments(): Promise<CourseEnrollment[]> {
  const rows = await query<{
    id: string
    course_id: string
    instructor_id: string
    instructor_name: string
    learner_id: string
    learner_name: string
    created_at: string
  }>(
    `SELECT e.id, e.course_id, e.instructor_id, i.display_name AS instructor_name,
            e.learner_id, l.display_name AS learner_name, e.created_at
     FROM course_enrollments e
     JOIN users i ON i.id = e.instructor_id
     JOIN users l ON l.id = e.learner_id
     ORDER BY e.course_id, l.display_name`
  )
  return rows.map((r) => ({
    id: r.id,
    courseId: r.course_id,
    instructorId: r.instructor_id,
    instructorName: r.instructor_name,
    learnerId: r.learner_id,
    learnerName: r.learner_name,
    createdAt: r.created_at
  }))
}

export async function createEnrollment(
  courseId: string,
  instructorId: string,
  learnerId: string
): Promise<CourseEnrollment> {
  const row = await queryOne<{ id: string; created_at: string }>(
    `INSERT INTO course_enrollments (course_id, instructor_id, learner_id)
     VALUES ($1, $2, $3) RETURNING id, created_at`,
    [courseId.trim(), instructorId, learnerId]
  )
  if (!row) throw new Error('Failed to create enrollment')
  const list = await listEnrollments()
  const created = list.find((e) => e.id === row.id)
  if (!created) throw new Error('Enrollment not found after create')
  return created
}

export async function deleteEnrollment(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM course_enrollments WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}
