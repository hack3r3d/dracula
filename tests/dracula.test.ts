import Dracula, { type Counter, type CounterInput } from '../src/dracula'
import { createMongoClient } from '../src/db/mongodb'
import { collectionConfig, getEnv } from '../src/config'
import { MongoClient, ObjectId } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoCounterStore } from '../src/db/mongo-counter-store'
import type { CounterStore } from '../src/db/counter-store'

let mongod: MongoMemoryServer
let client: MongoClient
let store: CounterStore

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()

  // Point the library's MongoClient at the in-memory MongoDB instance
  process.env.DRACULA_MONGO_CONNECTION = uri
})

afterAll(async () => {
  if (mongod) {
    await mongod.stop()
  }
})

beforeEach(async () => {
  if (!collectionConfig.dbName || !/test/.test(collectionConfig.dbName)) {
    console.warn('Skipping tests: DRACULA_MONGO_DATABASE must include "test" in the name.')
    return pending('Invalid test database name')
  }
  if (!collectionConfig.collectionName) {
    console.warn('Skipping tests: DRACULA_MONGO_COLLECTION must be set for tests.')
    return pending('Missing DRACULA_MONGO_COLLECTION')
  }

  try {
    client = createMongoClient(process.env.DRACULA_MONGO_CONNECTION)
    await client.connect()
    store = new MongoCounterStore(client, collectionConfig)
  } catch (ex) {
    const err = ex instanceof Error ? ex : new Error(String(ex))
    throw err
  }
})
afterEach(async () => {
  if (!store || !client) {
    return
  }

  const d = new Dracula(store)
  await d.deleteAll()
  await client.close()
})
describe('Dracula', () => {
  describe('#create', () => {
    it('success', async () => {
      const dracula = new Dracula(store)
      const counter: CounterInput = { count: 0, createdAt: new Date(), meta: { test: 1 } }
      const res = await dracula.create(counter)
      const insertId = res.id
      // Casting here is acceptable in tests to assert ObjectId shape
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(ObjectId.isValid(insertId as any)).toBe(true)

      const counter1: CounterInput = { count: 1, createdAt: new Date(), meta: { test: 1 } }
      const res1 = await dracula.create(counter1)
      const insertId1 = res1.id
      // Casting here is acceptable in tests to assert ObjectId shape
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(ObjectId.isValid(insertId1 as any)).toBe(true)

      const countRes = await dracula.compute({ 'meta.test': 1 })
      expect(countRes).toBe(2)
    })
  })

  describe('CRUD by ID (Mongo)', () => {
    it('getById returns the created document', async () => {
      const dracula = new Dracula(store)
      const counter: CounterInput = { count: 5, createdAt: new Date(), meta: { test: 42 } }
      const res = await dracula.create(counter)
      const id = res.id

      const found = await dracula.getById(id)
      expect(found).not.toBeNull()
      expect(found?.count).toBe(5)
      expect(found?.meta.test).toBe(42)
    })

    it('update modifies the document', async () => {
      const dracula = new Dracula(store)
      const counter: CounterInput = { count: 1, createdAt: new Date(), meta: { status: 'draft' } }
      const res = await dracula.create(counter)
      const id = res.id

      const updatedCount = await dracula.update(id, {
        count: 2,
        meta: { status: 'published' },
      })

      expect(updatedCount).toBe(1)

      const found = await dracula.getById(id)
      expect(found).not.toBeNull()
      expect(found?.count).toBe(2)
      expect(found?.meta.status).toBe('published')
    })

    it('delete removes the document', async () => {
      const dracula = new Dracula(store)
      const counter: CounterInput = { count: 1, createdAt: new Date(), meta: { test: 1 } }
      const res = await dracula.create(counter)
      const id = res.id

      const deletedCount = await dracula.delete(id)
      expect(deletedCount).toBe(1)

      const found = await dracula.getById(id)
      expect(found).toBeNull()
    })
  })

  describe('#compute', () => {
    it('returns 0 when there are no matching documents', async () => {
      const dracula = new Dracula(store)

      // Insert a document that should NOT match the countOn criteria
      const counter: CounterInput = { count: 0, createdAt: new Date(), meta: { other: 1 } }
      await dracula.create(counter)

      const countRes = await dracula.compute({ 'meta.test': 1 })
      expect(countRes).toBe(0)
    })
  })

  describe('#deleteAll', () => {
    it('deletes all documents and returns deleted count', async () => {
      const dracula = new Dracula(store)

      const counter: CounterInput = { count: 0, createdAt: new Date(), meta: { test: 1 } }
      const counter1: CounterInput = { count: 1, createdAt: new Date(), meta: { test: 1 } }

      await dracula.create(counter)
      await dracula.create(counter1)

      const deletedCount = await dracula.deleteAll()
      expect(deletedCount).toBe(2)

      const countRes = await dracula.compute({ 'meta.test': 1 })
      expect(countRes).toBe(0)
    })

    it('counts all documents when filter is empty', async () => {
      const dracula = new Dracula(store)

      await dracula.create({ count: 0, createdAt: new Date(), meta: { test: 1 } })
      await dracula.create({ count: 1, createdAt: new Date(), meta: { test: 0 } })
      await dracula.create({ count: 2, createdAt: new Date(), meta: { other: 5 } })

      const totalCount = await dracula.compute({})
      expect(totalCount).toBe(3)
    })

    it('supports different filter values', async () => {
      const dracula = new Dracula(store)

      await dracula.create({ count: 0, createdAt: new Date(), meta: { status: 'active' } })
      await dracula.create({ count: 1, createdAt: new Date(), meta: { status: 'active' } })
      await dracula.create({ count: 2, createdAt: new Date(), meta: { status: 'inactive' } })

      const activeCount = await dracula.compute({ 'meta.status': 'active' })
      expect(activeCount).toBe(2)

      const inactiveCount = await dracula.compute({ 'meta.status': 'inactive' })
      expect(inactiveCount).toBe(1)
    })

    it('supports multiple filter conditions', async () => {
      const dracula = new Dracula(store)

      await dracula.create({ count: 0, createdAt: new Date(), meta: { type: 'shot', hole: 1 } })
      await dracula.create({ count: 1, createdAt: new Date(), meta: { type: 'shot', hole: 1 } })
      await dracula.create({ count: 2, createdAt: new Date(), meta: { type: 'shot', hole: 2 } })
      await dracula.create({ count: 3, createdAt: new Date(), meta: { type: 'putt', hole: 1 } })

      const hole1Shots = await dracula.compute({ 'meta.type': 'shot', 'meta.hole': 1 })
      expect(hole1Shots).toBe(2)
    })
  })

  describe('#read', () => {
    it('returns documents matching the filter', async () => {
      const dracula = new Dracula(store)

      const counter: CounterInput = { count: 0, createdAt: new Date(), meta: { test: 1, hole: 1 } }
      const counter1: CounterInput = { count: 1, createdAt: new Date(), meta: { test: 1, hole: 2 } }
      const counter2: CounterInput = { count: 2, createdAt: new Date(), meta: { test: 0, hole: 1 } }

      await dracula.create(counter)
      await dracula.create(counter1)
      await dracula.create(counter2)

      const filter = { 'meta.test': 1 }
      const docs = await dracula.get(filter)

      expect(docs.length).toBe(2)
      const holes = docs.map((d: Counter) => d.meta.hole).sort()
      expect(holes).toEqual([1, 2])
    })

    it('supports limit pagination', async () => {
      const dracula = new Dracula(store)

      // Create 5 counters
      for (let i = 0; i < 5; i++) {
        await dracula.create({ count: i, createdAt: new Date(), meta: { test: 1 } })
      }

      const docs = await dracula.get({ 'meta.test': 1 }, { limit: 3 })
      expect(docs.length).toBe(3)
    })

    it('supports skip pagination', async () => {
      const dracula = new Dracula(store)

      // Create 5 counters
      for (let i = 0; i < 5; i++) {
        await dracula.create({ count: i, createdAt: new Date(), meta: { test: 1 } })
      }

      const docs = await dracula.get({ 'meta.test': 1 }, { skip: 2 })
      expect(docs.length).toBe(3)
    })

    it('supports limit and skip together', async () => {
      const dracula = new Dracula(store)

      // Create 10 counters
      for (let i = 0; i < 10; i++) {
        await dracula.create({ count: i, createdAt: new Date(), meta: { test: 1 } })
      }

      // Get second page (skip first 5, take next 3)
      const page2 = await dracula.get({ 'meta.test': 1 }, { skip: 5, limit: 3 })
      expect(page2.length).toBe(3)

      // Get first page
      const page1 = await dracula.get({ 'meta.test': 1 }, { skip: 0, limit: 3 })
      expect(page1.length).toBe(3)

      // Ensure different documents
      const page1Counts = page1.map((d: Counter) => d.count).sort()
      const page2Counts = page2.map((d: Counter) => d.count).sort()
      expect(page1Counts).not.toEqual(page2Counts)
    })

    it('supports range and set queries', async () => {
      const dracula = new Dracula(store)

      await dracula.create({ count: 1, createdAt: new Date(), meta: { score: 5, tag: 'a' } })
      await dracula.create({ count: 2, createdAt: new Date(), meta: { score: 10, tag: 'b' } })
      await dracula.create({ count: 3, createdAt: new Date(), meta: { score: 15, tag: 'c' } })

      const rangeDocs = await dracula.get({ 'meta.score': { $gt: 5, $lt: 15 } })
      const tagsIn = await dracula.get({ 'meta.tag': { $in: ['a', 'c'] } })

      expect(rangeDocs.map((d) => d.count).sort()).toEqual([2])
      expect(tagsIn.map((d) => d.count).sort()).toEqual([1, 3])
    })

    it('supports OR conditions', async () => {
      const dracula = new Dracula(store)

      await dracula.create({ count: 1, createdAt: new Date(), meta: { type: 'shot', hole: 1 } })
      await dracula.create({ count: 2, createdAt: new Date(), meta: { type: 'putt', hole: 2 } })
      await dracula.create({ count: 3, createdAt: new Date(), meta: { type: 'drive', hole: 3 } })

      const docs = await dracula.get({
        $or: [{ 'meta.type': 'shot' }, { 'meta.hole': { $in: [2, 3] } }],
      })

      expect(docs.map((d) => d.count).sort()).toEqual([1, 2, 3])
    })

    it('supports simple text search via $regex', async () => {
      const dracula = new Dracula(store)

      await dracula.create({ count: 1, createdAt: new Date(), meta: { note: 'alpha bravo' } })
      await dracula.create({ count: 2, createdAt: new Date(), meta: { note: 'charlie delta' } })

      const docs = await dracula.get({ 'meta.note': { $regex: 'alpha' } })

      expect(docs.map((d) => d.count)).toEqual([1])
    })

    it('streams large result sets without materializing via stream()', async () => {
      const dracula = new Dracula(store)

      for (let i = 0; i < 1000; i++) {
        await dracula.create({ count: i, createdAt: new Date(), meta: { tag: 'stream' } })
      }

      const seen: number[] = []
      for await (const doc of dracula.stream({ 'meta.tag': 'stream' })) {
        seen.push(doc.count)
        if (seen.length >= 10) break
      }

      expect(seen.length).toBe(10)
      expect(seen[0]).toBe(0)
    })
  })

  describe('configuration errors', () => {
    it('throws when collectionConfig is missing dbName', async () => {
      const badConfig = { dbName: '', collectionName: collectionConfig.collectionName }

      const localClient = createMongoClient(process.env.DRACULA_MONGO_CONNECTION)
      // Casting here is acceptable in tests to simulate bad config
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const badStore = new MongoCounterStore(localClient, badConfig as unknown as any)
      const dracula = new Dracula(badStore)

      await expect(dracula.compute('test')).rejects.toThrow(
        'dbName and collectionName are required',
      )
    })

    it('createMongoClient throws when connection string is missing', () => {
      expect(() => createMongoClient(undefined as unknown as string | undefined)).toThrow(
        'DRACULA_MONGO_CONNECTION is required',
      )
    })

    it('getEnv throws when env var is missing', () => {
      expect(() => getEnv('DRACULA_NON_EXISTENT_ENV_VAR')).toThrow(
        'DRACULA_NON_EXISTENT_ENV_VAR is required',
      )
    })
  })
})
