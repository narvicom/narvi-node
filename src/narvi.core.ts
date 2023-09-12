import * as apiVersion from './api/apiVersion'
import { RequestSender } from './api/requests/RequestSender'
import {
  determineProcessUserAgentProperties,
  validateInteger,
  pascalToCamelCase,
  loadPrivateKeyFromFile,
  getPaginationCursor,
} from './utils/utils'
import * as resources from './api/resources/resources'
import { NarviResource } from './api/resources/NarviResource'
import { HttpClient, HttpClientResponse } from './http/HttpClient'
import * as _Error from './errors/Errors'
import { PlatformFunctions } from './platform/PlatformFunctions'
import { CryptoProvider } from './crypto/CryptoProvider'

import { NarviObject } from './Types'

export type UserProvidedConfig = {
  apiKeyId: string
  privateKeyFilePath: string
  host?: string
  apiVersion?: string
  protocol?: string
  httpAgent?: any
  timeout?: number
  port?: number
  maxNetworkRetries?: number
  narviAccount?: string
  typescript?: boolean
  telemetry?: boolean
  dev?: boolean
}

const DEFAULT_HOST = 'my.narvi.com'
const DEFAULT_PORT = '443'
const DEFAULT_BASE_PATH = '/v1/'
const DEFAULT_API_VERSION = apiVersion.ApiVersion
const DEFAULT_TIMEOUT = 80000
const MAX_NETWORK_RETRY_DELAY_SEC = 2
const INITIAL_NETWORK_RETRY_DELAY_SEC = 0.5

const ALLOWED_CONFIG_PROPERTIES = [
  'apiKeyId',
  'privateKeyFilePath',
  'apiVersion',
  'typescript',
  'maxNetworkRetries',
  'httpAgent',
  'httpClient',
  'timeout',
  'host',
  'port',
  'protocol',
  'telemetry',
  'appInfo',
  'narviAccount',
]

type RequestSenderFactory = (narvi: NarviObject) => RequestSender

const defaultRequestSenderFactory: RequestSenderFactory = (narvi) =>
  new RequestSender(narvi)

export function createNarvi(
  platformFunctions: PlatformFunctions,
  requestSender: RequestSenderFactory = defaultRequestSenderFactory,
): typeof Narvi {
  Narvi.PACKAGE_VERSION = '13.3.0'
  Narvi.USER_AGENT = {
    bindings_version: Narvi.PACKAGE_VERSION,
    lang: 'node',
    publisher: 'narvi',
    uname: null,
    typescript: false,
    ...determineProcessUserAgentProperties(),
  }

  Narvi.NarviResource = NarviResource
  Narvi.resources = resources
  Narvi.HttpClient = HttpClient
  Narvi.HttpClientResponse = HttpClientResponse
  Narvi.CryptoProvider = CryptoProvider

  function Narvi(this: NarviObject, config: UserProvidedConfig): void {
    if (!(this instanceof Narvi)) {
      return new (Narvi as any)(config)
    }

    const props = this._getPropsFromConfig(config)

    this._platformFunctions = platformFunctions

    this.VERSION = Narvi.PACKAGE_VERSION

    if (
      props.protocol &&
      props.protocol !== 'https' &&
      (!props.host || /\.narvi\.com$/.test(props.host))
    ) {
      throw new Error(
        'The `https` protocol must be used when sending requests to `*.narvi.com`',
      )
    }

    const agent = props.httpAgent || null

    this._api = {
      auth: null,
      host: props.host || DEFAULT_HOST,
      port: props.port || DEFAULT_PORT,
      protocol: props.protocol || 'https',
      basePath: DEFAULT_BASE_PATH,
      version: props.apiVersion || DEFAULT_API_VERSION,
      apiKeyId: props.apiKeyId,
      privateKey: loadPrivateKeyFromFile(props.privateKeyFilePath),
      timeout: validateInteger('timeout', props.timeout, DEFAULT_TIMEOUT),
      maxNetworkRetries: validateInteger(
        'maxNetworkRetries',
        props.maxNetworkRetries,
        1,
      ),
      agent: agent,
      httpClient:
        props.httpClient ||
        (agent
          ? this._platformFunctions.createNodeHttpClient(agent)
          : this._platformFunctions.createDefaultHttpClient()),
      dev: false,
      narviAccount: props.narviAccount || null,
    }

    const typescript = props.typescript || false
    if (typescript !== Narvi.USER_AGENT.typescript) {
      // The mutation here is uncomfortable, but likely fastest;
      // serializing the user agent involves shelling out to the system,
      // and given some users may instantiate the library many times without switching between TS and non-TS,
      // we only want to incur the performance hit when that actually happens.
      Narvi.USER_AGENT.typescript = typescript
    }

    this._prepResources()

    // this._setApiKey(key)
    this.errors = _Error

    this._requestSender = requestSender(this)

    // Expose NarviResource on the instance too
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.NarviResource = Narvi.NarviResource
  }

  Narvi.errors = _Error
  Narvi.createNodeHttpClient = platformFunctions.createNodeHttpClient
  Narvi.createFetchHttpClient = platformFunctions.createFetchHttpClient
  Narvi.createNodeCryptoProvider = platformFunctions.createNodeCryptoProvider
  Narvi.createSubtleCryptoProvider =
    platformFunctions.createSubtleCryptoProvider

  /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
  // @ts-ignore
  Narvi.prototype = {
    // Properties are set in the constructor above
    VERSION: null!,
    errors: null!,
    _api: null!,
    _requestSender: null!,
    _platformFunctions: null!,

    // /**
    //  * @private
    //  */
    // _setApiKey(key: string): void {
    //   if (key) {
    //     this._setApiField('auth', `Bearer ${key}`)
    //   }
    // },

    /**
     * @private
     * This may be removed in the future.
     */
    _setApiField<K extends keyof NarviObject['_api']>(
      key: K,
      value: NarviObject['_api'][K],
    ): void {
      this._api[key] = value
    },

    getConstant: (c: string): unknown => {
      switch (c) {
        case 'DEFAULT_HOST':
          return DEFAULT_HOST
        case 'DEFAULT_PORT':
          return DEFAULT_PORT
        case 'DEFAULT_BASE_PATH':
          return DEFAULT_BASE_PATH
        case 'DEFAULT_API_VERSION':
          return DEFAULT_API_VERSION
        case 'DEFAULT_TIMEOUT':
          return DEFAULT_TIMEOUT
        case 'MAX_NETWORK_RETRY_DELAY_SEC':
          return MAX_NETWORK_RETRY_DELAY_SEC
        case 'INITIAL_NETWORK_RETRY_DELAY_SEC':
          return INITIAL_NETWORK_RETRY_DELAY_SEC
      }
      return (Narvi as unknown as Record<string, unknown>)[c]
    },

    getMaxNetworkRetries(): number {
      return this.getApiField('maxNetworkRetries')
    },

    /**
     * @private
     * It may be deprecated and removed in the future.
     *
     * Gets a JSON version of a User-Agent and uses a cached version for a slight
     * speed advantage.
     */

    getClientUserAgent(cb: (userAgent: string) => void): void {
      return this.getClientUserAgentSeeded(Narvi.USER_AGENT, cb)
    },

    /**
     * @private
     * It may be deprecated and removed in the future.
     *
     * Gets a JSON version of a User-Agent by encoding a seeded object and
     * fetching a uname from the system.
     */
    getClientUserAgentSeeded(
      seed: Record<string, string | boolean | null>,
      cb: (userAgent: string) => void,
    ): void {
      this._platformFunctions.getUname().then((uname: string | null) => {
        const userAgent: Record<string, string> = {}
        for (const field in seed) {
          userAgent[field] = encodeURIComponent(seed[field] ?? 'null')
        }

        // URI-encode in case there are unusual characters in the system's uname.
        userAgent.uname = encodeURIComponent(uname || 'UNKNOWN')

        const client = this.getApiField('httpClient')
        if (client) {
          userAgent.httplib = encodeURIComponent(client.getClientName())
        }

        cb(JSON.stringify(userAgent))
      })
    },

    getApiField<K extends keyof NarviObject['_api']>(
      key: K,
    ): NarviObject['_api'][K] {
      return this._api[key]
    },

    getMaxNetworkRetryDelay(): number {
      return MAX_NETWORK_RETRY_DELAY_SEC
    },

    getInitialNetworkRetryDelay(): number {
      return INITIAL_NETWORK_RETRY_DELAY_SEC
    },

    getPaginationCursor,

    /**
     * @private
     * This may be removed in the future.
     */
    _prepResources(): void {
      for (const name in resources) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this[pascalToCamelCase(name)] = new resources[name](this)
      }
    },

    /**
     * @private
     * This may be removed in the future.
     */
    _getPropsFromConfig(config: UserProvidedConfig): UserProvidedConfig {
      // config can be an object or a string
      const isString = typeof config === 'string'
      const isObject = config === Object(config) && !Array.isArray(config)

      if (!isObject && !isString) {
        throw new Error('Config must either be an object or a string')
      }

      // If config is an object, we assume the new behavior and make sure it doesn't contain any unexpected values
      const values = Object.keys(config).filter(
        (value) => !ALLOWED_CONFIG_PROPERTIES.includes(value),
      )

      if (values.length > 0) {
        throw new Error(
          `Config object may only contain the following: ${ALLOWED_CONFIG_PROPERTIES.join(
            ', ',
          )}`,
        )
      }

      return config
    },
  } as NarviObject

  return Narvi
}
