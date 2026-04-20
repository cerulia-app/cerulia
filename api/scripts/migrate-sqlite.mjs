import { Database } from 'bun:sqlite'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const dbPath = process.env.CERULIA_API_DB ?? './cerulia-api.sqlite'
const migrationsDir = join(import.meta.dir, '..', 'migrations')

function splitStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
}

const db = new Database(dbPath, { create: true })

try {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)

  const appliedRows = db
    .query('SELECT name FROM schema_migrations ORDER BY name ASC')
    .all()
  const applied = new Set(appliedRows.map((row) => row.name))

  const filenames = (await readdir(migrationsDir))
    .filter((filename) => filename.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right))

  const applyMigration = db.transaction((name, statements, appliedAt) => {
    for (const statement of statements) {
      db.run(statement)
    }

    db.query(
      'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
    ).run(name, appliedAt)
  })

  for (const filename of filenames) {
    if (applied.has(filename)) {
      continue
    }

    const sql = await readFile(join(migrationsDir, filename), 'utf8')
    const statements = splitStatements(sql)
    if (statements.length === 0) {
      continue
    }

    applyMigration(filename, statements, new Date().toISOString())
    console.log(`applied ${filename}`)
  }
} finally {
  db.close()
}