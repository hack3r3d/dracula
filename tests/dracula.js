const assert = require('assert')
require("dotenv-safe").config({ path: '.env.test', example: '.env.example' })
//require("dotenv-safe").config()

const Dracula = require('../dracula.js')
const client = require('../db/mongodb.js')
const {ObjectId} = require('mongodb')

beforeEach(async () => {
    try {
        if (process.env.MONGO_DATABASE.search(/test/) < 0) {
            console.error('You can not run these tests on database that does not include "test" in the name.')
            process.exit(1)
        }
        await client.connect()
    } catch (ex) {
        new Error(ex)
    }
})
afterEach(async () => {
    const d = new Dracula()
    await d.deleteAll(client)
    await client.close()
})
describe('Dracula', () => {
    describe('#create', () => {
        it('success', async() => {
            const dracula = new Dracula()
            const counter = { count: 0, createdAt: new Date(), meta: {test: 1} }
            const res = await dracula.create(client, counter)
            const insertId = res.insertedId
            assert.equal(ObjectId.isValid(insertId), true)
            const counter1 = { count: 1, createdAt: new Date(), meta: {test: 1} }
            const res1 = await dracula.create(client, counter1)
            const insertId1 = res1.insertedId
            assert.equal(ObjectId.isValid(insertId1), true)
            const countRes = await dracula.compute(client, "test")
            assert.equal(2, countRes)
        })
    })
    // describe('#read', () => {
    //     it('success', async() => {
            // const dracula = new Dracula()
            // const counter = { count: 0, createdAt: new Date(), meta: {test: 1} }
            // const res = await dracula.create(client, counter)
            // const insertId = res.insertedId
            // assert.equal(ObjectId.isValid(insertId), true)
    //     })
    // })
})
