import * as qs from 'qs'
import {
  MultipartRequestData,
  NarviResourceObject,
  RequestArgs,
  RequestData,
  RequestHeaders,
  UrlInterpolator,
} from '../Types'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { KeyObject } from 'crypto'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsonStringify = require('json-stable-stringify')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const isEmpty = require('lodash.isempty')

const OPTIONS_KEYS = [
  'apiKey',
  'idempotencyKey',
  'narviAccount',
  'apiVersion',
  'maxNetworkRetries',
  'timeout',
  'host',
]

type Settings = {
  timeout?: number
  maxNetworkRetries?: number
}

type Options = {
  auth: string | null
  host: string | null
  settings: Settings
  streaming?: boolean
  headers: Record<string, unknown>
}

export function isOptionsHash(o: unknown): boolean | unknown {
  return (
      o &&
      typeof o === 'object' &&
      OPTIONS_KEYS.some((prop) => Object.prototype.hasOwnProperty.call(o, prop))
  )
}

/**
 * Stringifies an Object, accommodating nested objects
 * (forming the conventional key 'parent[child]=value')
 */
export function stringifyRequestData(
    data: RequestData | string,
    hasPayload: boolean,
): string {
  if (isEmpty(data)) {
    // REGULAR GET REQUEST
    return ''
  }

  if (!hasPayload) {
    // GET REQUEST WITH QUERY STRING
    return (
        qs
            .stringify(data, {
              serializeDate: (d: Date) => Math.floor(d.getTime() / 1000).toString(),
            })
            // Don't use strict form encoding by changing the square bracket control
            // characters back to their literals. This is fine by the server, and
            // makes these parameter strings easier to read.
            .replace(/%5B/g, '[')
            .replace(/%5D/g, ']')
    )
  }

  // POST PUT PATCH Requests
  return jsonStringify(data)
}

/**
 * Outputs a new function with interpolated object property values.
 * Use like so:
 *   const fn = makeURLInterpolator('some/url/{param1}/{param2}');
 *   fn({ param1: 123, param2: 456 }); // => 'some/url/123/456'
 */
export const makeURLInterpolator = ((): ((s: string) => UrlInterpolator) => {
  const rc = {
    '\n': '\\n',
    '"': '\\"',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
  } as Record<string, string>
  return (str: string): UrlInterpolator => {
    const cleanString = str.replace(/["\n\r\u2028\u2029]/g, ($0) => rc[$0])
    return (outputs: Record<string, unknown>): string => {
      return cleanString.replace(/\{([\s\S]+?)\}/g, ($0, $1) =>
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          encodeURIComponent(outputs[$1] || ''),
      )
    }
  }
})()

export function extractUrlParams(path: string): Array<string> {
  const params = path.match(/\{\w+\}/g)
  if (!params) {
    return []
  }

  return params.map((param) => param.replace(/[{}]/g, ''))
}

/**
 * Return the data argument from a list of arguments
 *
 * @param {object[]} args
 * @returns {object}
 */
export function getDataFromArgs(args: RequestArgs): RequestData {
  if (!Array.isArray(args) || !args[0] || typeof args[0] !== 'object') {
    return {}
  }

  if (!isOptionsHash(args[0])) {
    return args.shift()
  }

  const argKeys = Object.keys(args[0])

  const optionKeysInArgs = argKeys.filter((key) => OPTIONS_KEYS.includes(key))

  // In some cases options may be the provided as the first argument.
  // Here we're detecting a case where there are two distinct arguments
  // (the first being args and the second options) and with known
  // option keys in the first so that we can warn the user about it.
  if (
      optionKeysInArgs.length > 0 &&
      optionKeysInArgs.length !== argKeys.length
  ) {
    emitWarning(
        `Options found in arguments (${optionKeysInArgs.join(
            ', ',
        )}). Did you mean to pass an options object? See passing-options paragraph in our README..`,
    )
  }

  return {}
}

/**
 * Return the options hash from a list of arguments
 */
export function getOptionsFromArgs(args: RequestArgs): Options {
  const opts: Options = {
    auth: null,
    host: null,
    headers: {},
    settings: {},
  }
  if (args.length > 0) {
    const arg = args[args.length - 1]
    if (typeof arg === 'string') {
      opts.auth = args.pop() as string
    } else if (isOptionsHash(arg)) {
      const params = { ...(args.pop() as Record<string, unknown>) }

      const extraKeys = Object.keys(params).filter(
          (key) => !OPTIONS_KEYS.includes(key),
      )

      if (extraKeys.length) {
        emitWarning(
            `Invalid options found (${extraKeys.join(', ')}); ignoring.`,
        )
      }

      if (params.apiKey) {
        opts.auth = params.apiKey as string
      }
      if (params.idempotencyKey) {
        opts.headers['Idempotency-Key'] = params.idempotencyKey
      }
      if (params.narviAccount) {
        opts.headers['Narvi-Account'] = params.narviAccount
      }
      if (params.apiVersion) {
        opts.headers['Narvi-Version'] = params.apiVersion
      }
      if (Number.isInteger(params.maxNetworkRetries)) {
        opts.settings.maxNetworkRetries = params.maxNetworkRetries as number
      }
      if (Number.isInteger(params.timeout)) {
        opts.settings.timeout = params.timeout as number
      }
      if (params.host) {
        opts.host = params.host as string
      }
    }
  }
  return opts
}

/**
 * Remove empty values from an object
 */
export function removeNullish<T extends Record<string, unknown>>(obj: T): T {
  if (typeof obj !== 'object') {
    throw new Error('Argument must be an object')
  }

  return Object.keys(obj).reduce<Record<string, unknown>>((result, key) => {
    if (obj[key] !== null) {
      result[key] = obj[key]
    }
    return result
  }, {}) as T
}

/**
 * Normalize standard HTTP Headers:
 * {'foo-bar': 'hi'}
 * becomes
 * {'Foo-Bar': 'hi'}
 */
export function normalizeHeaders(
    obj: RequestHeaders | null,
): RequestHeaders | null {
  if (!(obj && typeof obj === 'object')) {
    return obj
  }

  return Object.keys(obj).reduce<RequestHeaders>((result, header) => {
    result[normalizeHeader(header)] = obj[header]
    return result
  }, {})
}

/**
 * Stolen from https://github.com/marten-de-vries/header-case-normalizer/blob/master/index.js#L36-L41
 * without the exceptions which are irrelevant to us.
 */
export function normalizeHeader(header: string): string {
  return header
      .split('-')
      .map((text) => text.charAt(0).toUpperCase() + text.substr(1).toLowerCase())
      .join('-')
}

export function callbackifyPromiseWithTimeout<T>(
    promise: Promise<T>,
    callback: ((error: unknown, result: T | null) => void) | null,
): Promise<T | void> {
  if (callback) {
    // Ensure callback is called outside of promise stack.
    return promise.then(
        (res) => {
          setTimeout(() => {
            callback(null, res)
          }, 0)
        },
        (err) => {
          setTimeout(() => {
            callback(err, null)
          }, 0)
        },
    )
  }

  return promise
}

/**
 * Allow for special capitalization cases (such as OAuth)
 */
export function pascalToCamelCase(name: string): string {
  if (name === 'OAuth') {
    return 'oauth'
  } else {
    return name[0].toLowerCase() + name.substring(1)
  }
}

export function emitWarning(warning: string): void {
  if (typeof process.emitWarning !== 'function') {
    return console.warn(
        `Narvi: ${warning}`,
    ) /* eslint-disable-line no-console */
  }

  return process.emitWarning(warning, 'Narvi')
}

export function isObject(obj: unknown): boolean {
  const type = typeof obj
  return (type === 'function' || type === 'object') && !!obj
}

// For use in multipart requests
export function flattenAndStringify(
    data: MultipartRequestData,
): Record<string, string | Uint8Array> {
  const result: Record<string, string | Uint8Array> = {}

  const step = (obj: MultipartRequestData, prevKey: string | null): void => {
    Object.keys(obj).forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const value = obj[key]

      const newKey = prevKey ? `${prevKey}[${key}]` : key

      if (isObject(value)) {
        if (
            !(value instanceof Uint8Array) &&
            !Object.prototype.hasOwnProperty.call(value, 'data')
        ) {
          // Non-buffer non-file Objects are recursively flattened
          return step(value, newKey)
        } else {
          // Buffers and file objects are stored without modification
          result[newKey] = value
        }
      } else {
        // Primitives are converted to strings
        result[newKey] = String(value)
      }
    })
  }

  step(data, null)

  return result
}

export function validateInteger(
    name: string,
    n: unknown,
    defaultVal?: number,
): number {
  if (!Number.isInteger(n)) {
    if (defaultVal !== undefined) {
      return defaultVal
    } else {
      throw new Error(`${name} must be an integer`)
    }
  }

  return n as number
}

export function determineProcessUserAgentProperties(): Record<string, string> {
  return typeof process === 'undefined'
      ? {}
      : {
        lang_version: process.version,
        platform: process.platform,
      }
}

/**
 * Joins an array of Uint8Arrays into a single Uint8Array
 */
export function concat(arrays: Array<Uint8Array>): Uint8Array {
  const totalLength = arrays.reduce((len, array) => len + array.length, 0)
  const merged = new Uint8Array(totalLength)

  let offset = 0
  arrays.forEach((array) => {
    merged.set(array, offset)
    offset += array.length
  })

  return merged
}

export function protoExtend(
    this: any,
    sub: any,
): {
  new(...args: any[]): NarviResourceObject
} {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const Super = this
  const Constructor = Object.prototype.hasOwnProperty.call(sub, 'constructor')
      ? sub.constructor
      : function (this: NarviResourceObject, ...args: any[]): void {
        Super.apply(this, args)
      }

  // This initialization logic is somewhat sensitive to be compatible with
  // divergent JS implementations like the one found in Qt.
  Object.assign(Constructor, Super)
  Constructor.prototype = Object.create(Super.prototype)
  Object.assign(Constructor.prototype, sub)

  return Constructor
}

export function getPathFromUrl(url: string) {
  // Removes query string if present
  return url?.split('?')?.[0] || ''
}

export function getQueryFromUrl(url: string) {
  // Removes path string
  return url?.split('?')?.[1] || ''
}

export function getPaginationCursor(url: string) {
  const result = qs.parse(getQueryFromUrl(url))
  return (result?.cursor || '')
}

export function loadPrivateKeyFromFile(privateKeyFilePath: string) {
  const privatePem = fs.readFileSync(privateKeyFilePath)
  const privateKey = crypto.createPrivateKey({
    key: privatePem,
  })

  return privateKey
}

export interface SignRequestParams {
  privateKey: crypto.KeyObject
  url: string
  method: string
  requestID: string
  queryParams?: any
  payload?: any
}

export function getNarviRequestSignature(params: SignRequestParams) {
  const { privateKey, url, method, requestID, queryParams, payload } = params

  const hash_elems = [getPathFromUrl(url), method, requestID]

  if (!isEmpty(queryParams) && queryParams) {
    const queryParamsCanonical = jsonStringify(queryParams)
    hash_elems.push(queryParamsCanonical)
  }

  if (!isEmpty(payload) && payload) {
    const payloadCanonical = jsonStringify(payload)
    hash_elems.push(payloadCanonical)
  }

  const dataToHash = hash_elems.join('')
  // const dataToHash =
  //   'https://api.narvi.com/rest/v1.0/transactions/createPOST1693488172942{"account_pid":"RPUEWWNVLN04JE45","amount":1,"currency":"EUR","recipient":{"country":"PL","name":"Uncle","number":"PL61109010140000071219812874"},"remittance_information":{"ustrd":"test transfer"}}'

  const hash = crypto.createHash('sha256').update(dataToHash).digest()
  const hashHax = crypto.createHash('sha256').update(dataToHash).digest('hex')

  const signature = crypto.sign('sha256', hash, privateKey)

  const signatureString = signature.toString('base64')

  return signatureString
}

export interface GetNarviRequestHeadersParams {
  apiKeyId: string
  requestID: string
  signature: string
}

export function getNarviRequestHeaders(params: GetNarviRequestHeadersParams) {
  const { apiKeyId, requestID, signature } = params

  return ({
    'API-KEY-ID': apiKeyId,
    'API-REQUEST-ID': requestID,
    'API-REQUEST-SIGNATURE': signature,
    'Content-Type': 'application/json',
  })
}

export interface GetNarviSignaturePayloadParams {
  privateKey: KeyObject
  url: string
  method: string
  requestID: string
  queryParams?: RequestData
  payload?: RequestData
}

export function getNarviRequestSignaturePayload (params: GetNarviSignaturePayloadParams) {
  const {
    privateKey,
    url,
    method,
    requestID,
    queryParams,
    payload,
  } = params

  return ({
    privateKey,
    url,
    method,
    requestID,
    queryParams,
    payload: isEmpty(payload) ? undefined : payload
  })
}
