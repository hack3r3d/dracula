/**
 * Shared type definitions for the Dracula counter library.
 * These types are used across all storage engine implementations.
 */

export interface CounterMeta {
  [key: string]: unknown
}

/**
 * Shape expected from callers when creating/updating counters.
 */
export interface CounterInput {
  count: number
  createdAt?: Date
  meta: CounterMeta
}

/**
 * Shape stored in the database. `createdAt` is always populated.
 */
export interface Counter extends CounterInput {
  createdAt: Date
}

/**
 * Abstract identifier type for counters. The concrete representation
 * depends on the backing store (e.g. Mongo ObjectId, SQLite integer, etc.).
 */
export type CounterId = unknown

/**
 * Result returned from create() operations.
 */
export interface CreateResult {
  id: CounterId
}

/**
 * Options for paginating query results.
 */
export interface PaginationOptions {
  /**
   * Maximum number of records to return.
   */
  limit?: number

  /**
   * Number of records to skip before returning results.
   */
  skip?: number
}
