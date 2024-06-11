declare module 'narvi' {
  namespace Narvi {
    /**
     * Set of key-value pairs that you can attach to an object. This can be useful for storing additional information about the object in a structured format.
     */
    interface Metadata {
      [name: string]: string
    }

    /**
     * Set of key-value pairs that you can attach to an object. This can be useful for storing additional information about the object in a structured format.
     * While you can send values as numbers, they will be returned as strings.
     */
    interface MetadataParam {
      [name: string]: string | number | null
    }

    /**
     * The Address object.
     */
    interface Address {
      /**
       * City/District/Suburb/Town/Village.
       */
      city: string | null

      /**
       * 2-letter country code.
       */
      country: string | null

      /**
       * Address line 1 (Street address/PO Box/Company name).
       */
      line1: string | null

      /**
       * Address line 2 (Apartment/Suite/Unit/Building).
       */
      line2: string | null

      /**
       * ZIP or postal code.
       */
      postal_code: string | null

      /**
       * State/County/Province/Region.
       */
      state: string | null
    }

    interface JapanAddress {
      /**
       * City/Ward.
       */
      city: string | null

      /**
       * Two-letter country code ([ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)).
       */
      country: string | null

      /**
       * Block/Building number.
       */
      line1: string | null

      /**
       * Building details.
       */
      line2: string | null

      /**
       * Zip/Postal Code.
       */
      postal_code: string | null

      /**
       * Prefecture.
       */
      state: string | null

      /**
       * Town/cho-me.
       */
      town: string | null
    }

    interface AddressParam {
      /**
       * City, district, suburb, town, village, or ward.
       */
      city?: string

      /**
       * Two-letter country code ([ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)).
       */
      country?: string

      /**
       * Address line 1 (e.g., street, block, PO Box, or company name).
       */
      line1?: string

      /**
       * Address line 2 (e.g., apartment, suite, unit, or building).
       */
      line2?: string

      /**
       * ZIP or postal code.
       */
      postal_code?: string

      /**
       * State, county, province, prefecture, or region.
       */
      state?: string
    }

    interface ShippingAddressParam extends AddressParam {
      /**
       * Address line 1 (e.g., street, PO Box, or company name).
       */
      line1: string
    }

    interface JapanAddressParam extends AddressParam {
      /**
       * Town or cho-me.
       */
      town?: string
    }

    /**
     * The resulting source of [a Connect platform debiting a connected account]
     */
    type AccountDebitSource = {
      id: string
      object: 'account'
    }

    interface RangeQueryParam {
      /**
       * Minimum date value to filter by (inclusive)
       */
      added__gte?: number

      /**
       * Maximum value to filter by (inclusive)
       */
      added__lte?: number

      /**
       * Minimum amount value to filter by (inclusive)
       */
      amount__gte?: number

      /**
       * Maximum amount value to filter by (inclusive)
       */
      amount__lte?: number
    }

    interface PaginationParams {
      /**
       * A cursor for use in pagination. `cursor` is a cursor ID that defines your place in the list. For instance, if you make a list request and receive the first 20 objects, your subsequent call can look like that `await.accounts.list({ cursor: CURSOR_ID })` in order to fetch the next page of the list.
       */

    }
  }
}
