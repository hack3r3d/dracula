"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_functions_1 = require("./db/mongodb-functions");
/**
 * Dracula is a fancy counter.
 *
 * It lets you create counters with metadata attached and compute aggregates
 * over those counters using MongoDB as the backing store.
 */
class Dracula {
    constructor(client, config) {
        this.client = client;
        this.config = config;
    }
    async create(counter) {
        return (0, mongodb_functions_1.create)(this.client, this.config, counter);
    }
    async get(collatorId) {
        return (0, mongodb_functions_1.read)(this.client, this.config, collatorId);
    }
    async count(counter) {
        return this.create(counter);
    }
    async compute(countOn) {
        return (0, mongodb_functions_1.compute)(this.client, this.config, countOn);
    }
    async deleteAll() {
        return (0, mongodb_functions_1.deleteAll)(this.client, this.config);
    }
}
exports.default = Dracula;
