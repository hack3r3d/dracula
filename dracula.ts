import type { MongoClient } from 'mongodb'
import {
  create,
  read,
  compute,
  deleteAll,
  type Counter,
  type CounterInput,
  type CollectionConfig,
} from './db/mongodb-functions'

/**
 * Dracula is a fancy counter.
 *
 * It lets you create counters with metadata attached and compute aggregates
 * over those counters using MongoDB as the backing store.
 */
export default class Dracula {
  private client: MongoClient
  private config: CollectionConfig

  constructor(client: MongoClient, config: CollectionConfig) {
    this.client = client
    this.config = config
  }

  async create(counter: CounterInput) {
    return create(this.client, this.config, counter)
  }

  async get(collatorId: Record<string, unknown>): Promise<Counter[]> {
    return read(this.client, this.config, collatorId)
  }

  async count(counter: CounterInput) {
    return this.create(counter)
  }

  async compute(countOn: string) {
    return compute(this.client, this.config, countOn)
  }

  async deleteAll() {
    return deleteAll(this.client, this.config)
  }
}

export type { Counter, CounterInput }
