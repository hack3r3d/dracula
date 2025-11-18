import Database from 'better-sqlite3'
import type { SqliteDb } from './sqlite-counter-store'

/**
 * BetterSqliteDb adapts a `better-sqlite3` Database to the async SqliteDb
 * interface expected by SqliteCounterStore.
 */
export class BetterSqliteDb implements SqliteDb {
  private db: Database.Database

  constructor(filename: string, options?: Database.Options) {
    this.db = new Database(filename, options)
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastID?: number; changes?: number }> {
    const stmt = this.db.prepare(sql)
    const info = stmt.run(...params)
    return {
      lastID:
        typeof info.lastInsertRowid === 'bigint'
          ? Number(info.lastInsertRowid)
          : (info.lastInsertRowid as number | undefined),
      changes: info.changes,
    }
  }

  async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...params) as T[]
    return rows
  }

  async get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const stmt = this.db.prepare(sql)
    const row = stmt.get(...params) as T | undefined
    return row
  }

  close(): void {
    this.db.close()
  }
}
