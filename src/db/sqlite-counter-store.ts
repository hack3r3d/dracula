import type { Counter, CounterInput, PaginationOptions, CreateResult } from '../types'
import type { CounterStore } from './counter-store'

/**
 * Minimal async interface expected from a SQLite client. This matches the
 * shape exposed by popular libraries like `sqlite` (with `sqlite3`) or
 * thin wrappers over `better-sqlite3`.
 */
export interface SqliteDb {
  run(sql: string, params?: unknown[]): Promise<{ lastID?: number; changes?: number }>
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>
}

interface SqliteCounterRow {
  id: number
  count: number
  created_at: string
  meta: string
}

/**
 * SQLite implementation of CounterStore.
 *
 * Schema (created on first use):
 *   CREATE TABLE IF NOT EXISTS <tableName> (
 *     id INTEGER PRIMARY KEY AUTOINCREMENT,
 *     count INTEGER NOT NULL,
 *     created_at TEXT NOT NULL,
 *     meta TEXT NOT NULL
 *   );
 *
 * The `meta` column stores JSON and expects SQLite JSON1 extension support
 * for the compute() implementation.
 */
export class SqliteCounterStore implements CounterStore {
  private initialized = false

  constructor(
    private db: SqliteDb,
    private tableName: string = 'counters',
  ) {}

  private async ensureInitialized() {
    if (this.initialized) return

    await this.db.run(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        meta TEXT NOT NULL
      )`,
    )

    this.initialized = true
  }

  private rowToCounter(row: SqliteCounterRow): Counter {
    return {
      count: row.count,
      createdAt: new Date(row.created_at),
      meta: JSON.parse(row.meta),
    }
  }

  private async getRowById(id: unknown): Promise<SqliteCounterRow | undefined> {
    const row = await this.db.get<SqliteCounterRow>(
      `SELECT id, count, created_at, meta FROM ${this.tableName} WHERE id = ?`,
      [id],
    )
    return row
  }

  private getFieldValue(counter: Counter, path: string): unknown {
    const parts = path.split('.')
    let current: unknown = counter

    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined
      }
      current = (current as Record<string, unknown>)[part]
    }

    return current
  }

  private matchesCondition(fieldValue: unknown, condition: unknown): boolean {
    // Operator object
    if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
      const cond = condition as Record<string, unknown>
      const opKeys = Object.keys(cond).filter((k) => k.startsWith('$'))

      // If no operator keys, fall back to deep equality
      if (opKeys.length === 0) {
        return fieldValue === condition
      }

      for (const key of opKeys) {
        const value = cond[key]

        switch (key) {
          case '$gt': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!((fieldValue as any) > (value as any))) return false
            break
          }
          case '$gte': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!((fieldValue as any) >= (value as any))) return false
            break
          }
          case '$lt': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!((fieldValue as any) < (value as any))) return false
            break
          }
          case '$lte': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!((fieldValue as any) <= (value as any))) return false
            break
          }
          case '$in': {
            if (!Array.isArray(value)) return false
            if (!(value as unknown[]).some((v) => v === fieldValue)) return false
            break
          }
          case '$nin': {
            if (!Array.isArray(value)) return false
            if ((value as unknown[]).some((v) => v === fieldValue)) return false
            break
          }
          case '$regex': {
            if (typeof value !== 'string') return false
            if (typeof fieldValue !== 'string') return false
            const re = new RegExp(value)
            if (!re.test(fieldValue)) return false
            break
          }
          default:
            // Unknown operator: fail fast
            return false
        }
      }

      return true
    }

    // Primitive equality
    return fieldValue === condition
  }

  private matchesFilter(counter: Counter, filter: Record<string, unknown>): boolean {
    // Handle $or separately (array of sub-filters)
    const { $or, ...rest } = filter as { $or?: Record<string, unknown>[] }

    // AND conditions for non-$or keys
    for (const [key, condition] of Object.entries(rest)) {
      const fieldValue = this.getFieldValue(counter, key)
      if (!this.matchesCondition(fieldValue, condition)) {
        return false
      }
    }

    if ($or && Array.isArray($or) && $or.length > 0) {
      // At least one of the OR branches must match
      const anyMatch = $or.some((sub) => this.matchesFilter(counter, sub))
      if (!anyMatch) return false
    }

    return true
  }

  async create(counter: CounterInput): Promise<CreateResult> {
    await this.ensureInitialized()

    const createdAt = counter.createdAt ?? new Date()
    const metaJson = JSON.stringify(counter.meta ?? {})

    const result = await this.db.run(
      `INSERT INTO ${this.tableName} (count, created_at, meta) VALUES (?, ?, ?)`,
      [counter.count, createdAt.toISOString(), metaJson],
    )

    return { id: result.lastID ?? null }
  }

  async get(filter: Record<string, unknown>, options?: PaginationOptions): Promise<Counter[]> {
    await this.ensureInitialized()

    const rows = await this.db.all<SqliteCounterRow>(
      `SELECT id, count, created_at, meta FROM ${this.tableName}`,
    )

    const counters = rows.map((row) => this.rowToCounter(row))

    let result: Counter[]

    if (!filter || Object.keys(filter).length === 0) {
      result = counters
    } else {
      result = counters.filter((counter) => this.matchesFilter(counter, filter))
    }

    // Apply pagination
    const skip = options?.skip ?? 0
    const limit = options?.limit

    if (skip > 0) {
      result = result.slice(skip)
    }

    if (limit !== undefined && limit > 0) {
      result = result.slice(0, limit)
    }

    return result
  }

  async compute(filter: Record<string, unknown>): Promise<number> {
    await this.ensureInitialized()

    const rows = await this.db.all<SqliteCounterRow>(
      `SELECT id, count, created_at, meta FROM ${this.tableName}`,
    )

    const counters = rows.map((row) => this.rowToCounter(row))

    if (!filter || Object.keys(filter).length === 0) {
      return counters.length
    }

    return counters.filter((counter) => this.matchesFilter(counter, filter)).length
  }

  async *stream(filter: Record<string, unknown>): AsyncIterable<Counter> {
    // For SQLite we currently materialize then stream; this keeps the API
    // consistent even if it doesn't yet provide true cursor-based streaming.
    const results = await this.get(filter)
    for (const counter of results) {
      yield counter
    }
  }

  async getById(id: unknown): Promise<Counter | null> {
    await this.ensureInitialized()
    const row = await this.getRowById(id)
    return row ? this.rowToCounter(row) : null
  }

  async update(id: unknown, updates: Partial<CounterInput>): Promise<number> {
    await this.ensureInitialized()
    const row = await this.getRowById(id)
    if (!row) return 0

    let count = row.count
    let createdAt = new Date(row.created_at)
    let meta = JSON.parse(row.meta) as Counter['meta']

    if (updates.count !== undefined) {
      count = updates.count
    }
    if (updates.createdAt !== undefined) {
      createdAt = updates.createdAt
    }
    if (updates.meta !== undefined) {
      meta = updates.meta
    }

    const metaJson = JSON.stringify(meta ?? {})

    const result = await this.db.run(
      `UPDATE ${this.tableName} SET count = ?, created_at = ?, meta = ? WHERE id = ?`,
      [count, createdAt.toISOString(), metaJson, id],
    )

    return result.changes ?? 0
  }

  async delete(id: unknown): Promise<number> {
    await this.ensureInitialized()
    const result = await this.db.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [id])
    return result.changes ?? 0
  }

  async deleteAll(): Promise<number> {
    await this.ensureInitialized()

    const result = await this.db.run(`DELETE FROM ${this.tableName}`)
    return result.changes ?? 0
  }
}
