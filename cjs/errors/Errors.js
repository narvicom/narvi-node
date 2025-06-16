"use strict";
/* eslint-disable camelcase */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NarviUnknownError = exports.NarviInvalidGrantError = exports.NarviIdempotencyError = exports.NarviSignatureVerificationError = exports.NarviConnectionError = exports.NarviRateLimitError = exports.NarviPermissionError = exports.NarviAuthenticationError = exports.NarviAPIError = exports.NarviInvalidRequestError = exports.NarviCardError = exports.NarviError = exports.generate = void 0;
const generate = (rawNarviError) => {
    switch (rawNarviError.type) {
        case 'card_error':
            return new NarviCardError(rawNarviError);
        case 'invalid_request_error':
            return new NarviInvalidRequestError(rawNarviError);
        case 'api_error':
            return new NarviAPIError(rawNarviError);
        case 'authentication_error':
            return new NarviAuthenticationError(rawNarviError);
        case 'rate_limit_error':
            return new NarviRateLimitError(rawNarviError);
        case 'idempotency_error':
            return new NarviIdempotencyError(rawNarviError);
        case 'invalid_grant':
            return new NarviInvalidGrantError(rawNarviError);
        default:
            return new NarviUnknownError(rawNarviError);
    }
};
exports.generate = generate;
/**
 * NarviError is the base error from which all other more specific Narvi errors derive.
 * Specifically for errors returned from Narvi's REST API.
 */
class NarviError extends Error {
    constructor(raw = {}) {
        super(raw.message);
        this.type = this.constructor.name;
        this.raw = raw;
        this.rawType = raw.type;
        this.code = raw.code;
        this.doc_url = raw.doc_url;
        this.param = raw.param;
        this.detail = raw.detail;
        this.headers = raw.headers;
        this.requestId = raw.requestId;
        this.statusCode = raw.statusCode;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.message = raw.message;
        this.charge = raw.charge;
        this.decline_code = raw.decline_code;
        this.payment_intent = raw.payment_intent;
        this.payment_method = raw.payment_method;
        this.payment_method_type = raw.payment_method_type;
        this.setup_intent = raw.setup_intent;
        this.source = raw.source;
    }
}
exports.NarviError = NarviError;
/**
 * Helper factory which takes raw narvi errors and outputs wrapping instances
 */
NarviError.generate = exports.generate;
// Specific Narvi Error types:
/**
 * CardError is raised when a user enters a card that can't be charged for
 * some reason.
 */
class NarviCardError extends NarviError {
}
exports.NarviCardError = NarviCardError;
/**
 * InvalidRequestError is raised when a request is initiated with invalid
 * parameters.
 */
class NarviInvalidRequestError extends NarviError {
}
exports.NarviInvalidRequestError = NarviInvalidRequestError;
/**
 * APIError is a generic error that may be raised in cases where none of the
 * other named errors cover the problem. It could also be raised in the case
 * that a new error has been introduced in the API, but this version of the
 * Node.JS SDK doesn't know how to handle it.
 */
class NarviAPIError extends NarviError {
}
exports.NarviAPIError = NarviAPIError;
/**
 * AuthenticationError is raised when invalid credentials are used to connect
 * to Narvi's servers.
 */
class NarviAuthenticationError extends NarviError {
}
exports.NarviAuthenticationError = NarviAuthenticationError;
/**
 * PermissionError is raised in cases where access was attempted on a resource
 * that wasn't allowed.
 */
class NarviPermissionError extends NarviError {
}
exports.NarviPermissionError = NarviPermissionError;
/**
 * RateLimitError is raised in cases where an account is putting too much load
 * on Narvi's API servers (usually by performing too many requests). Please
 * back off on request rate.
 */
class NarviRateLimitError extends NarviError {
}
exports.NarviRateLimitError = NarviRateLimitError;
/**
 * NarviConnectionError is raised in the event that the SDK can't connect to
 * Narvi's servers. That can be for a variety of different reasons from a
 * downed network to a bad TLS certificate.
 */
class NarviConnectionError extends NarviError {
}
exports.NarviConnectionError = NarviConnectionError;
/**
 * SignatureVerificationError is raised when the signature verification for a
 * webhook fails
 */
class NarviSignatureVerificationError extends NarviError {
    constructor(header, payload, raw = {}) {
        super(raw);
        this.header = header;
        this.payload = payload;
    }
}
exports.NarviSignatureVerificationError = NarviSignatureVerificationError;
/**
 * IdempotencyError is raised in cases where an idempotency key was used
 * improperly.
 */
class NarviIdempotencyError extends NarviError {
}
exports.NarviIdempotencyError = NarviIdempotencyError;
/**
 * InvalidGrantError is raised when a specified code doesn't exist, is
 * expired, has been used, or doesn't belong to you; a refresh token doesn't
 * exist, or doesn't belong to you; or if an API key's mode (live or test)
 * doesn't match the mode of a code or refresh token.
 */
class NarviInvalidGrantError extends NarviError {
}
exports.NarviInvalidGrantError = NarviInvalidGrantError;
/**
 * Any other error from Narvi not specifically captured above
 */
class NarviUnknownError extends NarviError {
}
exports.NarviUnknownError = NarviUnknownError;
