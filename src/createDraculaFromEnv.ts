import Dracula from './dracula'
import { getCollectionConfig } from './config'
import { createMongoClient } from './db/mongodb'
import { MongoCounterStore } from './db/mongo-counter-store'
import { SqliteCounterStore } from './db/sqlite-counter-store'
import { InMemorySqliteDb } from './db/inmemory-sqlite'
import { BetterSqliteDb } from './db/better-sqlite-db'

export type DraculaEngine = 'mongo' | 'sqlite'

export interface DraculaFromEnv {
  dracula: Dracula
  close: () => Promise<void>
}

export const resolveEngineFromEnv = (): DraculaEngine => {
  const engine = process.env.DRACULA_DB_ENGINE?.toLowerCase()
  if (engine === 'sqlite') return 'sqlite'
  return 'mongo'
}

/**
 * Factory that creates a Dracula instance based on environment variables.
 *
 * - DRACULA_DB_ENGINE:
 *   - 'mongo' (default): use MongoDB with DRACULA_MONGO_* env vars.
 *   - 'sqlite': use an in-memory SQLite-like store (InMemorySqliteDb).
 *
 * For MongoDB, callers are responsible for ensuring the DRACULA_MONGO_* env
 * vars are set appropriately.
 */
export const createDraculaFromEnv = async (): Promise<DraculaFromEnv> => {
  const engine = resolveEngineFromEnv()

  if (engine === 'sqlite') {
    const sqliteFile = process.env.DRACULA_SQLITE_FILE

    if (sqliteFile) {
      const db = new BetterSqliteDb(sqliteFile)
      const store = new SqliteCounterStore(db)
      const dracula = new Dracula(store)

      const close = async () => {
        db.close()
      }

      return { dracula, close }
    }

    const db = new InMemorySqliteDb()
    const store = new SqliteCounterStore(db)
    const dracula = new Dracula(store)

    const close = async () => {
      // Nothing to clean up for in-memory implementation.
    }

    return { dracula, close }
  }

  const uri = process.env.DRACULA_MONGO_CONNECTION
  const client = createMongoClient(uri)
  await client.connect()

  const store = new MongoCounterStore(client, getCollectionConfig())
  const dracula = new Dracula(store)

  const close = async () => {
    await client.close()
  }

  return { dracula, close }
}
