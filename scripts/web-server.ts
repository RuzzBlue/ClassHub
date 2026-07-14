import '../src/main/env'
import express from 'express'
import cors from 'cors'
import { join } from 'path'
import { existsSync } from 'fs'
import { dataStore } from '../src/main/data-store'
import { initDatabase } from '../src/main/db/migrate'
import { syncCourseRegistry } from '../src/main/bundle-service'
import { handleApiRequest } from '../src/main/api-router'

const PORT = 8765
const ROOT = process.cwd()
const STATIC_DIR = existsSync(join(ROOT, 'out', 'renderer'))
  ? join(ROOT, 'out', 'renderer')
  : join(ROOT, 'dist')

async function main(): Promise<void> {
  try {
    await initDatabase()
  } catch (err) {
    console.error('[db] Failed to initialize Neon — cloud auth unavailable until reconnect.', err)
  }
  dataStore.init()
  syncCourseRegistry()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '50mb' }))

  app.use(async (req, res, next) => {
    if (!req.path.startsWith('/api/')) return next()
    try {
      const path = req.path
      const params: Record<string, string> = {}
      const url = new URL(req.originalUrl, 'http://localhost')
      url.searchParams.forEach((value, key) => {
        params[key] = value
      })
      for (const [k, v] of Object.entries(req.query)) {
        if (typeof v === 'string') params[k] = v
      }
      const response = await handleApiRequest({
        method: req.method,
        path,
        body: req.body,
        params
      })
      const status = response.status ?? (response.ok ? 200 : 500)
      res.status(status)
      if (response.ok && response.data !== undefined) {
        res.json(response.data)
      } else {
        res.json({ error: response.error, details: response.details })
      }
    } catch (e) {
      res.status(500).json({ error: (e as Error).message })
    }
  })

  app.use(express.static(STATIC_DIR, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.woff2') || filePath.endsWith('.ttf')) {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      }
    }
  }))

  app.get(/^(?!\/api).*/, (_req, res) => {
    const index = join(STATIC_DIR, 'index.html')
    if (existsSync(index)) res.sendFile(index)
    else res.status(404).send('Run npm run build first.')
  })

  const server = app.listen(PORT, () => {
    console.log(`ClassHub web server: http://localhost:${PORT}`)
    console.log(`Courses folder: ${join(ROOT, 'courses')}`)
    console.log(`Static UI: ${STATIC_DIR}`)
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} is already in use.`)
      console.error('Only one ClassHub server can run at a time.')
      console.error('Stop the other server (Ctrl+C), then retry.')
      console.error('Windows: netstat -ano | findstr :8765   then   taskkill /PID <pid> /F\n')
      process.exit(1)
    }
    throw err
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
