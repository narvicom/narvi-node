// File generated from our OpenAPI spec

declare module 'narvi' {
  namespace Narvi {
    /**
     * Transactions represents user Transactions
     */
    interface Transactions {
      pid: string,
      account_pid: string,
      amount: 0,
      fee: 0,
      currency: string,
      added: string
      recipient: {
        number: string,
        name: string,
        address: string,
        city: string,
        zip_code: string,
        country: string
      },
      remittance_information: {
        ustrd: string
      },
      source: 'WEB' | 'APP' | 'ACCOUNT_API',
      kind: 'CREDIT' | 'DEBIT' | 'FEE',
      status: 'PENDING' | 'DONE' | 'REJECTED' | 'CANCELLED'
    }

    namespace Transactions {}
  }
}
