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
 * the countOn value needs to exist in the meta object. 
 * 
 * @param {MongoClient} client 
 * @param {String} countOn meta field to match on
 * @returns int
 */
const compute = async (client, countOn) => {
  const database = client.db(process.env.MONGO_DATABASE)
  const cursor = database.collection(process.env.MONGO_COLLECTION)
  const agg = [ 
    {
      $match: {
        ["meta." + countOn]: {$eq: 1}
      }
    },
    {
         $group:
           {
             _id: `$meta.${countOn}`,
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
/**
 * This deletes all of the data from the collection. Obviously, you will want to be smart about
 * calling this method in your application because it DELETE ALL OF THE DATA FROM THE COLLECTION
 * 
 * @param {MongoCli} client 
 */
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
