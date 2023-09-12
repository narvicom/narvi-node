// File generated from our OpenAPI spec

import { NarviResource } from '../NarviResource'

const narviMethod = NarviResource.method

export const Accounts = NarviResource.extend({
  retrieve: narviMethod({
    method: 'GET',
    fullPath: '/rest/v1.0/account/retrieve/{accountId}',
  }),
  list: narviMethod({
    method: 'GET',
    methodType: 'list',
    fullPath: '/rest/v1.0/account/list',
  }),
})
