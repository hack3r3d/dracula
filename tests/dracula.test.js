"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dracula_1 = __importDefault(require("../dracula"));
const mongodb_1 = require("../db/mongodb");
const config_1 = require("../config");
const mongodb_2 = require("mongodb");
const mongodb_memory_server_1 = require("mongodb-memory-server");
let mongod;
let client;
beforeAll(async () => {
    mongod = await mongodb_memory_server_1.MongoMemoryServer.create();
    const uri = mongod.getUri();
    // Point the library's MongoClient at the in-memory MongoDB instance
    process.env.DRACULA_MONGO_CONNECTION = uri;
});
afterAll(async () => {
    if (mongod) {
        await mongod.stop();
    }
});
beforeEach(async () => {
    if (!config_1.collectionConfig.dbName || !/test/.test(config_1.collectionConfig.dbName)) {
        console.warn('Skipping tests: DRACULA_MONGO_DATABASE must include "test" in the name.');
        return pending('Invalid test database name');
    }
    if (!config_1.collectionConfig.collectionName) {
        console.warn('Skipping tests: DRACULA_MONGO_COLLECTION must be set for tests.');
        return pending('Missing DRACULA_MONGO_COLLECTION');
    }
    try {
        client = (0, mongodb_1.createMongoClient)(process.env.DRACULA_MONGO_CONNECTION);
        await client.connect();
    }
    catch (ex) {
        const err = ex instanceof Error ? ex : new Error(String(ex));
        throw err;
    }
});
afterEach(async () => {
    const d = new dracula_1.default(client, config_1.collectionConfig);
    await d.deleteAll();
    await client.close();
});
describe('Dracula', () => {
    describe('#create', () => {
        it('success', async () => {
            const dracula = new dracula_1.default(client, config_1.collectionConfig);
            const counter = { count: 0, createdAt: new Date(), meta: { test: 1 } };
            const res = await dracula.create(counter);
            const insertId = res.insertedId;
            expect(mongodb_2.ObjectId.isValid(insertId)).toBe(true);
            const counter1 = { count: 1, createdAt: new Date(), meta: { test: 1 } };
            const res1 = await dracula.create(counter1);
            const insertId1 = res1.insertedId;
            expect(mongodb_2.ObjectId.isValid(insertId1)).toBe(true);
            const countRes = await dracula.compute('test');
            expect(countRes).toBe(2);
        });
    });
    describe('#compute', () => {
        it('returns 0 when there are no matching documents', async () => {
            const dracula = new dracula_1.default(client, config_1.collectionConfig);
            // Insert a document that should NOT match the countOn criteria
            const counter = { count: 0, createdAt: new Date(), meta: { other: 1 } };
            await dracula.create(counter);
            const countRes = await dracula.compute('test');
            expect(countRes).toBe(0);
        });
    });
    describe('#deleteAll', () => {
        it('deletes all documents and returns deleted count', async () => {
            const dracula = new dracula_1.default(client, config_1.collectionConfig);
            const counter = { count: 0, createdAt: new Date(), meta: { test: 1 } };
            const counter1 = { count: 1, createdAt: new Date(), meta: { test: 1 } };
            await dracula.create(counter);
            await dracula.create(counter1);
            const deletedCount = await dracula.deleteAll();
            expect(deletedCount).toBe(2);
            const countRes = await dracula.compute('test');
            expect(countRes).toBe(0);
        });
    });
    describe('#read', () => {
        it('returns documents matching the filter', async () => {
            const dracula = new dracula_1.default(client, config_1.collectionConfig);
            const counter = { count: 0, createdAt: new Date(), meta: { test: 1, hole: 1 } };
            const counter1 = { count: 1, createdAt: new Date(), meta: { test: 1, hole: 2 } };
            const counter2 = { count: 2, createdAt: new Date(), meta: { test: 0, hole: 1 } };
            await dracula.create(counter);
            await dracula.create(counter1);
            await dracula.create(counter2);
            const filter = { 'meta.test': 1 };
            const docs = await dracula.get(filter);
            expect(docs.length).toBe(2);
            const holes = docs.map((d) => d.meta.hole).sort();
            expect(holes).toEqual([1, 2]);
        });
    });
    describe('configuration errors', () => {
        it('throws when collectionConfig is missing dbName', async () => {
            const badConfig = { dbName: '', collectionName: config_1.collectionConfig.collectionName };
            const localClient = (0, mongodb_1.createMongoClient)(process.env.DRACULA_MONGO_CONNECTION);
            const dracula = new dracula_1.default(localClient, badConfig);
            await expect(dracula.compute('test')).rejects.toThrow('dbName and collectionName are required');
        });
        it('createMongoClient throws when connection string is missing', () => {
            expect(() => (0, mongodb_1.createMongoClient)(undefined)).toThrow('DRACULA_MONGO_CONNECTION is required');
        });
        it('getEnv throws when env var is missing', () => {
            expect(() => (0, config_1.getEnv)('DRACULA_NON_EXISTENT_ENV_VAR')).toThrow('DRACULA_NON_EXISTENT_ENV_VAR is required');
        });
    });
});
