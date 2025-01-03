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

/**
 * this method calculates the total count for records that match the countOn param
 * 
 * @param {MongoClient} client 
 * @param {*} countOn 
 * @returns 
 */
const compute = async (client, countOn) => {
  const database = client.db(process.env.MONGO_DATABASE)
  const cursor = database.collection(process.env.MONGO_COLLECTION)
  const agg = [ 
    {
      $match: {
        [countOn]: {$eq: 1}
      }
    },
    {
         $group:
           {
             _id: `"$${countOn}"`,
             count: { $sum: 1 }
           }
    }
  ]
  const found = await cursor.aggregate(
    agg  
  )
  res = await found.next()
  return res.count
}

const deleteAll = async (client) => {
  const database = client.db(process.env.MONGO_DATABASE)
  const cursor = database.collection(process.env.MONGO_COLLECTION)
  await cursor.deleteMany({})
}

module.exports = {
  create,
  read,
  compute,
  deleteAll
}
