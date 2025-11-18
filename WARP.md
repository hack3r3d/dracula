# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This repo is a small Node.js package that implements a "fancy counter" with a pluggable storage backend. It exposes a `Dracula` class as the main API and ships with:

- A MongoDB-backed implementation (production-oriented)
- A SQLite-style in-memory implementation (for tests/experiments)

The public entrypoint is `src/index.ts` / `dist/index.js`, which:

- Exports `Dracula` as the default export
- Exports `createDraculaFromEnv` and helpers for env-driven configuration

Key files:
- `src/index.ts`: public entrypoint exporting `Dracula` and `createDraculaFromEnv`.
- `src/dracula.ts`: main `Dracula` class built around a `CounterStore` interface.
- `src/createDraculaFromEnv.ts`: factory that selects the storage engine from env vars.
- `src/db/mongodb.ts`: MongoDB `MongoClient` factory.
- `src/db/mongodb-functions.ts`: low-level MongoDB persistence and aggregation helpers used by the Mongo store implementation.
- `src/db/mongo-counter-store.ts`: MongoDB-backed `CounterStore` implementation.
- `src/db/sqlite-counter-store.ts`: SQLite-oriented `CounterStore` implementation (expects a `SqliteDb`).
- `src/db/inmemory-sqlite.ts`: minimal in-memory `SqliteDb` used in tests.
- `tests/dracula.test.ts`: Jest suite covering MongoDB behavior end-to-end.
- `tests/sqlite-dracula.test.ts`: Jest suite covering the SQLite-style behavior and the env-based factory.

## Commands

All commands assume you run them from the repository root.

### Install dependencies

```bash path=null start=null
npm install
```

### Run the full test suite

Jest is configured via `jest.config.cjs` to run all `*.test.ts` files.

```bash path=null start=null
npm test
```

Tests expect environment configuration loaded by `dotenv-safe` from `.env.test` (validated against `.env.example`). For the Mongo-backed tests:

- `DRACULA_MONGO_DATABASE` must be set and must include the substring `test`.
- `DRACULA_MONGO_COLLECTION` must be set.

`DRACULA_MONGO_CONNECTION` is provided dynamically by `mongodb-memory-server` in the tests themselves.

### Using the library in a Node REPL or another project

The main API is the `Dracula` class plus the `createDraculaFromEnv` factory exported from `dist/index.js`.

Example REPL session using the Mongo engine explicitly:

```js path=null start=null
const { createMongoClient } = require('./dist/db/mongodb')
const { collectionConfig } = require('./dist/config')
const { MongoCounterStore } = require('./dist/db/mongo-counter-store')
const Dracula = require('./dist').default

;(async () => {
  const client = createMongoClient(process.env.DRACULA_MONGO_CONNECTION)
  await client.connect()

  const store = new MongoCounterStore(client, collectionConfig)
  const d = new Dracula(store)

  const counter = { count: 0, meta: { test: 1 } }
  const res = await d.create(counter)
  console.log(res.insertedId)

  await d.deleteAll()
  await client.close()
})()
```

Example REPL session using the env-based factory:

```js path=null start=null
const { createDraculaFromEnv } = require('./dist')

;(async () => {
  // DRACULA_DB_ENGINE controls which backend is selected ('mongo' or 'sqlite').
  const { dracula, close } = await createDraculaFromEnv()

  const counter = { count: 0, meta: { test: 1 } }
  const res = await dracula.create(counter)
  console.log(res.insertedId)

  await dracula.deleteAll()
  await close()
})()
```

## Architecture and data model

### High-level structure

- **Public API layer (`src/dracula.ts`, `src/index.ts`)**
  - Defines the `Dracula` class, which depends on an abstract `CounterStore` interface instead of a specific database.
  - The package also exports `createDraculaFromEnv`, which selects a concrete `CounterStore` based on env vars:
    - `DRACULA_DB_ENGINE` – `'mongo'` (default) or `'sqlite'`.
    - For Mongo, additional `DRACULA_MONGO_*` env vars are used.
  - `Dracula` is constructed with a `CounterStore`, and its methods operate on that preconfigured context:
    - `create(counter)`: inserts a new counter record.
    - `get(filter)`: reads records via the store and returns a materialized array of matching counters.
    - `count(counter)`: alias that simply calls `create`.
    - `compute(countOn)`: computes an aggregate count over matching records.
    - `deleteAll()`: clears the underlying store.

- **MongoDB helpers and store (`src/db/mongodb*.ts`)**
  - `src/db/mongodb.ts` exports a `createMongoClient` helper (MongoDB Stable API v1).
  - `src/db/mongodb-functions.ts` encapsulates MongoDB collection interactions:
    - `create(client, config, counter)`
      - Normalizes input, sets `createdAt` if missing, then performs `insertOne`.
    - `read(client, config, filter)`
      - Performs `find(filter)` and returns a **materialized array of matching counter documents**.
    - `compute(client, config, countOn)`
      - Runs an aggregation pipeline:
        - `$match` documents where `meta[countOn] === 1`.
        - `$group` by `meta[countOn]` and compute `count: { $sum: 1 }`.
      - Returns the aggregated count or `0`.
    - `deleteAll(client, config)`
      - Issues `deleteMany({})` against the configured collection, wiping all documents.
  - `src/db/mongo-counter-store.ts` adapts these helpers to the `CounterStore` interface.

- **SQLite-style helpers and store (`src/db/sqlite-counter-store.ts`)**
  - Defines a minimal `SqliteDb` interface and a `SqliteCounterStore` implementation of `CounterStore`.
  - Persists counters into a simple `counters` table with `count`, `created_at`, and JSON-serialized `meta`.
  - `src/db/inmemory-sqlite.ts` provides an in-memory `SqliteDb` implementation used in tests and for quick experiments.

### Testing strategy

- Tests are written with **Jest** (`ts-jest` preset, see `jest.config.cjs`).
- Mongo-backed tests (`tests/dracula.test.ts`):
  - Use `mongodb-memory-server` to spin up an in-memory MongoDB instance.
  - Configure `DRACULA_MONGO_CONNECTION` dynamically from the in-memory server.
  - Use `DRACULA_MONGO_DATABASE` and `DRACULA_MONGO_COLLECTION` from `.env.test` (with the database name required to include `test`).
- SQLite-style tests (`tests/sqlite-dracula.test.ts`):
  - Use `InMemorySqliteDb` + `SqliteCounterStore` to exercise the same `Dracula` API without external services.
  - Also cover the `createDraculaFromEnv` factory when `DRACULA_DB_ENGINE=sqlite`.

`dotenv-safe` ensures that required env vars exist and match the schema described in `.env.example`.

## How future agents should interact with this repo

- When adding new counter-related behavior, prefer to:
  - Keep the `Dracula` class as the main public API surface and delegate new persistence logic to store implementations that satisfy the `CounterStore` interface.
  - Avoid creating new `MongoClient` instances in multiple places; reuse the factory in `src/db/mongodb.ts` and pass clients and configs explicitly.
- When adding new storage backends:
  - Implement `CounterStore` for the new backend in `src/db/*-counter-store.ts`.
  - Keep the `CounterStore` interface small and focused so adapters stay simple.
  - Optionally extend `createDraculaFromEnv` to support a new `DRACULA_DB_ENGINE` value.
- When expanding tests:
  - Follow the existing Jest structure in `tests/*.test.ts`.
  - For Mongo-backed tests, reuse the `mongodb-memory-server` pattern and respect the `DRACULA_MONGO_DATABASE` "must include test" guard.
  - For non-Mongo stores, add tests similar to `tests/sqlite-dracula.test.ts` that exercise the `Dracula` API via the new store implementation.
