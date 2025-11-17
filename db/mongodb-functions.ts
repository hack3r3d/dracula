import type { MongoClient, Db, Collection } from 'mongodb'

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

const getCollection = (
  client: MongoClient,
  config: CollectionConfig,
): Collection<Counter> => {
  const { dbName, collectionName } = config

  if (!dbName || !collectionName) {
    throw new Error('dbName and collectionName are required')
  }

  const database: Db = client.db(dbName)
  return database.collection<Counter>(collectionName)
}

const ensureCounterInput = (value: unknown): CounterInput => {
  if (!value || typeof value !== 'object') {
    throw new Error('counter must be a non-null object')
  }

  const candidate = value as Partial<CounterInput>

  if (typeof candidate.count !== 'number' || !Number.isFinite(candidate.count)) {
    throw new Error('counter.count must be a finite number')
  }

  if (typeof candidate.meta !== 'object' || candidate.meta === null) {
    throw new Error('counter.meta must be a non-null object')
  }

  if (
    candidate.createdAt !== undefined &&
    !(candidate.createdAt instanceof Date)
  ) {
    throw new Error('counter.createdAt, if provided, must be a Date instance')
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
): Promise<Counter[]> => {
  const collection = getCollection(client, config)
  return collection.find(collatorId).toArray()
}

/**
 * Calculate the total count for records that match the `countOn` meta field.
 */
export const compute = async (
  client: MongoClient,
  config: CollectionConfig,
  countOn: string,
): Promise<number> => {
  const collection = getCollection(client, config)
  const agg = [
    {
      $match: {
        [`meta.${countOn}`]: { $eq: 1 },
      },
    },
    {
      $group: {
        _id: `$meta.${countOn}`,
        count: { $sum: 1 },
      },
    },
  ] as const

  const cursor = collection.aggregate<{ _id: unknown; count: number }>(agg as any)
  const res = await cursor.next()
  return res ? res.count : 0
}

/**
 * Delete all documents from the collection.
 * Be careful where this is called; primarily intended for tests and local development.
 */
export const deleteAll = async (
  client: MongoClient,
  config: CollectionConfig,
): Promise<number> => {
  const collection = getCollection(client, config)
  const result = await collection.deleteMany({})
  return result.deletedCount ?? 0
}

module.exports = {
  create,
  read,
  compute,
  deleteAll,
}
