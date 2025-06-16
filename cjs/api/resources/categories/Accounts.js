"use strict";
// File generated from our OpenAPI spec
Object.defineProperty(exports, "__esModule", { value: true });
exports.Accounts = void 0;
const NarviResource_1 = require("../NarviResource");
const narviMethod = NarviResource_1.NarviResource.method;
exports.Accounts = NarviResource_1.NarviResource.extend({
    retrieve: narviMethod({
        method: 'GET',
        fullPath: '/rest/v1.0/account/retrieve/{accountId}',
    }),
    list: narviMethod({
        method: 'GET',
        methodType: 'list',
        fullPath: '/rest/v1.0/account/list',
    }),
});
