import { NodePlatformFunctions } from './platform/NodePlatformFunctions'
import { createNarvi } from './narvi.core'

const Narvi = createNarvi(new NodePlatformFunctions())

module.exports = Narvi

// expose constructor as a named property to enable mocking with Sinon.JS
module.exports.Narvi = Narvi

// Allow use with the TypeScript compiler without `esModuleInterop`.
// We may also want to add `Object.defineProperty(exports, "__esModule", {value: true});` in the future, so that Babel users will use the `default` version.
module.exports.default = Narvi

