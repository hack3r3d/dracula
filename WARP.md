# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This repo is a small Node.js package that implements a "fancy counter" backed by MongoDB. It exposes a single `Dracula` class as the main API and uses Mocha for integration-style tests against a real MongoDB database.

Key files:
- `dracula.js`: main entrypoint exporting the `Dracula` class.
- `db/mongodb.js`: shared MongoDB `MongoClient` instance configured via environment variables.
- `db/mongodb-functions.js`: low-level persistence and aggregation helpers used by `Dracula`.
- `tests/dracula.js`: Mocha test suite exercising the main counter behavior end-to-end.

## Commands

All commands assume you run them from the repository root.

### Install dependencies

```bash path=null start=null
npm install
```

### Run the full test suite

Mocha is configured via the `test` script in `package.json` to run all tests under `tests/*.js`.

```bash path=null start=null
npm test
```

Tests expect a MongoDB instance and test-specific environment configuration:
- `tests/dracula.js` loads env vars from `.env.test` using `dotenv-safe`, with `.env.example` as the schema.
- Ensure your `.env.test` points to a MongoDB database whose name includes the substring `test`; otherwise the test suite will abort.

### Run a single test file or customize Mocha invocation

To focus on a single test file or adjust Mocha flags, call Mocha directly instead of going through `npm test`:

```bash path=null start=null
npx mocha tests/dracula.js --timeout=99999
```

You can substitute `tests/dracula.js` with any other test file path if more tests are added later.

### Using the library in a Node REPL or another project

The main API is the `Dracula` class exported from `dracula.js`:

```bash path=null start=null
node
```

Then in the REPL (or in your own code):

```js path=null start=null
const Dracula = require('./dracula').default
const client = require('./db/mongodb').default
const { collectionConfig } = require('./config')

;(async () => {
  await client.connect()
  const d = new Dracula(client, collectionConfig)
  const counter = { count: 0, meta: { test: 1 } }
  const res = await d.create(counter)
  console.log(res.insertedId)
  await d.deleteAll()
  await client.close()
})()
```

This mirrors the pattern used by the test suite: a shared, preconfigured `MongoClient` and collection config are passed into the `Dracula` constructor, and instance methods operate on that configuration.

## Architecture and data model

### High-level structure

- **Public API layer (`dracula.js`)**
  - Defines the `Dracula` class, which acts as a thin facade over lower-level MongoDB helper functions.
  - `Dracula` is constructed with a connected `MongoClient` and a `CollectionConfig` (database + collection name), and its methods operate on that preconfigured context:
    - `create(counter)`: inserts a new counter document.
    - `get(collatorId)`: reads documents via `read` and returns a materialized array of matching counters.
    - `count(counter)`: alias that simply calls `create`.
    - `compute(countOn)`: computes an aggregate count over matching documents.
    - `deleteAll()`: clears the configured collection.

- **Database helpers (`db/mongodb.js`, `db/mongodb-functions.js`)**
  - `db/mongodb.js` exports a configured `MongoClient` instance using:
    - `MONGO_CONNECTION` — MongoDB connection URI.
    - The client is constructed with the MongoDB Stable API (v1) and exported for reuse.
  - `db/mongodb-functions.js` encapsulates all MongoDB collection interactions, using envvars to select the database/collection:
    - `MONGO_DATABASE` — database name (must contain `test` when running the test suite).
    - `MONGO_COLLECTION` — collection name where counter documents are stored.
  - Functions:
    - `create(client, counter)`
      - Sets `counter.createdAt = new Date()` before inserting.
      - Inserts into `MONGO_COLLECTION` and returns the `insertOne` result.
    - `read(client, collatorId)`
      - Performs `find(collatorId)` and returns a **materialized array of matching counter documents**.
    - `compute(client, countOn)`
      - Runs an aggregation pipeline:
        - `$match` documents where `meta[countOn] === 1`.
        - `$group` by `meta[countOn]` and compute `count: { $sum: 1 }`.
      - Reads the first aggregation result and returns `res.count`.
      - This is used to count how many counter records match a particular metadata flag.
    - `deleteAll(client)`
      - Issues `deleteMany({})` against the configured collection, wiping all documents.

### Testing strategy

- Tests in `tests/dracula.js` are **integration-style**:
  - They use the same `MongoClient` (`db/mongodb.js`) and `Dracula` class as consumers would.
  - `beforeEach` connects to MongoDB and asserts `MONGO_DATABASE` contains the substring `test` to prevent accidental use of a non-test database.
  - `afterEach` creates a `Dracula` instance, calls `deleteAll(client)` to clear the collection, then closes the client.
- The primary test currently covers the `create` + `compute` flow:
  - Inserts two counter documents with `meta: { test: 1 }` and asserts:
    - MongoDB returns valid `ObjectId`s for each insert.
    - `compute(client, "test")` returns `2`.

### Environment and configuration expectations

The code relies on the following environment variables, typically provided by `.env.test` (and validated against `.env.example` when running tests):

- `MONGO_CONNECTION`: MongoDB connection URI (used in `db/mongodb.js`).
- `MONGO_DATABASE`: target database name (must contain `test` when running tests).
- `MONGO_COLLECTION`: name of the collection storing counter documents.

`dotenv-safe` ensures that the required variables are defined and match the schema described in `.env.example`.

## How future agents should interact with this repo

- When adding new counter-related behavior, prefer to:
  - Keep the `Dracula` class as the public API surface and delegate new persistence logic to `db/mongodb-functions.js`.
  - Pass the `MongoClient` explicitly into methods rather than creating new clients in multiple places, to stay consistent with the existing pattern and tests.
- When expanding tests:
  - Follow the existing Mocha structure in `tests/dracula.js` with `beforeEach`/`afterEach` managing connection and cleanup.
  - Reuse the shared `MongoClient` from `db/mongodb.js` and respect the `MONGO_DATABASE` "must include test" guard.
