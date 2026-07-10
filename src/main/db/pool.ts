import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null
}

export function getPool(): pg.Pool {
  const url = getDatabaseUrl()
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.')
  }
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: 20_000,
      idleTimeoutMillis: 60_000,
      max: 10
    })
    pool.on('error', (err) => console.error('[db] pool error', err))
  }
  return pool
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query(sql, params)
  return result.rows as T[]
}

export async function queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}
