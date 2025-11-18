import type { CollectionConfig } from './db/mongodb-functions'
import { ConfigError } from './errors'

const getEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new ConfigError(`${name} is required`)
  }
  return value
}

/**
 * Lazily constructs the collection config from environment variables.
 * Only called when the Mongo engine is actually used.
 */
export const getCollectionConfig = (): CollectionConfig => {
  return {
    dbName: getEnv('DRACULA_MONGO_DATABASE'),
    collectionName: getEnv('DRACULA_MONGO_COLLECTION'),
  }
}

/**
 * @deprecated Use getCollectionConfig() instead. This will be removed in a future version.
 */
export const collectionConfig: CollectionConfig = {
  get dbName() {
    return getEnv('DRACULA_MONGO_DATABASE')
  },
  get collectionName() {
    return getEnv('DRACULA_MONGO_COLLECTION')
  },
}

export { getEnv }
