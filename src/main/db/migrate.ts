import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { getDatabaseUrl, query, queryOne } from './pool'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS license_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  license_key_hash TEXT,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  license_type_id UUID REFERENCES license_types(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'instructor', 'learner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('paid', 'active', 'unpaid', 'deactivated')),
  avatar TEXT,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, learner_id)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_group ON users(group_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON course_enrollments(course_id);

CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  license_type_id UUID NOT NULL REFERENCES license_types(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  expires_at TIMESTAMPTZ,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_keys_status ON license_keys(status);
CREATE INDEX IF NOT EXISTS idx_license_keys_type ON license_keys(license_type_id);
`

let migrated = false

export async function initDatabase(): Promise<void> {
  if (migrated) return
  if (!getDatabaseUrl()) {
    console.warn('[db] DATABASE_URL not set — cloud auth disabled until .env is configured.')
    return
  }
  for (const statement of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
    await query(statement)
  }
  await seedDefaults()
  migrated = true
  console.log('[db] Neon schema ready')
}

async function seedDefaults(): Promise<void> {
  const count = await queryOne<{ count: string }>('SELECT COUNT(*)::text AS count FROM users')
  if (Number(count?.count ?? 0) > 0) return

  const email = process.env.CLASSHUB_SEED_ADMIN_EMAIL || 'admin@classhub.local'
  const password = process.env.CLASSHUB_SEED_ADMIN_PASSWORD || 'admin123'
  const passwordHash = await bcrypt.hash(password, 12)

  await query(
    `INSERT INTO users (display_name, email, password_hash, role, status)
     VALUES ($1, $2, $3, 'admin', 'active')`,
    ['ClassHub Admin', email.toLowerCase(), passwordHash]
  )

  await query(
    `INSERT INTO license_types (name, description) VALUES
     ('School / Institution', 'Annual license for enrolled students'),
     ('External', 'Individual external user license'),
     ('One-time', 'Single-use promotional license'),
     ('Promotional', 'Discounted or trial license')
     ON CONFLICT (name) DO NOTHING`
  )

  await query(
    `INSERT INTO groups (name, description) VALUES
     ('General', 'Default group'),
     ('Year 1', 'First year students'),
     ('Year 2', 'Second year students')
     ON CONFLICT (name) DO NOTHING`
  )

  console.log(`[db] Seeded admin user: ${email}`)
}

export function hashLicenseKey(key: string): string {
  return createHash('sha256').update(key.trim().toUpperCase()).digest('hex')
}
