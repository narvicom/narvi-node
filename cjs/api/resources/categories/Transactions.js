"use strict";
// File generated from our OpenAPI spec
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transactions = void 0;
const NarviResource_1 = require("../NarviResource");
const narviMethod = NarviResource_1.NarviResource.method;
exports.Transactions = NarviResource_1.NarviResource.extend({
    create: narviMethod({
        method: 'POST',
        fullPath: '/rest/v1.0/transactions/create',
    }),
    retrieve: narviMethod({
        method: 'GET',
        fullPath: '/rest/v1.0/transactions/retrieve/{transactionId}',
    }),
    list: narviMethod({
        method: 'GET',
        methodType: 'list',
        fullPath: '/rest/v1.0/transactions/list',
    }),
});
