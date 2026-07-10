import bcrypt from 'bcrypt'
import type { User, UserRole, UserStatus } from '@shared/types'
import { hashLicenseKey } from './migrate'
import { query, queryOne } from './pool'

interface DbUserRow {
  id: string
  display_name: string
  email: string
  password_hash: string
  license_key_hash: string | null
  group_id: string | null
  group_name: string | null
  license_type_id: string | null
  license_type_name: string | null
  role: UserRole
  status: UserStatus
  avatar: string | null
  prefs: Record<string, unknown>
  created_at: string
  updated_at: string
}

const USER_SELECT = `
  SELECT u.id, u.display_name, u.email, u.password_hash, u.license_key_hash,
         u.group_id, g.name AS group_name, u.license_type_id, lt.name AS license_type_name,
         u.role, u.status, u.avatar, u.prefs, u.created_at, u.updated_at
  FROM users u
  LEFT JOIN groups g ON g.id = u.group_id
  LEFT JOIN license_types lt ON lt.id = u.license_type_id
`

function mapUser(row: DbUserRow, includeSecrets = false): User & { passwordHash?: string; licenseKeyHash?: string } {
  const user: User & { passwordHash?: string; licenseKeyHash?: string } = {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    status: row.status,
    groupId: row.group_id,
    groupName: row.group_name,
    licenseTypeId: row.license_type_id,
    licenseTypeName: row.license_type_name,
    avatar: row.avatar,
    prefs: row.prefs ?? {},
    createdAt: row.created_at
  }
  if (includeSecrets) {
    user.passwordHash = row.password_hash
    user.licenseKeyHash = row.license_key_hash ?? undefined
  }
  return user
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const row = await queryOne<DbUserRow>(`${USER_SELECT} WHERE lower(u.email) = lower($1)`, [email.trim()])
  if (!row) return null
  if (row.status === 'deactivated') return null
  const ok = await bcrypt.compare(password, row.password_hash)
  if (!ok) return null
  return mapUser(row)
}

export async function getUserById(id: string): Promise<User | null> {
  const row = await queryOne<DbUserRow>(`${USER_SELECT} WHERE u.id = $1`, [id])
  return row ? mapUser(row) : null
}

export async function listUsersByRole(role: UserRole, groupId?: string | null): Promise<User[]> {
  let sql = `${USER_SELECT} WHERE u.role = $1`
  const params: unknown[] = [role]
  if (groupId) {
    sql += ' AND u.group_id = $2'
    params.push(groupId)
  }
  sql += ' ORDER BY u.display_name ASC'
  const rows = await query<DbUserRow>(sql, params)
  return rows.map((r) => mapUser(r))
}

export interface UpsertUserInput {
  displayName: string
  email: string
  password?: string
  licenseKey?: string
  groupId?: string | null
  licenseTypeId?: string | null
  role: UserRole
  status: UserStatus
}

export async function createUser(input: UpsertUserInput): Promise<User> {
  if (!input.password) throw new Error('Password required for new users')
  const passwordHash = await bcrypt.hash(input.password, 12)
  const licenseKeyHash = input.licenseKey?.trim() ? hashLicenseKey(input.licenseKey) : null
  const row = await queryOne<DbUserRow>(
    `INSERT INTO users (display_name, email, password_hash, license_key_hash, group_id, license_type_id, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      input.displayName,
      input.email.toLowerCase(),
      passwordHash,
      licenseKeyHash,
      input.groupId ?? null,
      input.licenseTypeId ?? null,
      input.role,
      input.status
    ]
  )
  const created = await getUserById(row!.id)
  if (!created) throw new Error('Failed to create user')
  return created
}

export async function updateUser(id: string, input: Partial<UpsertUserInput>): Promise<User | null> {
  const existing = await queryOne<DbUserRow>(`${USER_SELECT} WHERE u.id = $1`, [id])
  if (!existing) return null

  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : existing.password_hash
  const licenseKeyHash =
    input.licenseKey !== undefined
      ? input.licenseKey.trim()
        ? hashLicenseKey(input.licenseKey)
        : null
      : existing.license_key_hash

  await query(
    `UPDATE users SET
      display_name = $2, email = $3, password_hash = $4, license_key_hash = $5,
      group_id = $6, license_type_id = $7, role = $8, status = $9, updated_at = NOW()
     WHERE id = $1`,
    [
      id,
      input.displayName ?? existing.display_name,
      (input.email ?? existing.email).toLowerCase(),
      passwordHash,
      licenseKeyHash,
      input.groupId !== undefined ? input.groupId : existing.group_id,
      input.licenseTypeId !== undefined ? input.licenseTypeId : existing.license_type_id,
      input.role ?? existing.role,
      input.status ?? existing.status
    ]
  )
  return getUserById(id)
}

export async function deleteUser(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}
