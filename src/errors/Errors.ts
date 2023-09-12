/* eslint-disable camelcase */

import { RawErrorType, NarviRawError } from '../Types'

export const generate = (rawNarviError: NarviRawError): NarviError => {
  switch (rawNarviError.type) {
    case 'card_error':
      return new NarviCardError(rawNarviError)
    case 'invalid_request_error':
      return new NarviInvalidRequestError(rawNarviError)
    case 'api_error':
      return new NarviAPIError(rawNarviError)
    case 'authentication_error':
      return new NarviAuthenticationError(rawNarviError)
    case 'rate_limit_error':
      return new NarviRateLimitError(rawNarviError)
    case 'idempotency_error':
      return new NarviIdempotencyError(rawNarviError)
    case 'invalid_grant':
      return new NarviInvalidGrantError(rawNarviError)
    default:
      return new NarviUnknownError(rawNarviError)
  }
}

/**
 * NarviError is the base error from which all other more specific Narvi errors derive.
 * Specifically for errors returned from Narvi's REST API.
 */
export class NarviError extends Error {
  readonly message: string
  readonly type: string
  readonly raw: unknown
  readonly rawType?: RawErrorType
  readonly headers?: { [header: string]: string }
  readonly requestId?: string

  readonly code?: string
  readonly doc_url?: string
  readonly param?: string
  readonly detail?: string | Error
  readonly statusCode?: number
  readonly charge?: string
  readonly decline_code?: string
  readonly payment_method_type?: string

  readonly payment_intent?: any
  readonly payment_method?: any
  readonly setup_intent?: any
  readonly source?: any

  constructor(raw: NarviRawError = {}) {
    super(raw.message)
    this.type = this.constructor.name

    this.raw = raw
    this.rawType = raw.type
    this.code = raw.code
    this.doc_url = raw.doc_url
    this.param = raw.param
    this.detail = raw.detail
    this.headers = raw.headers
    this.requestId = raw.requestId
    this.statusCode = raw.statusCode
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.message = raw.message

    this.charge = raw.charge
    this.decline_code = raw.decline_code
    this.payment_intent = raw.payment_intent
    this.payment_method = raw.payment_method
    this.payment_method_type = raw.payment_method_type
    this.setup_intent = raw.setup_intent
    this.source = raw.source
  }

  /**
   * Helper factory which takes raw narvi errors and outputs wrapping instances
   */
  static generate = generate
}

// Specific Narvi Error types:

/**
 * CardError is raised when a user enters a card that can't be charged for
 * some reason.
 */
export class NarviCardError extends NarviError {}

/**
 * InvalidRequestError is raised when a request is initiated with invalid
 * parameters.
 */
export class NarviInvalidRequestError extends NarviError {}

/**
 * APIError is a generic error that may be raised in cases where none of the
 * other named errors cover the problem. It could also be raised in the case
 * that a new error has been introduced in the API, but this version of the
 * Node.JS SDK doesn't know how to handle it.
 */
export class NarviAPIError extends NarviError {}

/**
 * AuthenticationError is raised when invalid credentials are used to connect
 * to Narvi's servers.
 */
export class NarviAuthenticationError extends NarviError {}

/**
 * PermissionError is raised in cases where access was attempted on a resource
 * that wasn't allowed.
 */
export class NarviPermissionError extends NarviError {}

/**
 * RateLimitError is raised in cases where an account is putting too much load
 * on Narvi's API servers (usually by performing too many requests). Please
 * back off on request rate.
 */
export class NarviRateLimitError extends NarviError {}

/**
 * NarviConnectionError is raised in the event that the SDK can't connect to
 * Narvi's servers. That can be for a variety of different reasons from a
 * downed network to a bad TLS certificate.
 */
export class NarviConnectionError extends NarviError {}

/**
 * SignatureVerificationError is raised when the signature verification for a
 * webhook fails
 */
export class NarviSignatureVerificationError extends NarviError {
  header: string | Uint8Array
  payload: string | Uint8Array

  constructor(
    header: string | Uint8Array,
    payload: string | Uint8Array,
    raw: NarviRawError = {},
  ) {
    super(raw)
    this.header = header
    this.payload = payload
  }
}

/**
 * IdempotencyError is raised in cases where an idempotency key was used
 * improperly.
 */
export class NarviIdempotencyError extends NarviError {}

/**
 * InvalidGrantError is raised when a specified code doesn't exist, is
 * expired, has been used, or doesn't belong to you; a refresh token doesn't
 * exist, or doesn't belong to you; or if an API key's mode (live or test)
 * doesn't match the mode of a code or refresh token.
 */
export class NarviInvalidGrantError extends NarviError {}

/**
 * Any other error from Narvi not specifically captured above
 */
export class NarviUnknownError extends NarviError {}
