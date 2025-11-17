import Dracula, { type Counter, type CounterInput } from '../dracula'
import client, { createMongoClient } from '../db/mongodb'
import { collectionConfig, getEnv } from '../config'
import { ObjectId } from 'mongodb'

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
        await client.connect()
    } catch (ex) {
        const err = ex instanceof Error ? ex : new Error(String(ex))
        throw err
    }
})
afterEach(async () => {
    const d = new Dracula(client, collectionConfig)
    await d.deleteAll()
    await client.close()
})
describe('Dracula', () => {
    describe('#create', () => {
        it('success', async () => {
            const dracula = new Dracula(client, collectionConfig)
            const counter: CounterInput = { count: 0, createdAt: new Date(), meta: { test: 1 } }
            const res = await dracula.create(counter)
            const insertId = res.insertedId
            expect(ObjectId.isValid(insertId)).toBe(true)

            const counter1: CounterInput = { count: 1, createdAt: new Date(), meta: { test: 1 } }
            const res1 = await dracula.create(counter1)
            const insertId1 = res1.insertedId
            expect(ObjectId.isValid(insertId1)).toBe(true)

            const countRes = await dracula.compute('test')
            expect(countRes).toBe(2)
        })
    })

    describe('#compute', () => {
        it('returns 0 when there are no matching documents', async () => {
            const dracula = new Dracula(client, collectionConfig)

            // Insert a document that should NOT match the countOn criteria
            const counter: CounterInput = { count: 0, createdAt: new Date(), meta: { other: 1 } }
            await dracula.create(counter)

            const countRes = await dracula.compute('test')
            expect(countRes).toBe(0)
        })
    })

    describe('#deleteAll', () => {
        it('deletes all documents and returns deleted count', async () => {
            const dracula = new Dracula(client, collectionConfig)

            const counter: CounterInput = { count: 0, createdAt: new Date(), meta: { test: 1 } }
            const counter1: CounterInput = { count: 1, createdAt: new Date(), meta: { test: 1 } }

            await dracula.create(counter)
            await dracula.create(counter1)

            const deletedCount = await dracula.deleteAll()
            expect(deletedCount).toBe(2)

            const countRes = await dracula.compute('test')
            expect(countRes).toBe(0)
        })
    })

    describe('#read', () => {
        it('returns documents matching the filter', async () => {
            const dracula = new Dracula(client, collectionConfig)

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
    })

    describe('configuration errors', () => {
        it('throws when collectionConfig is missing dbName', async () => {
            const badConfig = { dbName: '', collectionName: collectionConfig.collectionName }

            const localClient = createMongoClient(process.env.DRACULA_MONGO_CONNECTION)
            const dracula = new Dracula(localClient, badConfig as any)

            await expect(
                dracula.compute('test'),
            ).rejects.toThrow('dbName and collectionName are required')
        })

        it('createMongoClient throws when connection string is missing', () => {
            expect(() => createMongoClient(undefined as any)).toThrow(
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
