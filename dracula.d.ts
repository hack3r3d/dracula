import type { MongoClient } from 'mongodb';
import { type Counter, type CounterInput, type CollectionConfig } from './db/mongodb-functions';
/**
 * Dracula is a fancy counter.
 *
 * It lets you create counters with metadata attached and compute aggregates
 * over those counters using MongoDB as the backing store.
 */
export default class Dracula {
    private client;
    private config;
    constructor(client: MongoClient, config: CollectionConfig);
    create(counter: CounterInput): Promise<import("mongodb").InsertOneResult<Counter>>;
    get(collatorId: Record<string, unknown>): Promise<Counter[]>;
    count(counter: CounterInput): Promise<import("mongodb").InsertOneResult<Counter>>;
    compute(countOn: string): Promise<number>;
    deleteAll(): Promise<number>;
}
export type { Counter, CounterInput };
//# sourceMappingURL=dracula.d.ts.map