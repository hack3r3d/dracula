"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAll = exports.compute = exports.read = exports.create = void 0;
const getCollection = (client, config) => {
    const { dbName, collectionName } = config;
    if (!dbName || !collectionName) {
        throw new Error('dbName and collectionName are required');
    }
    const database = client.db(dbName);
    return database.collection(collectionName);
};
const ensureCounterInput = (value) => {
    if (!value || typeof value !== 'object') {
        throw new Error('counter must be a non-null object');
    }
    const candidate = value;
    if (typeof candidate.count !== 'number' || !Number.isFinite(candidate.count)) {
        throw new Error('counter.count must be a finite number');
    }
    if (typeof candidate.meta !== 'object' || candidate.meta === null) {
        throw new Error('counter.meta must be a non-null object');
    }
    if (candidate.createdAt !== undefined &&
        !(candidate.createdAt instanceof Date)) {
        throw new Error('counter.createdAt, if provided, must be a Date instance');
    }
    return {
        count: candidate.count,
        createdAt: candidate.createdAt,
        meta: candidate.meta,
    };
};
const create = async (client, config, counter) => {
    const collection = getCollection(client, config);
    const normalized = ensureCounterInput(counter);
    const document = {
        ...normalized,
        createdAt: normalized.createdAt ?? new Date(),
    };
    return collection.insertOne(document);
};
exports.create = create;
const read = async (client, config, collatorId) => {
    const collection = getCollection(client, config);
    return collection.find(collatorId).toArray();
};
exports.read = read;
/**
 * Calculate the total count for records that match the `countOn` meta field.
 */
const compute = async (client, config, countOn) => {
    const collection = getCollection(client, config);
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
    ];
    const cursor = collection.aggregate(agg);
    const res = await cursor.next();
    return res ? res.count : 0;
};
exports.compute = compute;
/**
 * Delete all documents from the collection.
 * Be careful where this is called; primarily intended for tests and local development.
 */
const deleteAll = async (client, config) => {
    const collection = getCollection(client, config);
    const result = await collection.deleteMany({});
    return result.deletedCount ?? 0;
};
exports.deleteAll = deleteAll;
module.exports = {
    create: exports.create,
    read: exports.read,
    compute: exports.compute,
    deleteAll: exports.deleteAll,
};
