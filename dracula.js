const {create, read, compute, deleteAll} = require('./db/mongodb-functions.js')

/**
 * dracula.js is a fancy counter.
 * 
 * What you can do with dracula is create counters with meta data attached.
 */
class Dracula {
    create = async (client, counter) => {
        return await create(client, counter)
    }

    get = async (client, collatorId, position = null) => {
        return await read(client, collatorId, position)
    }

    count = async (client, counter) => {
        return await this.create(client, counter)
    }

    compute = async (client, countOn) => {
        return await compute(client, countOn)
    }

    deleteAll = async(client) => {
        return await deleteAll(client)
    }
}

module.exports = Dracula
