import type { ApiRequest, ApiResponse } from '@shared/api'
import type { UserRole, UserStatus } from '@shared/types'
import { dataStore } from './data-store'
import { getDatabaseUrl } from './db/pool'
import { getUserById } from './db/users'
import {
  createEnrollment,
  createGroup,
  createLicenseType,
  deleteEnrollment,
  deleteGroup,
  deleteLicenseType,
  listEnrollments,
  listGroups,
  listLicenseTypes,
  updateGroup,
  updateLicenseType
} from './db/admin-data'
import { createUser, deleteUser, listUsersByRole, updateUser } from './db/users'

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, status: 200, data }
}

function err(message: string, status: number): ApiResponse {
  return { ok: false, status, error: message }
}

async function requireAdmin(): Promise<{ userId: string } | ApiResponse> {
  if (!getDatabaseUrl()) return err('Database not configured', 503)
  const settings = dataStore.getSettings()
  if (!settings.activeUserId) return err('Login required', 401)
  const user = await getUserById(settings.activeUserId)
  if (!user) return err('User not found', 401)
  if (user.role !== 'admin') return err('Admin access required', 403)
  return { userId: user.id }
}

export async function handleAdminRequest(req: ApiRequest): Promise<ApiResponse | null> {
  const { method, path, body, params } = req
  if (!path.startsWith('/api/admin/')) return null

  const auth = await requireAdmin()
  if ('ok' in auth && !auth.ok) return auth

  // Groups
  if (method === 'GET' && path === '/api/admin/groups') {
    return ok(await listGroups())
  }
  if (method === 'POST' && path === '/api/admin/groups') {
    const { name, description } = body as { name: string; description?: string }
    if (!name?.trim()) return err('Name required', 400)
    return ok(await createGroup(name, description))
  }
  if (method === 'PUT' && path.match(/^\/api\/admin\/groups\/[^/]+$/)) {
    const id = path.split('/').pop()!
    const { name, description } = body as { name: string; description?: string }
    const updated = await updateGroup(id, name, description)
    if (!updated) return err('Group not found', 404)
    return ok(updated)
  }
  if (method === 'DELETE' && path.match(/^\/api\/admin\/groups\/[^/]+$/)) {
    const id = path.split('/').pop()!
    if (!(await deleteGroup(id))) return err('Group not found', 404)
    return ok({ removed: true })
  }

  // License types
  if (method === 'GET' && path === '/api/admin/license-types') {
    return ok(await listLicenseTypes())
  }
  if (method === 'POST' && path === '/api/admin/license-types') {
    const { name, description } = body as { name: string; description?: string }
    if (!name?.trim()) return err('Name required', 400)
    return ok(await createLicenseType(name, description))
  }
  if (method === 'PUT' && path.match(/^\/api\/admin\/license-types\/[^/]+$/)) {
    const id = path.split('/').pop()!
    const { name, description } = body as { name: string; description?: string }
    const updated = await updateLicenseType(id, name, description)
    if (!updated) return err('License type not found', 404)
    return ok(updated)
  }
  if (method === 'DELETE' && path.match(/^\/api\/admin\/license-types\/[^/]+$/)) {
    const id = path.split('/').pop()!
    if (!(await deleteLicenseType(id))) return err('License type not found', 404)
    return ok({ removed: true })
  }

  // Users by role
  if (method === 'GET' && path === '/api/admin/users') {
    const role = params?.role as UserRole | undefined
    if (!role || !['admin', 'instructor', 'learner'].includes(role)) {
      return err('role query param required (admin|instructor|learner)', 400)
    }
    const groupId = params?.groupId || undefined
    return ok(await listUsersByRole(role, groupId))
  }
  if (method === 'POST' && path === '/api/admin/users') {
    const input = body as {
      displayName: string
      email: string
      password: string
      licenseKey?: string
      groupId?: string | null
      licenseTypeId?: string | null
      role: UserRole
      status: UserStatus
    }
    if (!input.displayName || !input.email || !input.password || !input.role) {
      return err('displayName, email, password, and role are required', 400)
    }
    try {
      return ok(await createUser({ ...input, status: input.status || 'active' }))
    } catch (e) {
      return err((e as Error).message, 400)
    }
  }
  if (method === 'PUT' && path.match(/^\/api\/admin\/users\/[^/]+$/)) {
    const id = path.split('/').pop()!
    const input = body as Partial<{
      displayName: string
      email: string
      password: string
      licenseKey: string
      groupId: string | null
      licenseTypeId: string | null
      role: UserRole
      status: UserStatus
    }>
    try {
      const updated = await updateUser(id, input)
      if (!updated) return err('User not found', 404)
      return ok(updated)
    } catch (e) {
      return err((e as Error).message, 400)
    }
  }
  if (method === 'DELETE' && path.match(/^\/api\/admin\/users\/[^/]+$/)) {
    const id = path.split('/').pop()!
    if (id === (auth as { userId: string }).userId) return err('Cannot delete your own account', 400)
    if (!(await deleteUser(id))) return err('User not found', 404)
    return ok({ removed: true })
  }

  // Enrollments
  if (method === 'GET' && path === '/api/admin/enrollments') {
    return ok(await listEnrollments())
  }
  if (method === 'POST' && path === '/api/admin/enrollments') {
    const { courseId, instructorId, learnerId } = body as {
      courseId: string
      instructorId: string
      learnerId: string
    }
    if (!courseId?.trim() || !instructorId || !learnerId) {
      return err('courseId, instructorId, and learnerId are required', 400)
    }
    try {
      return ok(await createEnrollment(courseId, instructorId, learnerId))
    } catch (e) {
      return err((e as Error).message, 400)
    }
  }
  if (method === 'DELETE' && path.match(/^\/api\/admin\/enrollments\/[^/]+$/)) {
    const id = path.split('/').pop()!
    if (!(await deleteEnrollment(id))) return err('Enrollment not found', 404)
    return ok({ removed: true })
  }

  return err('Not found', 404)
}
