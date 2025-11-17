"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMongoClient = void 0;
const mongodb_1 = require("mongodb");
const createMongoClient = (uri) => {
    if (!uri) {
        throw new Error('DRACULA_MONGO_CONNECTION is required');
    }
    return new mongodb_1.MongoClient(uri, {
        serverApi: {
            version: mongodb_1.ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });
};
exports.createMongoClient = createMongoClient;
const client = (0, exports.createMongoClient)(process.env.DRACULA_MONGO_CONNECTION);
exports.default = client;
