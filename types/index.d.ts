///<reference path='./lib.d.ts' />
///<reference path='./crypto/crypto.d.ts' />
///<reference path='./shared.d.ts' />
///<reference path='./Errors.d.ts' />
// Imports: The beginning of the section generated from our OpenAPI spec
///<reference path='./AccountsResource.d.ts' />
///<reference path='./TransactionsResource.d.ts' />
// Imports: The end of the section generated from our OpenAPI spec

import { KeyObject } from "crypto";
import { RequestData } from "../src/Types";

declare module 'narvi' {
  // Added to in other modules, referenced above.
  export namespace Narvi {
    interface SignRequestParams {
      privateKey: KeyObject;
      url: string;
      method: string;
      requestID: string;
      queryParams?: any;
      payload?: any;
    }

    interface GetNarviRequestHeadersParams {
      apiKeyId: string;
      requestID: string;
      signature: string;
    }

    interface GetNarviSignaturePayloadParams {
      privateKey: KeyObject;
      url: string;
      method: string;
      requestID: string;
      queryParams?: any;
      payload?: any;
    }
  }

  export class Narvi {
    static Narvi: typeof Narvi

    constructor(config: Narvi.NarviConfig)

    NarviResource: Narvi.NarviResource

    // Fields: The beginning of the section generated from our OpenAPI spec
    accounts: Narvi.AccountsResource
    transactions: Narvi.TransactionsResource
    // Fields: The end of the section generated from our OpenAPI spec
    /**
     * API Errors
     */
        // errors: typeof Narvi.errors
    static getPaginationCursor: (url: string) => string
    static getNarviRequestSignature: (params: Narvi.SignRequestParams) => string
    static getNarviRequestHeaders: (params: Narvi.GetNarviRequestHeadersParams) => Record<string, string>
    static getNarviRequestSignaturePayload: (params: Narvi.GetNarviSignaturePayloadParams) => {
      privateKey: KeyObject;
      url: string;
      method: string;
      requestID: string;
      queryParams?: RequestData;
      payload?: RequestData;
    }


  }


  export default Narvi
}
