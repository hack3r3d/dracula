import type { Counter, CounterInput, PaginationOptions, CreateResult } from '../types'

/**
 * CounterStore is the abstraction over the underlying persistence layer
 * that Dracula depends on. Different database implementations (MongoDB,
 * SQLite, etc.) can implement this interface.
 */
export interface CounterStore {
  /**
   * Create a new counter record.
   */
  create(counter: CounterInput): Promise<CreateResult>

  /**
   * Retrieve counter records that match the given filter.
   *
   * @param filter - Query filter to match documents
   * @param options - Optional pagination settings (limit, skip)
   */
  get(filter: Record<string, unknown>, options?: PaginationOptions): Promise<Counter[]>

  /**
   * Compute an aggregate count of records that match the given filter.
   *
   * @param filter - Query filter to match documents
   * @returns The number of matching documents
   */
  compute(filter: Record<string, unknown>): Promise<number>

  /**
   * Stream counter records that match the given filter.
   *
   * Implementations should avoid loading all matching records into memory
   * at once when possible (e.g. Mongo cursors, paged SQLite queries).
   */
  stream(filter: Record<string, unknown>): AsyncIterable<Counter>

  /**
   * Retrieve a single counter by its primary identifier.
   *
   * The concrete ID type depends on the underlying store (e.g. Mongo ObjectId,
   * SQLite integer primary key, etc.).
   */
  getById(id: unknown): Promise<Counter | null>

  /**
   * Partially update a counter by its primary identifier.
   *
   * @param id - Store-specific primary key value
   * @param updates - Partial set of fields to update
   * @returns The number of records updated (0 or 1)
   */
  update(id: unknown, updates: Partial<CounterInput>): Promise<number>

  /**
   * Delete a single counter by its primary identifier.
   *
   * @param id - Store-specific primary key value
   * @returns The number of records deleted (0 or 1)
   */
  delete(id: unknown): Promise<number>

  /**
   * Delete all records in the underlying store.
   * Returns the number of records deleted.
   */
  deleteAll(): Promise<number>
}
