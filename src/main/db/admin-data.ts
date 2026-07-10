import { randomBytes } from 'crypto'
import type { CourseEnrollment, Group, LicenseKey, LicenseKeyStatus, LicenseType } from '@shared/types'
import { hashLicenseKey } from './migrate'
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
    studentId: r.learner_id,
    studentName: r.learner_name,
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

export async function updateEnrollment(
  id: string,
  courseId: string,
  instructorId: string,
  learnerId: string
): Promise<CourseEnrollment | null> {
  await query(
    `UPDATE course_enrollments SET course_id = $2, instructor_id = $3, learner_id = $4 WHERE id = $1`,
    [id, courseId.trim(), instructorId, learnerId]
  )
  const list = await listEnrollments()
  return list.find((e) => e.id === id) ?? null
}

export async function deleteEnrollment(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM course_enrollments WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}

function generateLicenseCode(): string {
  const seg = () => randomBytes(2).toString('hex').toUpperCase()
  return `CLASSHUB-${seg()}-${seg()}-${seg()}`
}

async function uniqueLicenseCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateLicenseCode()
    const exists = await queryOne('SELECT id FROM license_keys WHERE code = $1', [code])
    if (!exists) return code
  }
  throw new Error('Could not generate unique license code')
}

async function assertUserHasNoOtherLicense(userId: string, exceptLicenseId?: string): Promise<void> {
  const row = await queryOne<{ id: string }>(
    exceptLicenseId
      ? 'SELECT id FROM license_keys WHERE assigned_user_id = $1 AND id != $2 LIMIT 1'
      : 'SELECT id FROM license_keys WHERE assigned_user_id = $1 LIMIT 1',
    exceptLicenseId ? [userId, exceptLicenseId] : [userId]
  )
  if (row) throw new Error('User already has a license assigned')
}

function mapLicenseKey(row: {
  id: string
  code: string
  license_type_id: string
  license_type_name: string
  status: LicenseKeyStatus
  expires_at: string | null
  assigned_user_id: string | null
  assigned_user_name: string | null
  created_at: string
}): LicenseKey {
  return {
    id: row.id,
    code: row.code,
    licenseTypeId: row.license_type_id,
    licenseTypeName: row.license_type_name,
    status: row.status,
    expiresAt: row.expires_at,
    assignedUserId: row.assigned_user_id,
    assignedUserName: row.assigned_user_name,
    createdAt: row.created_at
  }
}

export async function listLicenseKeys(): Promise<LicenseKey[]> {
  const rows = await query<{
    id: string
    code: string
    license_type_id: string
    license_type_name: string
    status: LicenseKeyStatus
    expires_at: string | null
    assigned_user_id: string | null
    assigned_user_name: string | null
    created_at: string
  }>(
    `SELECT lk.id, lk.code, lk.license_type_id, lt.name AS license_type_name,
            lk.status, lk.expires_at, lk.assigned_user_id, u.display_name AS assigned_user_name,
            lk.created_at
     FROM license_keys lk
     JOIN license_types lt ON lt.id = lk.license_type_id
     LEFT JOIN users u ON u.id = lk.assigned_user_id
     ORDER BY lk.created_at DESC`
  )
  return rows.map(mapLicenseKey)
}

export async function createLicenseKey(
  licenseTypeId: string,
  expiresAt?: string | null,
  assignedUserId?: string | null
): Promise<LicenseKey> {
  if (assignedUserId) {
    await assertUserHasNoOtherLicense(assignedUserId)
  }
  const code = await uniqueLicenseCode()
  const codeHash = hashLicenseKey(code)
  const row = await queryOne<{ id: string }>(
    `INSERT INTO license_keys (code, code_hash, license_type_id, status, expires_at, assigned_user_id)
     VALUES ($1, $2, $3, 'active', $4, $5) RETURNING id`,
    [code, codeHash, licenseTypeId, expiresAt || null, assignedUserId || null]
  )
  if (!row) throw new Error('Failed to create license')
  const list = await listLicenseKeys()
  const created = list.find((l) => l.id === row.id)
  if (!created) throw new Error('License not found after create')
  return created
}

export async function updateLicenseKey(
  id: string,
  updates: {
    licenseTypeId?: string
    status?: LicenseKeyStatus
    expiresAt?: string | null
    assignedUserId?: string | null
  }
): Promise<LicenseKey | null> {
  const existing = await queryOne<{
    license_type_id: string
    status: LicenseKeyStatus
    expires_at: string | null
    assigned_user_id: string | null
  }>('SELECT license_type_id, status, expires_at, assigned_user_id FROM license_keys WHERE id = $1', [id])
  if (!existing) return null

  const nextAssigned =
    updates.assignedUserId !== undefined ? updates.assignedUserId : existing.assigned_user_id
  if (nextAssigned) {
    await assertUserHasNoOtherLicense(nextAssigned, id)
  }

  await query(
    `UPDATE license_keys SET
      license_type_id = $2, status = $3, expires_at = $4, assigned_user_id = $5
     WHERE id = $1`,
    [
      id,
      updates.licenseTypeId ?? existing.license_type_id,
      updates.status ?? existing.status,
      updates.expiresAt !== undefined ? updates.expiresAt : existing.expires_at,
      updates.assignedUserId !== undefined ? updates.assignedUserId : existing.assigned_user_id
    ]
  )
  const list = await listLicenseKeys()
  return list.find((l) => l.id === id) ?? null
}

export async function regenerateLicenseKey(id: string): Promise<LicenseKey | null> {
  const existing = await queryOne<{ id: string }>('SELECT id FROM license_keys WHERE id = $1', [id])
  if (!existing) return null

  const code = await uniqueLicenseCode()
  const codeHash = hashLicenseKey(code)
  await query('UPDATE license_keys SET code = $2, code_hash = $3 WHERE id = $1', [id, code, codeHash])

  const list = await listLicenseKeys()
  return list.find((l) => l.id === id) ?? null
}

export async function deleteLicenseKey(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM license_keys WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}
