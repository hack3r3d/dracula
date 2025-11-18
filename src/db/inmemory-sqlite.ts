import type { SqliteDb } from './sqlite-counter-store'
import { InternalError } from '../errors'

interface InMemoryRow {
  id: number
  count: number
  created_at: string
  meta: string
}

/**
 * InMemorySqliteDb is a minimal in-memory implementation of the SqliteDb
 * interface used for testing and for simple, ephemeral SQLite-like storage.
 *
 * It understands only the limited subset of SQL that SqliteCounterStore
 * generates (CREATE TABLE, INSERT, DELETE, and a simple SELECT).
 */
export class InMemorySqliteDb implements SqliteDb {
  private rows: InMemoryRow[] = []
  private nextId = 1

  async run(sql: string, params: unknown[] = []): Promise<{ lastID?: number; changes?: number }> {
    const normalized = sql.trim().toUpperCase()

    if (normalized.startsWith('CREATE TABLE')) {
      // No-op for in-memory implementation.
      return {}
    }

    if (normalized.startsWith('INSERT INTO')) {
      const [count, createdAt, meta] = params as [number, string, string]
      const row: InMemoryRow = {
        id: this.nextId++,
        count,
        created_at: createdAt,
        meta,
      }
      this.rows.push(row)
      return { lastID: row.id, changes: 1 }
    }

    if (normalized.startsWith('UPDATE')) {
      // UPDATE <table> SET count = ?, created_at = ?, meta = ? WHERE id = ?
      const [count, createdAt, meta, idParam] = params as [number, string, string, number]
      let changes = 0
      this.rows = this.rows.map((row) => {
        if (row.id === idParam) {
          changes += 1
          return {
            ...row,
            count,
            created_at: createdAt,
            meta,
          }
        }
        return row
      })
      return { changes }
    }

    if (normalized.startsWith('DELETE FROM')) {
      // Support both full-table delete and delete-by-id
      if (normalized.includes('WHERE')) {
        const [idParam] = params as [number]
        const before = this.rows.length
        this.rows = this.rows.filter((row) => row.id !== idParam)
        const deleted = before - this.rows.length
        return { changes: deleted }
      }

      const deleted = this.rows.length
      this.rows = []
      return { changes: deleted }
    }

    throw new InternalError(`Unsupported SQL in InMemorySqliteDb.run: ${sql}`)
  }

  async all<T = unknown>(sql: string, _params: unknown[] = []): Promise<T[]> {
    const normalized = sql.trim().toUpperCase()

    if (normalized.startsWith('SELECT') && normalized.includes('FROM')) {
      return this.rows as unknown as T[]
    }

    throw new InternalError(`Unsupported SQL in InMemorySqliteDb.all: ${sql}`)
  }

  async get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const normalized = sql.trim().toUpperCase()

    if (normalized.startsWith('SELECT') && normalized.includes('WHERE')) {
      const idParam = params[0] as number
      const row = this.rows.find((r) => r.id === idParam)
      return row as unknown as T | undefined
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM')) {
      return this.rows[0] as unknown as T | undefined
    }

    throw new InternalError(`Unsupported SQL in InMemorySqliteDb.get: ${sql}`)
  }
}
