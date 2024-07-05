import { NodePlatformFunctions } from './platform/NodePlatformFunctions'
import { createNarvi } from './narvi.core'

export { getNarviRequestHeaders, getNarviRequestSignature, getNarviRequestSignaturePayload } from "./utils";

export const Narvi = createNarvi(new NodePlatformFunctions())
export default Narvi


