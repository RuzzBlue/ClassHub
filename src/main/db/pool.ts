import { neonConfig, Pool, type QueryResultRow } from '@neondatabase/serverless'
import ws from 'ws'

// Electron's TCP stack often stalls on Neon TLS; WebSockets work in both Electron and Node.
neonConfig.webSocketConstructor = ws

let pool: Pool | null = null

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null
}

export function getPool(): Pool {
  const url = getDatabaseUrl()
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.')
  }
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 60_000,
      max: 10
    })
    pool.on('error', (err) => console.error('[db] pool error', err))
  }
  return pool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params)
  return result.rows
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}
