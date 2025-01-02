const _ = require("lodash")

const create = async (client, counter) => {
  const database = client.db(process.env.MONGO_DATABASE)
  const cursor = database.collection(process.env.MONGO_COLLECTION)
  counter.createdAt = new Date()
  return await cursor.insertOne(counter)
}

const read = async (client, collatorId, position = null) => {
  const database = client.db(process.env.MONGO_DATABASE)
  const cursor = database.collection(process.env.MONGO_COLLECTION)
  const found = await cursor.find(collatorId)
  return found
}

module.exports = {
  create,
  read
}
