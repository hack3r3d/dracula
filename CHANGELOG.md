# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking changes

- **`compute()` filter API**
  - Changed `Dracula#compute(countOn: string)` to `Dracula#compute(filter: Record<string, unknown>)`.
  - Mongo and SQLite backends now both accept rich filter objects.
  - **Migration:**
    - Before: `await dracula.compute('test')`
    - After:  `await dracula.compute({ 'meta.test': 1 })`

- **Advanced querying semantics (SQLite)**
  - SQLite-style backend (`SqliteCounterStore`) now supports a subset of Mongo-style operators in filters: `$gt`, `$lt`, `$gte`, `$lte`, `$in`, `$nin`, `$regex`, and top-level `$or`.
  - Filtering is still done in memory for SQLite, but behavior aligns more closely with Mongo for these operators.

- **Custom error types**
  - Replaced generic `Error` throws in Mongo helper and config code with custom error subclasses:
    - `ConnectionError` (code: `E_CONNECTION`)
    - `ConfigError` (code: `E_CONFIG`)
    - `ValidationError` (code: `E_VALIDATION`)
    - `InternalError` (code: `E_INTERNAL`)
  - Error *messages* are unchanged, but the error instances are now richer and can be matched on `instanceof DraculaError` and `error.code`.

- **Exports field / public surface**
  - Added a modern `exports` map to `package.json` and discourage importing from `dracula/dist/...`.
  - Supported public entrypoints:
    - `dracula` – main API (`Dracula`, `createDraculaFromEnv`, types, error classes).
    - `dracula/config` – `collectionConfig`, `getEnv`.
    - `dracula/db/mongodb` – `createMongoClient`.
    - `dracula/db/mongo-counter-store` – `MongoCounterStore`.
    - `dracula/db/sqlite-counter-store` – `SqliteCounterStore` and `SqliteDb` type.
    - `dracula/errors` – error classes and `DraculaErrorCode`.
  - **Migration:** replace imports like `dracula/dist/db/mongodb` with the corresponding exported subpaths above.

### Added

- **SQLite file-backed engine via `better-sqlite3`**
  - When `DRACULA_DB_ENGINE=sqlite` and `DRACULA_SQLITE_FILE` is set, Dracula uses `BetterSqliteDb` + `SqliteCounterStore` against a real SQLite file.
  - When `DRACULA_SQLITE_FILE` is not set, the in-memory SQLite implementation is used (existing behavior).

- **CRUD by ID operations**
  - New methods on `Dracula` and `CounterStore`:
    - `getById(id)` – fetch a single counter by store-specific ID.
    - `update(id, updates)` – partial update by ID.
    - `delete(id)` – delete a single record by ID.
  - Implemented for both Mongo (`ObjectId`) and SQLite (integer primary key).

- **Performance tests**
  - `tests/perf-sqlite-dracula.test.ts` benchmarks `create` + `compute` for sizes 10, 100, 1k, 10k, 100k using the SQLite-style backend.
  - Includes a concurrent `create` test and basic memory-usage logging for regression tracking.

### Changed

- **Type sharing and public exports**
  - Introduced `src/types.ts` as the canonical home for `Counter`, `CounterInput`, `CounterMeta`, and `PaginationOptions`.
  - These types are now exported from the main entrypoint for consumers.

- **Config and Mongo client behavior**
  - `getEnv` throws `ConfigError` instead of a generic `Error` when required env vars are missing.
  - `createMongoClient` throws `ConnectionError` when `DRACULA_MONGO_CONNECTION` is missing.

### Migration summary

- Update any usage of `compute('test')` to `compute({ 'meta.test': 1 })`.
- Replace imports from `dracula/dist/...` with the new exported subpaths (`dracula`, `dracula/config`, `dracula/db/*`, `dracula/errors`).
- When catching errors from Dracula, consider handling based on `instanceof DraculaError` and `error.code`.

## [1.0.0] - Initial release

- Initial public release of Dracula as a fancy counter with pluggable storage backends (MongoDB and SQLite-style).
