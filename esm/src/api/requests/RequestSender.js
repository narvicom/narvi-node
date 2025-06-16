import { normalizeHeaders, removeNullish, stringifyRequestData, } from '../../utils/utils';
import { HttpClient } from '../../http/HttpClient';
import { uuid4 } from '../../platform/PlatformFunctions';
import { NarviAPIError, NarviAuthenticationError, NarviConnectionError, NarviError, NarviPermissionError, NarviRateLimitError, } from '../../errors/Errors';
const MAX_RETRY_AFTER_WAIT = 60;
export class RequestSender {
    constructor(narvi) {
        this._narvi = narvi;
    }
    _addHeadersDirectlyToObject(obj, headers) {
        // For convenience, make some headers easily accessible on
        // lastResponse.
        // NOTE: Narvi responds with lowercase header names/keys.
        obj.requestId = headers['request-id'];
        obj.narviAccount = obj.narviAccount || headers['narvi-account'];
        obj.apiVersion = obj.apiVersion || headers['narvi-version'];
        obj.idempotencyKey = obj.idempotencyKey || headers['idempotency-key'];
    }
    _makeResponseEvent(requestEvent, statusCode, headers) {
        const requestEndTime = Date.now();
        const requestDurationMs = requestEndTime - requestEvent.request_start_time;
        return removeNullish({
            api_version: headers['narvi-version'],
            account: headers['narvi-account'],
            idempotency_key: headers['idempotency-key'],
            method: requestEvent.method,
            path: requestEvent.path,
            status: statusCode,
            request_id: this._getRequestId(headers),
            elapsed: requestDurationMs,
            request_start_time: requestEvent.request_start_time,
            request_end_time: requestEndTime,
        });
    }
    _getRequestId(headers) {
        return headers['request-id'];
    }
    /**
     * Used by methods with spec.streaming === true. For these methods, we do not
     * buffer successful responses into memory or do parse them into narvi
     * objects, we delegate that all of that to the user and pass back the raw
     * http.Response object to the callback.
     *
     * (Unsuccessful responses shouldn't make it here, they should
     * still be buffered/parsed and handled by _jsonResponseHandler -- see
     * makeRequest)
     */
    _streamingResponseHandler(requestEvent, callback) {
        return (res) => {
            const headers = res.getHeaders();
            const streamCompleteCallback = () => {
                const responseEvent = this._makeResponseEvent(requestEvent, res.getStatusCode(), headers);
            };
            const stream = res.toStream(streamCompleteCallback);
            // This is here for backwards compatibility, as the stream is a raw
            // HTTP response in Node and the legacy behavior was to mutate this
            // response.
            this._addHeadersDirectlyToObject(stream, headers);
            return callback(null, stream);
        };
    }
    /**
     * Default handler for Narvi responses. Buffers the response into memory,
     * parses the JSON and returns it (i.e. passes it to the callback) if there
     * is no "error" field. Otherwise constructs/passes an appropriate Error.
     */
    _jsonResponseHandler(requestEvent, callback) {
        return (res) => {
            const headers = res.getHeaders();
            const requestId = this._getRequestId(headers);
            const statusCode = res.getStatusCode();
            const responseEvent = this._makeResponseEvent(requestEvent, statusCode, headers);
            res
                .toJSON()
                .then((jsonResponse) => {
                if (jsonResponse.error) {
                    let err;
                    // Convert OAuth error responses into a standard format
                    // so that the rest of the error logic can be shared
                    if (typeof jsonResponse.error === 'string') {
                        jsonResponse.error = {
                            type: jsonResponse.error,
                            message: jsonResponse.error_description,
                        };
                    }
                    jsonResponse.error.headers = headers;
                    jsonResponse.error.statusCode = statusCode;
                    jsonResponse.error.requestId = requestId;
                    if (statusCode === 401) {
                        err = new NarviAuthenticationError(jsonResponse.error);
                    }
                    else if (statusCode === 403) {
                        err = new NarviPermissionError(jsonResponse.error);
                    }
                    else if (statusCode === 429) {
                        err = new NarviRateLimitError(jsonResponse.error);
                    }
                    else {
                        err = NarviError.generate(jsonResponse.error);
                    }
                    throw err;
                }
                return jsonResponse;
            }, (e) => {
                throw new NarviAPIError({
                    message: 'Invalid JSON received from the Narvi API',
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    exception: e,
                    requestId: headers['request-id'],
                });
            })
                .then((jsonResponse) => {
                // Expose raw response object.
                const rawResponse = res.getRawResponse();
                this._addHeadersDirectlyToObject(rawResponse, headers);
                Object.defineProperty(jsonResponse, 'lastResponse', {
                    enumerable: false,
                    writable: false,
                    value: rawResponse,
                });
                callback(null, jsonResponse);
            }, (e) => callback(e, null));
        };
    }
    static _generateConnectionErrorMessage(requestRetries) {
        return `An error occurred with our connection to Narvi.${requestRetries > 0 ? ` Request was retried ${requestRetries} times.` : ''}`;
    }
    static _shouldRetry(res, numRetries, maxRetries, error) {
        if (error &&
            numRetries === 0 &&
            HttpClient.CONNECTION_CLOSED_ERROR_CODES.includes(error.code)) {
            return true;
        }
        // Do not retry if we are out of retries.
        if (numRetries >= maxRetries) {
            return false;
        }
        // Retry on connection error.
        if (!res) {
            return true;
        }
        // The API may ask us not to retry (e.g., if doing so would be a no-op)
        // or advise us to retry (e.g., in cases of lock timeouts); we defer to that.
        if (res.getHeaders()['narvi-should-retry'] === 'false') {
            return false;
        }
        if (res.getHeaders()['narvi-should-retry'] === 'true') {
            return true;
        }
        // Retry on conflict errors.
        if (res.getStatusCode() === 409) {
            return true;
        }
        // Retry on 500, 503, and other internal errors.
        //
        // Note that we expect the narvi-should-retry header to be false
        // in most cases when a 500 is returned, since our idempotency framework
        // would typically replay it anyway.
        if (res.getStatusCode() >= 500) {
            return true;
        }
        return false;
    }
    // Max retries can be set on a per request basis. Favor those over the global setting
    _getMaxNetworkRetries(settings = {}) {
        return settings.maxNetworkRetries !== undefined &&
            Number.isInteger(settings.maxNetworkRetries)
            ? settings.maxNetworkRetries
            : this._narvi.getMaxNetworkRetries();
    }
    _defaultIdempotencyKey(method, settings) {
        // If this is a POST and we allow multiple retries, ensure an idempotency key.
        const maxRetries = this._getMaxNetworkRetries(settings);
        if (method === 'POST' && maxRetries > 0) {
            return `narvi-node-retry-${uuid4()}`;
        }
        return null;
    }
    _makeHeaders(auth, contentLength, apiVersion, clientUserAgent, method, userSuppliedHeaders, userSuppliedSettings) {
        const defaultHeaders = {
            // Use specified auth token or use default from this narvi instance:
            // Authorization: auth ? `Bearer ${auth}` : this._narvi.getApiField('auth'),
            'Content-Type': 'application/json',
            // 'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            'User-Agent': this._getUserAgentString(),
            'X-Narvi-Client-User-Agent': clientUserAgent,
            'Narvi-Version': apiVersion,
            'Narvi-Account': this._narvi.getApiField('narviAccount'),
            'Idempotency-Key': this._defaultIdempotencyKey(method, userSuppliedSettings),
        };
        // As per https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.2:
        //   A user agent SHOULD send a Content-Length in a request message when
        //   no Transfer-Encoding is sent and the request method defines a meaning
        //   for an enclosed payload body.  For example, a Content-Length header
        //   field is normally sent in a POST request even when the value is 0
        //   (indicating an empty payload body).  A user agent SHOULD NOT send a
        //   Content-Length header field when the request message does not contain
        //   a payload body and the method semantics do not anticipate such a
        //   body.
        //
        // These method types are expected to have bodies and so we should always
        // include a Content-Length.
        const methodHasPayload = method === 'POST' || method === 'PUT' || method === 'PATCH';
        // If a content length was specified, we always include it regardless of
        // whether the method semantics anticipate such a body. This keeps us
        // consistent with historical behavior. We do however want to warn on this
        // and fix these cases as they are semantically incorrect.
        if (methodHasPayload || contentLength) {
            // if (!methodHasPayload) {
            //   emitWarning(
            //     `${method} method had non-zero contentLength but no payload is expected for this verb`,
            //   )
            // }
            defaultHeaders['Content-Length'] = contentLength;
        }
        return Object.assign(removeNullish(defaultHeaders), 
        // If the user supplied, say 'idempotency-key', override instead of appending by ensuring caps are the same.
        normalizeHeaders(userSuppliedHeaders));
    }
    _getUserAgentString() {
        const packageVersion = this._narvi.getConstant('PACKAGE_VERSION');
        return `Narvi/v1 NodeBindings/${packageVersion}`.trim();
    }
    _getSleepTimeInMS(numRetries, retryAfter = null) {
        const initialNetworkRetryDelay = this._narvi.getInitialNetworkRetryDelay();
        const maxNetworkRetryDelay = this._narvi.getMaxNetworkRetryDelay();
        // Apply exponential backoff with initialNetworkRetryDelay on the
        // number of numRetries so far as inputs. Do not allow the number to exceed
        // maxNetworkRetryDelay.
        let sleepSeconds = Math.min(initialNetworkRetryDelay * Math.pow(numRetries - 1, 2), maxNetworkRetryDelay);
        // Apply some jitter by randomizing the value in the range of
        // (sleepSeconds / 2) to (sleepSeconds).
        sleepSeconds *= 0.5 * (1 + Math.random());
        // But never sleep less than the base sleep seconds.
        sleepSeconds = Math.max(initialNetworkRetryDelay, sleepSeconds);
        // And never sleep less than the time the API asks us to wait, assuming it's a reasonable ask.
        if (Number.isInteger(retryAfter) && retryAfter <= MAX_RETRY_AFTER_WAIT) {
            sleepSeconds = Math.max(sleepSeconds, retryAfter);
        }
        return sleepSeconds * 1000;
    }
    _request(method, host, path, data, auth, 
    // eslint-disable-next-line default-param-last
    options = {}, callback, requestDataProcessor = null) {
        let requestData;
        const retryRequest = (requestFn, apiVersion, headers, requestRetries, retryAfter) => {
            return setTimeout(requestFn, this._getSleepTimeInMS(requestRetries, retryAfter), apiVersion, headers, requestRetries + 1);
        };
        const makeRequest = (apiVersion, headers, numRetries) => {
            // timeout can be set on a per-request basis. Favor that over the global setting
            const timeout = options.settings &&
                options.settings.timeout &&
                Number.isInteger(options.settings.timeout) &&
                options.settings.timeout >= 0
                ? options.settings.timeout
                : this._narvi.getApiField('timeout');
            const req = this._narvi
                .getApiField('httpClient')
                .makeRequest(host || this._narvi.getApiField('host'), this._narvi.getApiField('port'), path, method, headers, requestData, this._narvi.getApiField('protocol'), timeout);
            const requestStartTime = Date.now();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const requestEvent = removeNullish({
                api_version: apiVersion,
                account: headers['Narvi-Account'],
                idempotency_key: headers['Idempotency-Key'],
                method,
                path,
                request_start_time: requestStartTime,
            });
            const requestRetries = numRetries || 0;
            const maxRetries = this._getMaxNetworkRetries(options.settings || {});
            req
                .then((res) => {
                if (RequestSender._shouldRetry(res, requestRetries, maxRetries)) {
                    return retryRequest(makeRequest, apiVersion, headers, requestRetries, 
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    res.getHeaders()['retry-after']);
                }
                else if (options.streaming && res.getStatusCode() < 400) {
                    return this._streamingResponseHandler(requestEvent, callback)(res);
                }
                else {
                    return this._jsonResponseHandler(requestEvent, callback)(res);
                }
            })
                .catch((error) => {
                if (RequestSender._shouldRetry(null, requestRetries, maxRetries, error)) {
                    return retryRequest(makeRequest, apiVersion, headers, requestRetries, null);
                }
                else {
                    const isTimeoutError = error.code && error.code === HttpClient.TIMEOUT_ERROR_CODE;
                    return callback(new NarviConnectionError({
                        message: isTimeoutError
                            ? `Request aborted due to timeout being reached (${timeout}ms)`
                            : RequestSender._generateConnectionErrorMessage(requestRetries),
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        detail: error,
                    }));
                }
            });
        };
        const prepareAndMakeRequest = (error, data) => {
            if (error) {
                return callback(error);
            }
            requestData = data;
            this._narvi.getClientUserAgent((clientUserAgent) => {
                var _a, _b;
                const apiVersion = this._narvi.getApiField('version');
                const headers = this._makeHeaders(auth, requestData.length, apiVersion, clientUserAgent, method, (_a = options.headers) !== null && _a !== void 0 ? _a : null, (_b = options.settings) !== null && _b !== void 0 ? _b : {});
                makeRequest(apiVersion, headers, 0);
            });
        };
        const methodHasPayload = method === 'POST' || method === 'PUT' || method === 'PATCH';
        if (requestDataProcessor) {
            requestDataProcessor(method, data, options.headers, prepareAndMakeRequest);
        }
        else {
            // prepareAndMakeRequest(null, data || {})
            prepareAndMakeRequest(null, stringifyRequestData(data || {}, methodHasPayload));
        }
    }
}
