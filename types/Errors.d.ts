declare module 'src/app/narvi' {
  namespace Narvi {
    export type RawErrorType =
      | 'card_error'
      | 'invalid_request_error'
      | 'api_error'
      | 'idempotency_error'
      | 'rate_limit_error'
      | 'authentication_error'
      | 'invalid_grant'

    export type NarviRawError = {
      message?: string

      type: RawErrorType

      headers?: { [header: string]: string }
      statusCode?: number
      requestId?: string

      code?: string
      doc_code?: string
      decline_code?: string
      param?: string
      detail?: string

      charge?: string
    }

    namespace errors {
      function generate(
        rawError: NarviRawError & { type: 'card_error' },
      ): NarviCardError
      function generate(
        rawError: NarviRawError & { type: 'invalid_request_error' },
      ): NarviInvalidRequestError
      function generate(
        rawError: NarviRawError & { type: 'api_error' },
      ): NarviAPIError
      function generate(
        rawError: NarviRawError & { type: 'authentication_error' },
      ): NarviAuthenticationError
      function generate(
        rawError: NarviRawError & { type: 'rate_limit_error' },
      ): NarviRateLimitError
      function generate(
        rawError: NarviRawError & { type: 'idempotency_error' },
      ): NarviIdempotencyError
      function generate(
        rawError: NarviRawError & { type: 'invalid_grant' },
      ): NarviInvalidGrantError
      function generate(
        rawError: NarviRawError & { type: RawErrorType },
      ): NarviError

      class NarviError extends Error {
        constructor(rawError: NarviRawError)

        static generate(
          rawError: NarviRawError & { type: 'card_error' },
        ): NarviCardError
        static generate(
          rawError: NarviRawError & { type: 'invalid_request_error' },
        ): NarviInvalidRequestError
        static generate(
          rawError: NarviRawError & { type: 'api_error' },
        ): NarviAPIError
        static generate(
          rawError: NarviRawError & { type: 'authentication_error' },
        ): NarviAuthenticationError
        static generate(
          rawError: NarviRawError & { type: 'rate_limit_error' },
        ): NarviRateLimitError
        static generate(
          rawError: NarviRawError & { type: 'idempotency_error' },
        ): NarviIdempotencyError
        static generate(
          rawError: NarviRawError & { type: 'invalid_grant' },
        ): NarviInvalidGrantError
        static generate(
          rawError: NarviRawError & { type: RawErrorType },
        ): NarviError

        /**
         * A human-readable message giving more details about the error. For card errors, these messages can
         * be shown to your users.
         */
        readonly message: string

        readonly type:
          | 'NarviError'
          | 'NarviCardError'
          | 'NarviInvalidRequestError'
          | 'NarviAPIError'
          | 'NarviAuthenticationError'
          | 'NarviPermissionError'
          | 'NarviRateLimitError'
          | 'NarviConnectionError'
          | 'NarviSignatureVerificationError'
          | 'NarviIdempotencyError'
          | 'NarviInvalidGrantError'

        /**
         * See the "error types" section at https://narvi.com/docs/api/errors
         */
        readonly rawType: RawErrorType

        /**
         * For card errors, a short string describing the kind of card error that occurred.
         *
         * @docs https://narvi.com/docs/error-codes
         */
        readonly code?: string

        /**
         * A URL to more information about the error code reported.
         *
         * @docs https://narvi.com/docs/error-codes
         */
        readonly doc_url?: string

        /**
         * Typically a 4xx or 5xx.
         */
        readonly statusCode?: number

        readonly raw: unknown

        readonly headers: {
          [key: string]: string
        }

        readonly requestId: string

        /**
         * The parameter the error relates to if the error is parameter-specific. You can use this to display a
         * message near the correct form field, for example.
         */
        readonly param?: string

        readonly charge?: string
        readonly decline_code?: string
        readonly payment_method_type?: string
      }

      /**
       * Card errors are the most common type of error you should expect to handle.
       * They result when the user enters a card that can't be charged for some reason.
       */
      class NarviCardError extends NarviError {
        readonly type: 'NarviCardError'
        readonly rawType: 'card_error'

        /**
         * @docs https://narvi.com/docs/declines/codes
         */
        readonly decline_code: string
      }

      /**
       * Invalid request errors arise when your request has invalid parameters.
       */
      class NarviInvalidRequestError extends NarviError {
        readonly type: 'NarviInvalidRequestError'
        readonly rawType: 'invalid_request_error'
      }

      /**
       * API errors cover any other type of problem (e.g., a temporary problem with Narvi's servers),
       * and are extremely uncommon.
       *
       * It could also be raised in the case that a new error has been introduced in the API,
       * but this version of the library doesn't know how to handle it.
       */
      class NarviAPIError extends NarviError {
        readonly type: 'NarviAPIError'
        readonly rawType: 'api_error'
      }

      /**
       * Failure to properly authenticate yourself in the request.
       */
      class NarviAuthenticationError extends NarviError {
        readonly type: 'NarviAuthenticationError'
        readonly rawType: 'authentication_error'
      }

      /**
       * Access was attempted on a resource that wasn't allowed.
       */
      class NarviPermissionError extends NarviError {
        readonly type: 'NarviPermissionError'
      }

      /**
       * Too many requests hit the API too quickly.
       * @docs https://narvi.com/docs/rate-limits
       */
      class NarviRateLimitError extends NarviError {
        readonly type: 'NarviRateLimitError'
        readonly rawType: 'rate_limit_error'
      }

      /**
       * The library cannot connect to Narvi.
       * This can happen for a variety of reasons,
       * such as loss of network connectivity or a bad TLS certificate.
       */
      class NarviConnectionError extends NarviError {
        readonly type: 'NarviConnectionError'
      }

      /**
       * The signature verification for a webhook failed.
       * @docs https://narvi.com/docs/webhooks/signatures
       */
      class NarviSignatureVerificationError extends NarviError {
        readonly type: 'NarviSignatureVerificationError'
      }

      /**
       * Idempotency errors occur when an `Idempotency-Key` is re-used on a request that does not match the first request's API endpoint and parameters.
       * @docs https://narvi.com/docs/api/idempotent_requests?lang=node
       */
      class NarviIdempotencyError extends NarviError {
        readonly type: 'NarviIdempotencyError'
        readonly rawType: 'idempotency_error'
      }

      /**
       * InvalidGrantError is raised when a specified code doesn't exist, is
       * expired, has been used, or doesn't belong to you; a refresh token doesn't
       * exist, or doesn't belong to you; or if an API key's mode (live or test)
       * doesn't match the mode of a code or refresh token.
       */
      class NarviInvalidGrantError extends NarviError {
        readonly type: 'NarviInvalidGrantError'
        readonly rawType: 'invalid_grant'
      }
    }
  }
}
