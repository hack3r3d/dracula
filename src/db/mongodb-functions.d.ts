import type { MongoClient } from 'mongodb'
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
 * Shape stored in MongoDB. `createdAt` is always populated.
 */
export interface Counter extends CounterInput {
  createdAt: Date
}
export interface CollectionConfig {
  dbName: string
  collectionName: string
}
export declare const create: (
  client: MongoClient,
  config: CollectionConfig,
  counter: CounterInput,
) => Promise<import('mongodb').InsertOneResult<Counter>>
export declare const read: (
  client: MongoClient,
  config: CollectionConfig,
  collatorId: Record<string, unknown>,
) => Promise<Counter[]>
/**
 * Calculate the total count for records that match the `countOn` meta field.
 */
export declare const compute: (
  client: MongoClient,
  config: CollectionConfig,
  countOn: string,
) => Promise<number>
/**
 * Delete all documents from the collection.
 * Be careful where this is called; primarily intended for tests and local development.
 */
export declare const deleteAll: (client: MongoClient, config: CollectionConfig) => Promise<number>
//# sourceMappingURL=mongodb-functions.d.ts.map
