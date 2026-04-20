import { createApiApp } from '../app.js'
import { resolveHeaderAuthContext } from '../auth.js'
import { createBunSqliteStore } from '../store/bun-sqlite.js'

const port = Number.parseInt(process.env.PORT ?? '8787', 10)
const dbPath = process.env.CERULIA_API_DB ?? './cerulia-api.sqlite'

const store = createBunSqliteStore(dbPath)

const app = createApiApp({
  store,
  authResolver: resolveHeaderAuthContext,
})

Bun.serve({
  port,
  fetch: app.fetch,
})

console.log(`cerulia-api listening on http://localhost:${port}`)