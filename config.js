"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = exports.collectionConfig = void 0;
const getEnv = (name) => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
};
exports.getEnv = getEnv;
exports.collectionConfig = {
    dbName: getEnv('DRACULA_MONGO_DATABASE'),
    collectionName: getEnv('DRACULA_MONGO_COLLECTION'),
};
