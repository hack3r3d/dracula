import { MongoClient, ServerApiVersion } from 'mongodb'
import { ConnectionError } from '../errors'

export const createMongoClient = (uri: string | undefined): MongoClient => {
  if (!uri) {
    throw new ConnectionError('DRACULA_MONGO_CONNECTION is required')
  }

  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  })
}
