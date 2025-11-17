import { MongoClient, ServerApiVersion } from 'mongodb'

export const createMongoClient = (uri: string | undefined): MongoClient => {
  if (!uri) {
    throw new Error('DRACULA_MONGO_CONNECTION is required')
  }

  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  })
}

const client = createMongoClient(process.env.DRACULA_MONGO_CONNECTION)

export default client
