import { NodePlatformFunctions } from './platform/NodePlatformFunctions'
import { createNarvi } from './narvi.core'

export const Narvi = createNarvi(new NodePlatformFunctions())
export default Narvi
