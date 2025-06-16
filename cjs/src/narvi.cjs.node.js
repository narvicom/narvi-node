"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NodePlatformFunctions_1 = require("./platform/NodePlatformFunctions");
const narvi_core_1 = require("./narvi.core");
const Narvi = (0, narvi_core_1.createNarvi)(new NodePlatformFunctions_1.NodePlatformFunctions());
module.exports = Narvi;
// expose constructor as a named property to enable mocking with Sinon.JS
module.exports.Narvi = Narvi;
// Allow use with the TypeScript compiler without `esModuleInterop`.
// We may also want to add `Object.defineProperty(exports, "__esModule", {value: true});` in the future, so that Babel users will use the `default` version.
module.exports.default = Narvi;
