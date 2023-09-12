# Narvi API Documentation

Welcome to the Narvi API documentation! This guide provides detailed information on using the Narvi API, which follows
REST principles for ease of integration. Here are some key points to keep in mind:

## API Basics

- **Resource-Oriented URLs**: The Narvi API uses resource-oriented URLs to structure endpoints.
- **JSON Request and Response**: You can send JSON-encoded request bodies and expect JSON-encoded responses.
- **Standard HTTP Codes**: Narvi utilizes standard HTTP response codes for indicating success or failure.
- **Authentication**: Authentication is handled using API keys and private keys.

## Object Updates

Please note that the Narvi API does not support bulk updates. Each API request is designed to work on only one object at
a time.

## Installing Our Node Application

To get started with our Node.js application, you can run the following command to install it:

```bash
npm install --save narvi
```

## Authentication

Authentication for the Narvi API is crucial for security. We use API keys and private keys to verify requests. To manage
your API keys, visit our web application
at [my.narvi.com/settings/overview/api](https://my.narvi.com/settings/overview/api)

Remember, your API keys grant significant privileges, so keep them secure! Avoid sharing your secret API keys in
publicly accessible areas such as GitHub or client-side code.

To authenticate using our Node.js library, use the following code snippet:

```javascript
const Narvi = require('narvi');
const narvi = Narvi({
  apiKeyId: 'XXXXXXXX',
  privateKeyFilePath: './narvi_private.pem',
});
```

## Error Handling

Narvi employs conventional HTTP response codes to indicate the success or failure of an API request. Here's a general
breakdown:

- Codes in the 2xx range indicate success.
- Codes in the 4xx range signify an error resulting from the provided information (e.g., missing required parameters,
  charge failure, etc.).
- Codes in the 5xx range denote server errors, although these are rare.

Here are some specific error codes and their meanings:

- **200 - OK**: Everything worked as expected.
- **400 - Bad Request**: The request was unacceptable, often due to missing a required parameter.
- **401 - Unauthorized**: No valid API key or private key provided, which caused the request to have a bad signature.
- **402 - Request Failed**: The parameters were valid, but the request failed.
- **403 - Forbidden**: The API key lacks permissions to perform the request.
- **404 - Not Found**: The requested resource doesn't exist.
- **409 - Conflict**: The request conflicts with another request, perhaps due to using the same idempotent key.
- **429 - Too Many Requests**: Too many requests hit the API too quickly. We recommend an exponential backoff for your
  requests.
- **500, 502, 503, 504 - Server Errors**: Something went wrong on Narvi's end.

## Narvi API Endpoints and Transaction Payload

### API Endpoints

Narvi provides a range of API endpoints to interact with your account and perform transactions. Here are details on
these endpoints:

1. **List Accounts Endpoint**: Retrieve a list of accounts associated with your account.

   ```typescript
   const response = await narvi.accounts.list()
   ```

2. **Retrieve Account Endpoint**: Fetch detailed information about a specific account by providing its unique
   identifier.

   ```typescript
   const response = await narvi.accounts.retrieve(ACCOUNT_ID)
   ```

3. **Retrieve Transaction Endpoint**: Access detailed information about a specific transaction using its unique
   identifier.

   ```typescript
   const response = await narvi.transactions.retrieve(TRANSACTION_ID)
   ```

4. **List Transactions for an Account Endpoint**: Retrieve a list of transactions associated with a specific account.

   ```typescript
   const response = await narvi.transactions.list({ account_pid: ACCOUNT_ID })
   ```

5. **Create Transaction Endpoint**: Initiate a new transaction within the Narvi platform.

   ```typescript
   const response = await narvi.transactions.create(TRANSACTION_PAYLOAD)
   ```

### Transaction Payload

To create a new transaction using the Narvi API, you'll need to provide a payload object with the following structure:

```typescript
interface TransactionPayload {
  account_pid: string; // Unique identifier for the Narvi accountm e.g., 'A2ERSYBWO9KTC4I4'
  currency: string;    // Currency code, e.g., 'EUR'
  amount: number;      // Transaction amount in cents. For "EUR 120,00.99" it would be: 12099
  recipient: {
    name: string;      // Recipient's name, e.g. 'Simo Hayha'
    number: string;    // Recipient's bank account number e.g. 'FI4179600176830755'
    bic: string;       // Recipient's BIC (Bank Identifier Code) e.g.'NARYFIH2'
    address: string    // Recipient's address, usually a street name with number, e.g., 'Lapinlahdenkatu 16'
    city: string;      // Recipient's city name, e.g., 'Helsinki'
    zip_code: string;  // Recipient's zip code, e.g., '00180'
    country: string;   // Recipient's country code, e.g., 'FI'
  };
  remittance_information: {
    ustrd: string;     // Transfer title:, e.g., 'Payment for educational course'
  };
}
```

## 6. Pagination System

Narvi's API incorporates a robust pagination system that is designed to efficiently handle large datasets. This system utilizes cursor-based pagination, allowing you to navigate through lists of resources with ease. To work with the pagination system, you'll primarily interact with the `ApiSearchResult` interface, which is used for paginated responses, and the `RangeQueryParam` interface, which is used for filtering resources within a specific range.

### Pagination with `ApiSearchResult`

The `ApiSearchResult` interface defines the structure of paginated responses in Narvi's API. Here are its key properties:

- `results`: An array containing the current page of results. These are the resources you requested. Maximum of 20 items per one request.

- `next`: The absolute URL with a cursor token to use when fetching the next page of results. If `next` is `null`, it indicates that there are no further results to retrieve.

- `previous`: The absolute URL with a cursor token to use when fetching the previous page of results. If `previous` is `null`, it means you are on the first page of results.

### Using Cursors to Retrieve Resources

#### Retrieving the Next Page

To retrieve the next page of results, you can use the `next` cursor token provided in the `ApiSearchResult`. Here's an example of how to use it:

```typescript
const nextPageUrl = response.next; // an absolute URL to fetch the next page
const nextPageCursor = Narvi.getPaginationCursor(nextPageUrl); // Helper function to extract the cursor query param from the url
const nextPageResponse = await narvi.someEndpoint.list({ cursor: nextPageCursor });
```



This code fetches the next page of results using the `next` cursor obtained from the previous response.

#### Starting from a Specific Cursor

If you want to start fetching resources from a specific cursor obtained from a previous `ApiSearchResult` query, you can directly pass that cursor to the `.list({ cursor: string })` endpoint. Here's how to do it:

```typescript
const specificCursor = // Your specific cursor obtained from a previous response;
const specificCursorResponse = await narvi.someEndpoint.list({ cursor: specificCursor });
```

By using the cursor, you can pinpoint the exact position in the paginated dataset to begin fetching resources, providing fine-grained control over your data retrieval process.

### Filtering Resources with `RangeQueryParam`

Additionally, Narvi's API provides the `RangeQueryParam` interface, which you can use to filter resources based on specific criteria such as date range or amount range. These filters can be applied when making requests to certain endpoints that support filtering.

Example usage for filtering based on date and amount range:

```typescript
const response = await narvi.someFilteredEndpoint.list({
  added__gte: startTime,
  added__lte: endTime,
  amount__gte: minAmount,
  amount__lte: maxAmount
});

```

You can customize the filter criteria according to your application's needs.

By leveraging the pagination system, cursor-based navigation, and filtering capabilities, you can efficiently manage and retrieve the data you require from Narvi's API while ensuring a smooth user experience in your application.



For more details and examples, please refer to our official [Narvi API documentation](https://my.narvi.com/doc).

Happy integrating with Narvi! 🚀
