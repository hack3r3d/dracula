import type { CollectionConfig } from './db/mongodb-functions'

const getEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export const collectionConfig: CollectionConfig = {
  dbName: getEnv('DRACULA_MONGO_DATABASE'),
  collectionName: getEnv('DRACULA_MONGO_COLLECTION'),
}

export { getEnv }
