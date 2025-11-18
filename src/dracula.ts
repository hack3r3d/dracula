import type { Counter, CounterInput, PaginationOptions, CreateResult } from './types'
import type { CounterStore } from './db/counter-store'

/**
 * Dracula is a fancy counter.
 *
 * It lets you create counters with metadata attached and compute aggregates
 * over those counters using a pluggable backing store.
 */
export default class Dracula {
  private store: CounterStore

  constructor(store: CounterStore) {
    this.store = store
  }

  async create(counter: CounterInput): Promise<CreateResult> {
    return this.store.create(counter)
  }

  /**
   * Retrieve counter records that match the given filter.
   *
   * @param filter - Query filter to match documents
   * @param options - Optional pagination settings (limit, skip)
   * @returns Array of matching counter documents
   *
   * @example
   * // Get all counters
   * const all = await dracula.get({ 'meta.test': 1 })
   *
   * // Get first 10 counters
   * const first10 = await dracula.get({ 'meta.test': 1 }, { limit: 10 })
   *
   * // Get next 10 counters (pagination)
   * const next10 = await dracula.get({ 'meta.test': 1 }, { limit: 10, skip: 10 })
   */
  async get(filter: Record<string, unknown>, options?: PaginationOptions): Promise<Counter[]> {
    return this.store.get(filter, options)
  }

  /**
   * Compute an aggregate count of records that match the given filter.
   *
   * @param filter - Query filter to match documents
   * @returns The number of matching documents
   *
   * @example
   * // Count records where meta.test === 1
   * const count = await dracula.compute({ 'meta.test': 1 })
   *
   * // Count records where meta.status === 'active'
   * const activeCount = await dracula.compute({ 'meta.status': 'active' })
   *
   * // Count all records
   * const totalCount = await dracula.compute({})
   *
   * // Count with multiple conditions
   * const filtered = await dracula.compute({ 'meta.type': 'shot', 'meta.hole': 5 })
   */
  async compute(filter: Record<string, unknown>) {
    return this.store.compute(filter)
  }

  /**
   * Stream counters that match the given filter as an AsyncIterator.
   *
   * This is useful for large result sets where you do not want to
   * materialize all documents in memory at once.
   */
  stream(filter: Record<string, unknown>): AsyncIterable<Counter> {
    return this.store.stream(filter)
  }

  async getById(id: unknown): Promise<Counter | null> {
    return this.store.getById(id)
  }

  async update(id: unknown, updates: Partial<CounterInput>): Promise<number> {
    return this.store.update(id, updates)
  }

  async delete(id: unknown): Promise<number> {
    return this.store.delete(id)
  }

  async deleteAll() {
    return this.store.deleteAll()
  }
}

export type { Counter, CounterInput, PaginationOptions }
