// File generated from our OpenAPI spec

declare module 'narvi' {
  namespace Narvi {
    interface AccountsCreateParams {
      id: string
    }

    namespace AccountsCreateParams {}

    interface AccountsRetrieveParams {
      id: string
    }

    interface AccountsUpdateParams {
      id: string
    }

    namespace AccountsUpdateParams {}

    interface AccountsListParams extends PaginationParams {}

    class AccountsResource {
      create(
        params: AccountsCreateParams,
        options?: RequestOptions,
      ): Promise<Narvi.Response<Narvi.Accounts>>

      retrieve(
        id: string,
        params?: AccountsRetrieveParams,
        options?: RequestOptions,
      ): Promise<Narvi.Response<Narvi.Accounts>>
      retrieve(
        id: string,
        options?: RequestOptions,
      ): Promise<Narvi.Response<Narvi.Accounts>>

      update(
        id: string,
        params?: AccountsUpdateParams,
        options?: RequestOptions,
      ): Promise<Narvi.Response<Narvi.Accounts>>

      list(
        params?: AccountsListParams,
        options?: RequestOptions,
      ): ApiListPromise<Narvi.Accounts>
      list(options?: RequestOptions): ApiListPromise<Narvi.Accounts>
    }
  }
}
