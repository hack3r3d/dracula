import type { MongoClient } from 'mongodb'
import type { Counter, CounterInput, PaginationOptions, CreateResult } from '../types'
import {
  create,
  read,
  compute,
  stream as streamMongo,
  readById,
  updateById,
  deleteById,
  deleteAll,
  type CollectionConfig,
} from './mongodb-functions'
import type { CounterStore } from './counter-store'

/**
 * MongoCounterStore adapts the existing MongoDB helpers to the CounterStore
 * interface expected by Dracula.
 */
export class MongoCounterStore implements CounterStore {
  constructor(
    private client: MongoClient,
    private config: CollectionConfig,
  ) {}

  async create(counter: CounterInput): Promise<CreateResult> {
    const result = await create(this.client, this.config, counter)
    return { id: result.insertedId }
  }

  async get(filter: Record<string, unknown>, options?: PaginationOptions): Promise<Counter[]> {
    return read(this.client, this.config, filter, options)
  }

  async compute(filter: Record<string, unknown>): Promise<number> {
    return compute(this.client, this.config, filter)
  }

  stream(filter: Record<string, unknown>): AsyncIterable<Counter> {
    return streamMongo(this.client, this.config, filter)
  }

  async getById(id: unknown): Promise<Counter | null> {
    return readById(this.client, this.config, id)
  }

  async update(id: unknown, updates: Partial<CounterInput>): Promise<number> {
    return updateById(this.client, this.config, id, updates)
  }

  async delete(id: unknown): Promise<number> {
    return deleteById(this.client, this.config, id)
  }

  async deleteAll(): Promise<number> {
    return deleteAll(this.client, this.config)
  }
}
