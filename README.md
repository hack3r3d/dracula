# Dracula

Dracula is a **fancy counter** with a pluggable storage backend, written in **TypeScript**.

## Why this exists

Many apps need to **track counts over time with rich context**, not just a single integer. Examples:

- A disc golf scorecard where each throw is a separate event with metadata (hole, tee, basket, disc, distance, weather).
- An analytics-style counter where each "hit" has tags (feature flag, cohort, campaign, experiment).
- Any domain where you want to **append events** and later slice/dice them by metadata.

You could hand-roll this around a database every time, but you’d end up rewriting the same patterns:

- A schema for `count`, timestamps, and `meta`.
- CRUD APIs to append and query records.
- An aggregation to answer "how many events match this flag?".

Dracula packages those pieces into a small, focused Node library that:

- Owns the data model and aggregation semantics.
- Lets you swap storage engines (Mongo, SQLite-style, etc.) without changing calling code.
- Stays lightweight enough to embed in small services or CLIs.

It lets you:

- Store counters as documents in a backing store (MongoDB by default)
- Attach arbitrary metadata to each counter
- Query counters with flexible filters
- Compute aggregate counts over metadata flags

The disc-golf-inspired idea is simple: each counter represents an event (like a shot on a hole), and `meta` captures whatever you care about (hole number, par, tee, etc.).

---

## Installation

Install from npm:

```bash path=null start=null
npm install @halfbaked/dracula
```

Dracula targets **Node.js 18+**.

---

## Configuration

Dracula supports multiple storage engines behind a `CounterStore` interface. Right now there are two implementations:

- MongoDB (production-ready)
- An in-memory SQLite-like store (primarily for tests and experiments)

Engine selection is controlled by environment variable:

- `DRACULA_DB_ENGINE` – `'mongo'` (default) or `'sqlite'`

### MongoDB engine

When `DRACULA_DB_ENGINE` is unset or set to `'mongo'`, Dracula uses MongoDB with these environment variables:

- `DRACULA_MONGO_CONNECTION` – MongoDB connection string (e.g. `mongodb://localhost:27017`)
- `DRACULA_MONGO_DATABASE` – database name (e.g. `dracula_test`)
- `DRACULA_MONGO_COLLECTION` – collection name (e.g. `counters`)

These are used to construct a `MongoClient` and a `CollectionConfig`:

- `src/db/mongodb.ts` exports a `createMongoClient` helper
- `src/config.ts` exports `collectionConfig` and a `getEnv` helper

When running the test suite, the database name must include the substring `test` (e.g. `dracula_test`); otherwise, tests will be skipped as a safety guard.

### SQLite-like engine

When `DRACULA_DB_ENGINE=sqlite`, Dracula uses an in-memory implementation of the `SqliteDb` interface (`InMemorySqliteDb`) via `SqliteCounterStore`. This is useful for tests or local development when you do not want to run MongoDB.

You can plug in a real SQLite client by implementing the `SqliteDb` interface exposed from `src/db/sqlite-counter-store.ts` and wiring it into `SqliteCounterStore`.

---

## Quick start

Dracula’s main entrypoint is the `Dracula` class (default export) and a convenience factory `createDraculaFromEnv`.

### Recommended: env-based factory

```ts path=null start=null
import Dracula, { createDraculaFromEnv } from 'dracula'

async function main() {
  // DRACULA_DB_ENGINE controls which backend is used (mongo or sqlite)
  const { dracula, close } = await createDraculaFromEnv()

  const counter = {
    count: 0,
    meta: { test: 1, hole: 1 },
  }

  // Insert a counter document
  await dracula.create(counter)

  // Compute how many counters have meta.test === 1
  const total = await dracula.compute('test')
  console.log('total counters with meta.test === 1:', total)

  // Read back documents matching a filter
  const docs = await dracula.get({ 'meta.test': 1 })
  console.log('docs:', docs)

  // Clean up (closes MongoDB client if using mongo engine)
  await close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

### Advanced: manual MongoDB wiring

If you want full control over the Mongo client, you can construct the Mongo-backed store yourself:

```ts path=null start=null
import Dracula from 'dracula'
import { createMongoClient } from 'dracula/dist/db/mongodb'
import { collectionConfig } from 'dracula/dist/config'
import { MongoCounterStore } from 'dracula/dist/db/mongo-counter-store'

async function main() {
  const client = createMongoClient(process.env.DRACULA_MONGO_CONNECTION)
  await client.connect()

  const store = new MongoCounterStore(client, collectionConfig)
  const dracula = new Dracula(store)

  const counter = { count: 0, meta: { test: 1, hole: 1 } }
  await dracula.create(counter)

  const total = await dracula.compute('test')
  console.log('total counters with meta.test === 1:', total)

  await dracula.deleteAll()
  await client.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

---

## API

### `class Dracula`

```ts path=null start=null
new Dracula(store: CounterStore)
```

- `store` – any implementation of the internal `CounterStore` interface. This repo ships with `MongoCounterStore` and `SqliteCounterStore`.

#### `create(counter)`

Insert a new counter document:

```ts path=null start=null
type CounterInput = {
  count: number
  createdAt?: Date
  meta: Record<string, unknown>
}
```

- If `createdAt` is omitted, it is set to `new Date()` on insert.
- Returns an object with an `insertedId` field (MongoDB-style for the Mongo backend).

#### `get(filter: Record<string, unknown>): Promise<Counter[]>`

Read documents matching a filter, materialized as an array.

```ts path=null start=null
type Counter = CounterInput & {
  createdAt: Date
}
```

Example:

```ts path=null start=null
const docs = await dracula.get({ 'meta.test': 1 })
```

#### `count(counter)`

Convenience alias for `create(counter)`.

#### `compute(countOn: string): Promise<number>`

Compute an aggregate count over a metadata flag. It counts how many documents have `meta[countOn] === 1`.

Example:

```ts path=null start=null
// Counts documents where meta.test === 1
const total = await dracula.compute('test')
```

For the Mongo backend, this uses an aggregation pipeline equivalent to:

- `$match` on `meta.<countOn> === 1`
- `$group` to compute `{ count: { $sum: 1 } }`

#### `deleteAll(): Promise<number>`

Delete **all** documents in the underlying store and return the number of deleted documents. Intended for tests and local development.

### `createDraculaFromEnv(): Promise<{ dracula: Dracula; close: () => Promise<void> }>`

Create a `Dracula` instance and associated cleanup function based on environment variables.

- `DRACULA_DB_ENGINE` – selects `'mongo'` (default) or `'sqlite'`.
- For the Mongo engine, reads `DRACULA_MONGO_CONNECTION`, `DRACULA_MONGO_DATABASE`, and `DRACULA_MONGO_COLLECTION`.

This is the recommended entrypoint for most applications.

---

## Storage engines

Dracula is designed around a small `CounterStore` interface, which lets you plug in different backends without changing application code.

### MongoDB (built-in)

MongoDB is the primary, production-oriented engine. Internally it uses:

- `MongoCounterStore` – implements `CounterStore` using the helpers in `mongodb-functions`.
- `createMongoClient` – creates a configured `MongoClient` (Stable API v1).

The recommended way to use the Mongo engine is via `createDraculaFromEnv` with `DRACULA_DB_ENGINE` unset or set to `mongo`.

### SQLite-style (built-in, in-memory by default)

The SQLite-style engine is primarily intended for tests and local development:

- `SqliteCounterStore` – implements `CounterStore` in terms of a `SqliteDb` interface.
- `InMemorySqliteDb` – an in-memory `SqliteDb` implementation used by tests and by the `sqlite` engine option.

You can replace `InMemorySqliteDb` with a real SQLite client by providing an object that implements:

```ts path=null start=null
interface SqliteDb {
  run(sql: string, params?: unknown[]): Promise<{ lastID?: number; changes?: number }>
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>
}
```

and passing it to `new SqliteCounterStore(yourDb)`.

### Adding a new engine

To add another backend (e.g. Postgres, Redis, etc.):

1. Implement the `CounterStore` interface in a new file under `src/db/*-counter-store.ts`.
2. Optionally extend `createDraculaFromEnv` to recognize a new `DRACULA_DB_ENGINE` value and construct your store.
3. Add tests similar to the existing Mongo and SQLite suites.

---

## Low-level helpers & adapters

If you want to bypass the high-level factory and class, there are internal modules you can use directly (paths shown relative to the published package):

- `dist/db/mongodb-functions` – low-level CRUD + aggregation utilities for MongoDB
- `dist/db/mongo-counter-store` – MongoDB implementation of the `CounterStore` interface
- `dist/db/sqlite-counter-store` – SQLite-oriented implementation of `CounterStore` (requires a `SqliteDb` implementation)

These are more likely to change than the main `Dracula` + `createDraculaFromEnv` API.

---

## Project structure

- `src/index.ts` – public entrypoint, exports `Dracula` and `createDraculaFromEnv`
- `src/dracula.ts` – main `Dracula` class and core types
- `src/createDraculaFromEnv.ts` – env-driven factory selecting the storage engine
- `src/db/mongodb.ts` – MongoDB client factory
- `src/db/mongodb-functions.ts` – low-level CRUD + aggregation utilities for MongoDB
- `src/db/mongo-counter-store.ts` – Mongo-backed `CounterStore`
- `src/db/sqlite-counter-store.ts` – SQLite-backed `CounterStore` (expects a `SqliteDb`)
- `src/db/inmemory-sqlite.ts` – minimal in-memory `SqliteDb` implementation used in tests
- `src/config.ts` – environment-driven collection configuration for Mongo
- `tests/dracula.test.ts` – Jest tests for the Mongo backend (using mongodb-memory-server)
- `tests/sqlite-dracula.test.ts` – Jest tests for the SQLite-style backend

The compiled JavaScript and `.d.ts` files are emitted to `dist/`.

---

## Development

Clone the repo and install dependencies:

```bash path=null start=null
git clone https://github.com/hack3r3d/dracula.git
cd dracula
npm install
```

### Build

```bash path=null start=null
npm run build
```

This compiles the TypeScript sources in `src/` into `dist/`.

### Tests

Tests are written with **Jest** and use **mongodb-memory-server** to spin up an in-memory MongoDB instance for the Mongo backend. Environment variables are loaded via `dotenv-safe` from `.env.test`, validated against `.env.example`.

```bash path=null start=null
npm test
# or
npm run test:watch
# or
npm run test:coverage
```

For Mongo-backed tests to run:

- `DRACULA_MONGO_DATABASE` must be set and must include the substring `test`.
- `DRACULA_MONGO_COLLECTION` must be set.

The connection string (`DRACULA_MONGO_CONNECTION`) is dynamically provided by the in-memory server in tests, but is required in real Mongo usage.

SQLite-style tests use the in-memory `InMemorySqliteDb` and do not require external services.

---

## Ideas & contributions

The original motivation for Dracula came from tracking disc golf scores with rich metadata, but the model is generic enough for many event-counting problems.

Issues and pull requests are welcome—feel free to propose enhancements, new aggregation helpers, or additional examples.
