import Dracula, { type Counter, type CounterInput } from '../src/dracula'
import { SqliteCounterStore } from '../src/db/sqlite-counter-store'
import { InMemorySqliteDb } from '../src/db/inmemory-sqlite'
import { createDraculaFromEnv } from '../src/createDraculaFromEnv'

describe('SqliteCounterStore with in-memory DB', () => {
  let dracula: Dracula

  beforeEach(async () => {
    const db = new InMemorySqliteDb()
    const store = new SqliteCounterStore(db)
    dracula = new Dracula(store)
  })

  it('create + compute', async () => {
    const counter: CounterInput = { count: 0, createdAt: new Date(), meta: { test: 1 } }
    const counter1: CounterInput = { count: 1, createdAt: new Date(), meta: { test: 1 } }

    await dracula.create(counter)
    await dracula.create(counter1)

    const countRes = await dracula.compute({ 'meta.test': 1 })
    expect(countRes).toBe(2)
  })

  it('CRUD by ID (SQLite)', async () => {
    const createRes = await dracula.create({
      count: 10,
      createdAt: new Date(),
      meta: { status: 'draft' },
    })

    const id = createRes.id
    expect(typeof id === 'number' || id === null).toBe(true)

    const found = await dracula.getById(id)
    expect(found).not.toBeNull()
    expect(found?.count).toBe(10)

    const updatedCount = await dracula.update(id, {
      count: 20,
      meta: { status: 'published' },
    })
    expect(updatedCount).toBe(1)

    const updated = await dracula.getById(id)
    expect(updated?.count).toBe(20)
    expect(updated?.meta.status).toBe('published')

    const deletedCount = await dracula.delete(id)
    expect(deletedCount).toBe(1)

    const afterDelete = await dracula.getById(id)
    expect(afterDelete).toBeNull()
  })

  it('returns 0 when there are no matching documents', async () => {
    const counter: CounterInput = { count: 0, createdAt: new Date(), meta: { other: 1 } }
    await dracula.create(counter)

    const countRes = await dracula.compute({ 'meta.test': 1 })
    expect(countRes).toBe(0)
  })

  it('deleteAll removes all documents', async () => {
    const counter: CounterInput = { count: 0, createdAt: new Date(), meta: { test: 1 } }
    const counter1: CounterInput = { count: 1, createdAt: new Date(), meta: { test: 1 } }

    await dracula.create(counter)
    await dracula.create(counter1)

    const deleted = await dracula.deleteAll()
    expect(deleted).toBe(2)

    const countRes = await dracula.compute({ 'meta.test': 1 })
    expect(countRes).toBe(0)
  })

  it('counts all documents when filter is empty', async () => {
    await dracula.create({ count: 0, createdAt: new Date(), meta: { test: 1 } })
    await dracula.create({ count: 1, createdAt: new Date(), meta: { test: 0 } })
    await dracula.create({ count: 2, createdAt: new Date(), meta: { other: 5 } })

    const totalCount = await dracula.compute({})
    expect(totalCount).toBe(3)
  })

  it('supports different filter values', async () => {
    await dracula.create({ count: 0, createdAt: new Date(), meta: { status: 'active' } })
    await dracula.create({ count: 1, createdAt: new Date(), meta: { status: 'active' } })
    await dracula.create({ count: 2, createdAt: new Date(), meta: { status: 'inactive' } })

    const activeCount = await dracula.compute({ 'meta.status': 'active' })
    expect(activeCount).toBe(2)

    const inactiveCount = await dracula.compute({ 'meta.status': 'inactive' })
    expect(inactiveCount).toBe(1)
  })

  it('supports multiple filter conditions', async () => {
    await dracula.create({ count: 0, createdAt: new Date(), meta: { type: 'shot', hole: 1 } })
    await dracula.create({ count: 1, createdAt: new Date(), meta: { type: 'shot', hole: 1 } })
    await dracula.create({ count: 2, createdAt: new Date(), meta: { type: 'shot', hole: 2 } })
    await dracula.create({ count: 3, createdAt: new Date(), meta: { type: 'putt', hole: 1 } })

    const hole1Shots = await dracula.compute({ 'meta.type': 'shot', 'meta.hole': 1 })
    expect(hole1Shots).toBe(2)
  })

  it('get returns documents matching the filter', async () => {
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
    // Create 5 counters
    for (let i = 0; i < 5; i++) {
      await dracula.create({ count: i, createdAt: new Date(), meta: { test: 1 } })
    }

    const docs = await dracula.get({ 'meta.test': 1 }, { limit: 3 })
    expect(docs.length).toBe(3)
  })

  it('supports skip pagination', async () => {
    // Create 5 counters
    for (let i = 0; i < 5; i++) {
      await dracula.create({ count: i, createdAt: new Date(), meta: { test: 1 } })
    }

    const docs = await dracula.get({ 'meta.test': 1 }, { skip: 2 })
    expect(docs.length).toBe(3)
  })

  it('supports limit and skip together', async () => {
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
    const page1Counts = page1.map((d) => d.count).sort()
    const page2Counts = page2.map((d) => d.count).sort()
    expect(page1Counts).not.toEqual(page2Counts)
  })

  it('supports advanced querying (range, set, or, regex-like)', async () => {
    await dracula.create({ count: 1, createdAt: new Date(), meta: { score: 5, tag: 'a' } })
    await dracula.create({ count: 2, createdAt: new Date(), meta: { score: 10, tag: 'b' } })
    await dracula.create({ count: 3, createdAt: new Date(), meta: { score: 15, tag: 'c' } })

    const rangeDocs = await dracula.get({ 'meta.score': { $gte: 10, $lte: 15 } })
    const tagsIn = await dracula.get({ 'meta.tag': { $in: ['a', 'c'] } })

    expect(rangeDocs.map((d) => d.count).sort()).toEqual([2, 3])
    expect(tagsIn.map((d) => d.count).sort()).toEqual([1, 3])

    const orDocs = await dracula.get({
      $or: [{ 'meta.score': { $lt: 10 } }, { 'meta.tag': { $in: ['b'] } }],
    })
    expect(orDocs.map((d) => d.count).sort()).toEqual([1, 2])

    const regexDocs = await dracula.get({ 'meta.tag': { $regex: 'a' } })
    expect(regexDocs.map((d) => d.count)).toEqual([1])
  })

  it('can stream results via stream()', async () => {
    for (let i = 0; i < 100; i++) {
      await dracula.create({ count: i, createdAt: new Date(), meta: { tag: 'stream-sqlite' } })
    }

    const seen: number[] = []
    for await (const doc of dracula.stream({ 'meta.tag': 'stream-sqlite' })) {
      seen.push(doc.count)
    }

    expect(seen.length).toBe(100)
    expect(seen[0]).toBe(0)
  })
})

describe('createDraculaFromEnv (sqlite)', () => {
  const originalEngine = process.env.DRACULA_DB_ENGINE
  const originalSqliteFile = process.env.DRACULA_SQLITE_FILE

  afterEach(() => {
    if (originalEngine === undefined) {
      delete process.env.DRACULA_DB_ENGINE
    } else {
      process.env.DRACULA_DB_ENGINE = originalEngine
    }

    if (originalSqliteFile === undefined) {
      delete process.env.DRACULA_SQLITE_FILE
    } else {
      process.env.DRACULA_SQLITE_FILE = originalSqliteFile
    }
  })

  it('creates a sqlite-backed Dracula when DRACULA_DB_ENGINE=sqlite', async () => {
    process.env.DRACULA_DB_ENGINE = 'sqlite'
    delete process.env.DRACULA_SQLITE_FILE

    const { dracula, close } = await createDraculaFromEnv()

    const counter: CounterInput = { count: 1, createdAt: new Date(), meta: { test: 1 } }
    await dracula.create(counter)

    const countRes = await dracula.compute({ 'meta.test': 1 })
    expect(countRes).toBe(1)

    await close()
  })
})
