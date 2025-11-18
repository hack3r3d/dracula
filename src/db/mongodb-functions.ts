import type { MongoClient, Db, Collection } from 'mongodb'
import type { Counter, CounterInput, PaginationOptions } from '../types'
import { ConfigError, ValidationError } from '../errors'

export interface CollectionConfig {
  dbName: string
  collectionName: string
}

const getCollection = (client: MongoClient, config: CollectionConfig): Collection<Counter> => {
  const { dbName, collectionName } = config

  if (!dbName || !collectionName) {
    throw new ConfigError('dbName and collectionName are required')
  }

  const database: Db = client.db(dbName)
  return database.collection<Counter>(collectionName)
}

const ensureCounterInput = (value: unknown): CounterInput => {
  if (!value || typeof value !== 'object') {
    throw new ValidationError('counter must be a non-null object')
  }

  const candidate = value as Partial<CounterInput>

  if (typeof candidate.count !== 'number' || !Number.isFinite(candidate.count)) {
    throw new ValidationError('counter.count must be a finite number')
  }

  if (typeof candidate.meta !== 'object' || candidate.meta === null) {
    throw new ValidationError('counter.meta must be a non-null object')
  }

  if (candidate.createdAt !== undefined && !(candidate.createdAt instanceof Date)) {
    throw new ValidationError('counter.createdAt, if provided, must be a Date instance')
  }

  return {
    count: candidate.count,
    createdAt: candidate.createdAt,
    meta: candidate.meta,
  }
}

export const create = async (
  client: MongoClient,
  config: CollectionConfig,
  counter: CounterInput,
) => {
  const collection = getCollection(client, config)
  const normalized = ensureCounterInput(counter)
  const document: Counter = {
    ...normalized,
    createdAt: normalized.createdAt ?? new Date(),
  }
  return collection.insertOne(document)
}

export const read = async (
  client: MongoClient,
  config: CollectionConfig,
  collatorId: Record<string, unknown>,
  options?: PaginationOptions,
): Promise<Counter[]> => {
  const collection = getCollection(client, config)
  let cursor = collection.find(collatorId)

  if (options?.skip) {
    cursor = cursor.skip(options.skip)
  }

  if (options?.limit) {
    cursor = cursor.limit(options.limit)
  }

  return cursor.toArray()
}

/**
 * Calculate the total count for records that match the given filter.
 *
 * @param client - MongoDB client
 * @param config - Collection configuration
 * @param filter - Query filter to match documents
 * @returns The number of matching documents
 */
export const compute = async (
  client: MongoClient,
  config: CollectionConfig,
  filter: Record<string, unknown>,
): Promise<number> => {
  const collection = getCollection(client, config)
  return collection.countDocuments(filter)
}

export const stream = (
  client: MongoClient,
  config: CollectionConfig,
  filter: Record<string, unknown>,
): AsyncIterable<Counter> => {
  const collection = getCollection(client, config)
  const cursor = collection.find(filter)
  return cursor as unknown as AsyncIterable<Counter>
}

export const readById = async (
  client: MongoClient,
  config: CollectionConfig,
  id: unknown,
): Promise<Counter | null> => {
  const collection = getCollection(client, config)
  const doc = await collection.findOne({ _id: id as never })
  return doc ?? null
}

export const updateById = async (
  client: MongoClient,
  config: CollectionConfig,
  id: unknown,
  updates: Partial<CounterInput>,
): Promise<number> => {
  const collection = getCollection(client, config)
  const $set: Partial<Counter> = {}

  if (updates.count !== undefined) {
    $set.count = updates.count
  }
  if (updates.createdAt !== undefined) {
    $set.createdAt = updates.createdAt
  }
  if (updates.meta !== undefined) {
    $set.meta = updates.meta
  }

  if (Object.keys($set).length === 0) {
    return 0
  }

  const result = await collection.updateOne({ _id: id as never }, { $set })
  return result.modifiedCount ?? 0
}

export const deleteById = async (
  client: MongoClient,
  config: CollectionConfig,
  id: unknown,
): Promise<number> => {
  const collection = getCollection(client, config)
  const result = await collection.deleteOne({ _id: id as never })
  return result.deletedCount ?? 0
}

/**
 * Delete all documents from the collection.
 * Be careful where this is called; primarily intended for tests and local development.
 */
export const deleteAll = async (client: MongoClient, config: CollectionConfig): Promise<number> => {
  const collection = getCollection(client, config)
  const result = await collection.deleteMany({})
  return result.deletedCount ?? 0
}
