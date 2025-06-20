"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNarviRequestSignature = exports.loadPrivateKeyFromFile = exports.getPaginationCursor = exports.getQueryFromUrl = exports.getPathFromUrl = exports.protoExtend = exports.concat = exports.determineProcessUserAgentProperties = exports.validateInteger = exports.flattenAndStringify = exports.isObject = exports.emitWarning = exports.pascalToCamelCase = exports.callbackifyPromiseWithTimeout = exports.normalizeHeader = exports.normalizeHeaders = exports.removeNullish = exports.getOptionsFromArgs = exports.getDataFromArgs = exports.extractUrlParams = exports.makeURLInterpolator = exports.stringifyRequestData = exports.isOptionsHash = void 0;
const qs = require("qs");
const fs = require("fs");
const crypto = require("crypto");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsonStringify = require('json-stable-stringify');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const isEmpty = require('lodash.isempty');
const OPTIONS_KEYS = [
    'apiKey',
    'idempotencyKey',
    'narviAccount',
    'apiVersion',
    'maxNetworkRetries',
    'timeout',
    'host',
];
function isOptionsHash(o) {
    return (o &&
        typeof o === 'object' &&
        OPTIONS_KEYS.some((prop) => Object.prototype.hasOwnProperty.call(o, prop)));
}
exports.isOptionsHash = isOptionsHash;
/**
 * Stringifies an Object, accommodating nested objects
 * (forming the conventional key 'parent[child]=value')
 */
function stringifyRequestData(data, hasPayload) {
    if (isEmpty(data)) {
        // REGULAR GET REQUEST
        return '';
    }
    if (!hasPayload) {
        // GET REQUEST WITH QUERY STRING
        return (qs
            .stringify(data, {
            serializeDate: (d) => Math.floor(d.getTime() / 1000).toString(),
        })
            // Don't use strict form encoding by changing the square bracket control
            // characters back to their literals. This is fine by the server, and
            // makes these parameter strings easier to read.
            .replace(/%5B/g, '[')
            .replace(/%5D/g, ']'));
    }
    // POST PUT PATCH Requests
    return jsonStringify(data);
}
exports.stringifyRequestData = stringifyRequestData;
/**
 * Outputs a new function with interpolated object property values.
 * Use like so:
 *   const fn = makeURLInterpolator('some/url/{param1}/{param2}');
 *   fn({ param1: 123, param2: 456 }); // => 'some/url/123/456'
 */
exports.makeURLInterpolator = (() => {
    const rc = {
        '\n': '\\n',
        '"': '\\"',
        '\u2028': '\\u2028',
        '\u2029': '\\u2029',
    };
    return (str) => {
        const cleanString = str.replace(/["\n\r\u2028\u2029]/g, ($0) => rc[$0]);
        return (outputs) => {
            return cleanString.replace(/\{([\s\S]+?)\}/g, ($0, $1) =>
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            encodeURIComponent(outputs[$1] || ''));
        };
    };
})();
function extractUrlParams(path) {
    const params = path.match(/\{\w+\}/g);
    if (!params) {
        return [];
    }
    return params.map((param) => param.replace(/[{}]/g, ''));
}
exports.extractUrlParams = extractUrlParams;
/**
 * Return the data argument from a list of arguments
 *
 * @param {object[]} args
 * @returns {object}
 */
function getDataFromArgs(args) {
    if (!Array.isArray(args) || !args[0] || typeof args[0] !== 'object') {
        return {};
    }
    if (!isOptionsHash(args[0])) {
        return args.shift();
    }
    const argKeys = Object.keys(args[0]);
    const optionKeysInArgs = argKeys.filter((key) => OPTIONS_KEYS.includes(key));
    // In some cases options may be the provided as the first argument.
    // Here we're detecting a case where there are two distinct arguments
    // (the first being args and the second options) and with known
    // option keys in the first so that we can warn the user about it.
    if (optionKeysInArgs.length > 0 &&
        optionKeysInArgs.length !== argKeys.length) {
        emitWarning(`Options found in arguments (${optionKeysInArgs.join(', ')}). Did you mean to pass an options object? See passing-options paragraph in our README..`);
    }
    return {};
}
exports.getDataFromArgs = getDataFromArgs;
/**
 * Return the options hash from a list of arguments
 */
function getOptionsFromArgs(args) {
    const opts = {
        auth: null,
        host: null,
        headers: {},
        settings: {},
    };
    if (args.length > 0) {
        const arg = args[args.length - 1];
        if (typeof arg === 'string') {
            opts.auth = args.pop();
        }
        else if (isOptionsHash(arg)) {
            const params = Object.assign({}, args.pop());
            const extraKeys = Object.keys(params).filter((key) => !OPTIONS_KEYS.includes(key));
            if (extraKeys.length) {
                emitWarning(`Invalid options found (${extraKeys.join(', ')}); ignoring.`);
            }
            if (params.apiKey) {
                opts.auth = params.apiKey;
            }
            if (params.idempotencyKey) {
                opts.headers['Idempotency-Key'] = params.idempotencyKey;
            }
            if (params.narviAccount) {
                opts.headers['Narvi-Account'] = params.narviAccount;
            }
            if (params.apiVersion) {
                opts.headers['Narvi-Version'] = params.apiVersion;
            }
            if (Number.isInteger(params.maxNetworkRetries)) {
                opts.settings.maxNetworkRetries = params.maxNetworkRetries;
            }
            if (Number.isInteger(params.timeout)) {
                opts.settings.timeout = params.timeout;
            }
            if (params.host) {
                opts.host = params.host;
            }
        }
    }
    return opts;
}
exports.getOptionsFromArgs = getOptionsFromArgs;
/**
 * Remove empty values from an object
 */
function removeNullish(obj) {
    if (typeof obj !== 'object') {
        throw new Error('Argument must be an object');
    }
    return Object.keys(obj).reduce((result, key) => {
        if (obj[key] !== null) {
            result[key] = obj[key];
        }
        return result;
    }, {});
}
exports.removeNullish = removeNullish;
/**
 * Normalize standard HTTP Headers:
 * {'foo-bar': 'hi'}
 * becomes
 * {'Foo-Bar': 'hi'}
 */
function normalizeHeaders(obj) {
    if (!(obj && typeof obj === 'object')) {
        return obj;
    }
    return Object.keys(obj).reduce((result, header) => {
        result[normalizeHeader(header)] = obj[header];
        return result;
    }, {});
}
exports.normalizeHeaders = normalizeHeaders;
/**
 * Stolen from https://github.com/marten-de-vries/header-case-normalizer/blob/master/index.js#L36-L41
 * without the exceptions which are irrelevant to us.
 */
function normalizeHeader(header) {
    return header
        .split('-')
        .map((text) => text.charAt(0).toUpperCase() + text.substr(1).toLowerCase())
        .join('-');
}
exports.normalizeHeader = normalizeHeader;
function callbackifyPromiseWithTimeout(promise, callback) {
    if (callback) {
        // Ensure callback is called outside of promise stack.
        return promise.then((res) => {
            setTimeout(() => {
                callback(null, res);
            }, 0);
        }, (err) => {
            setTimeout(() => {
                callback(err, null);
            }, 0);
        });
    }
    return promise;
}
exports.callbackifyPromiseWithTimeout = callbackifyPromiseWithTimeout;
/**
 * Allow for special capitalization cases (such as OAuth)
 */
function pascalToCamelCase(name) {
    if (name === 'OAuth') {
        return 'oauth';
    }
    else {
        return name[0].toLowerCase() + name.substring(1);
    }
}
exports.pascalToCamelCase = pascalToCamelCase;
function emitWarning(warning) {
    if (typeof process.emitWarning !== 'function') {
        return console.warn(`Narvi: ${warning}`); /* eslint-disable-line no-console */
    }
    return process.emitWarning(warning, 'Narvi');
}
exports.emitWarning = emitWarning;
function isObject(obj) {
    const type = typeof obj;
    return (type === 'function' || type === 'object') && !!obj;
}
exports.isObject = isObject;
// For use in multipart requests
function flattenAndStringify(data) {
    const result = {};
    const step = (obj, prevKey) => {
        Object.keys(obj).forEach((key) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const value = obj[key];
            const newKey = prevKey ? `${prevKey}[${key}]` : key;
            if (isObject(value)) {
                if (!(value instanceof Uint8Array) &&
                    !Object.prototype.hasOwnProperty.call(value, 'data')) {
                    // Non-buffer non-file Objects are recursively flattened
                    return step(value, newKey);
                }
                else {
                    // Buffers and file objects are stored without modification
                    result[newKey] = value;
                }
            }
            else {
                // Primitives are converted to strings
                result[newKey] = String(value);
            }
        });
    };
    step(data, null);
    return result;
}
exports.flattenAndStringify = flattenAndStringify;
function validateInteger(name, n, defaultVal) {
    if (!Number.isInteger(n)) {
        if (defaultVal !== undefined) {
            return defaultVal;
        }
        else {
            throw new Error(`${name} must be an integer`);
        }
    }
    return n;
}
exports.validateInteger = validateInteger;
function determineProcessUserAgentProperties() {
    return typeof process === 'undefined'
        ? {}
        : {
            lang_version: process.version,
            platform: process.platform,
        };
}
exports.determineProcessUserAgentProperties = determineProcessUserAgentProperties;
/**
 * Joins an array of Uint8Arrays into a single Uint8Array
 */
function concat(arrays) {
    const totalLength = arrays.reduce((len, array) => len + array.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    arrays.forEach((array) => {
        merged.set(array, offset);
        offset += array.length;
    });
    return merged;
}
exports.concat = concat;
function protoExtend(sub) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const Super = this;
    const Constructor = Object.prototype.hasOwnProperty.call(sub, 'constructor')
        ? sub.constructor
        : function (...args) {
            Super.apply(this, args);
        };
    // This initialization logic is somewhat sensitive to be compatible with
    // divergent JS implementations like the one found in Qt.
    Object.assign(Constructor, Super);
    Constructor.prototype = Object.create(Super.prototype);
    Object.assign(Constructor.prototype, sub);
    return Constructor;
}
exports.protoExtend = protoExtend;
function getPathFromUrl(url) {
    var _a;
    // Removes query string if present
    return ((_a = url === null || url === void 0 ? void 0 : url.split('?')) === null || _a === void 0 ? void 0 : _a[0]) || '';
}
exports.getPathFromUrl = getPathFromUrl;
function getQueryFromUrl(url) {
    var _a;
    // Removes path string
    return ((_a = url === null || url === void 0 ? void 0 : url.split('?')) === null || _a === void 0 ? void 0 : _a[1]) || '';
}
exports.getQueryFromUrl = getQueryFromUrl;
function getPaginationCursor(url) {
    const result = qs.parse(getQueryFromUrl(url));
    return ((result === null || result === void 0 ? void 0 : result.cursor) || '');
}
exports.getPaginationCursor = getPaginationCursor;
function loadPrivateKeyFromFile(privateKeyFilePath) {
    const privatePem = fs.readFileSync(privateKeyFilePath);
    const privateKey = crypto.createPrivateKey({
        key: privatePem,
    });
    return privateKey;
}
exports.loadPrivateKeyFromFile = loadPrivateKeyFromFile;
function getNarviRequestSignature(params) {
    const { privateKey, url, method, requestID, queryParams, payload } = params;
    const hash_elems = [getPathFromUrl(url), method, requestID];
    if (!isEmpty(queryParams) && queryParams) {
        const queryParamsCanonical = jsonStringify(queryParams);
        hash_elems.push(queryParamsCanonical);
    }
    if (!isEmpty(payload) && payload) {
        const payloadCanonical = jsonStringify(payload);
        hash_elems.push(payloadCanonical);
    }
    const dataToHash = hash_elems.join('');
    const hash = crypto.createHash('sha256').update(dataToHash).digest();
    const hashHax = crypto.createHash('sha256').update(dataToHash).digest('hex');
    const signature = crypto.sign('sha256', hash, privateKey);
    const signatureString = signature.toString('base64');
    return signatureString;
}
exports.getNarviRequestSignature = getNarviRequestSignature;
