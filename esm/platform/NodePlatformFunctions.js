import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { concat } from '../utils/utils';
import { NodeHttpClient } from '../http/NodeHttpClient';
import { PlatformFunctions } from './PlatformFunctions';
import { NodeCryptoProvider } from '../crypto/NodeCryptoProvider';
import { NarviError } from '../errors/Errors';
import { SubtleCryptoProvider } from '../crypto/SubtleCryptoProvider';
class StreamProcessingError extends NarviError {
}
/**
 * Specializes WebPlatformFunctions using APIs available in Node.js.
 */
export class NodePlatformFunctions extends PlatformFunctions {
    constructor() {
        super();
        this._exec = exec;
        this._UNAME_CACHE = null;
    }
    /** @override */
    uuid4() {
        // available in: v14.17.x+
        if (crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return super.uuid4();
    }
    /**
     * @override
     * Node's built in `exec` function sometimes throws outright,
     * and sometimes has a callback with an error,
     * depending on the type of error.
     *
     * This unifies that interface by resolving with a null uname
     * if an error is encountered.
     */
    getUname() {
        if (!this._UNAME_CACHE) {
            this._UNAME_CACHE = new Promise((resolve, reject) => {
                try {
                    this._exec('uname -a', (err, uname) => {
                        if (err) {
                            return resolve(null);
                        }
                        resolve(uname);
                    });
                }
                catch (e) {
                    resolve(null);
                }
            });
        }
        return this._UNAME_CACHE;
    }
    /**
     * @override
     * Secure compare, from https://github.com/freewil/scmp
     */
    secureCompare(a, b) {
        if (!a || !b) {
            throw new Error('secureCompare must receive two arguments');
        }
        // return early here if buffer lengths are not equal since timingSafeEqual
        // will throw if buffer lengths are not equal
        if (a.length !== b.length) {
            return false;
        }
        // use crypto.timingSafeEqual if available (since Node.js v6.6.0),
        // otherwise use our own scmp-internal function.
        if (crypto.timingSafeEqual) {
            const textEncoder = new TextEncoder();
            const aEncoded = textEncoder.encode(a);
            const bEncoded = textEncoder.encode(b);
            return crypto.timingSafeEqual(aEncoded, bEncoded);
        }
        return super.secureCompare(a, b);
    }
    createEmitter() {
        return new EventEmitter();
    }
    /** @override */
    tryBufferData(data) {
        if (!(data.file.data instanceof EventEmitter)) {
            return Promise.resolve(data);
        }
        const bufferArray = [];
        return new Promise((resolve, reject) => {
            data.file.data
                .on('data', (line) => {
                bufferArray.push(line);
            })
                .once('end', () => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const bufferData = Object.assign({}, data);
                bufferData.file.data = concat(bufferArray);
                resolve(bufferData);
            })
                .on('error', (err) => {
                reject(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                new StreamProcessingError({
                    message: 'An error occurred while attempting to process the file for upload.',
                    detail: err,
                }));
            });
        });
    }
    /** @override */
    createNodeHttpClient(agent) {
        return new NodeHttpClient(agent);
    }
    /** @override */
    createDefaultHttpClient() {
        return new NodeHttpClient();
    }
    /** @override */
    createNodeCryptoProvider() {
        return new NodeCryptoProvider();
    }
    /**
     * Creates a CryptoProvider which uses the SubtleCrypto interface of the Web Crypto API.
     */
    createSubtleCryptoProvider(subtleCrypto) {
        return new SubtleCryptoProvider(subtleCrypto);
    }
    /** @override */
    createDefaultCryptoProvider() {
        return this.createNodeCryptoProvider();
    }
}
