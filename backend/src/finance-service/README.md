# Finance Calculator Service

The Finance Calculator Service provides comprehensive loan calculation functionality for boat financing, including payment calculations, amortization schedules, and calculation management.

## Features

- **Loan Payment Calculations**: Calculate monthly payments, total interest, and total cost
- **Payment Schedule Generation**: Generate detailed amortization schedules
- **Multiple Scenario Comparison**: Compare different loan scenarios side-by-side
- **Calculation Persistence**: Save calculations for registered users
- **Calculation Sharing**: Share calculations via unique URLs
- **Interest Rate Suggestions**: Get suggested rates based on loan parameters

## API Endpoints

### Calculate Loan Payment
```
POST /finance/calculate
```

Calculate loan payment for given parameters.

**Request Body:**
```json
{
  "boatPrice": 100000,
  "downPayment": 20000,
  "interestRate": 6.5,
  "termMonths": 240,
  "includeSchedule": true,
  "listingId": "listing-123"
}
```

**Response:**
```json
{
  "calculation": {
    "calculationId": "calc-123",
    "boatPrice": 100000,
    "downPayment": 20000,
    "loanAmount": 80000,
    "interestRate": 6.5,
    "termMonths": 240,
    "monthlyPayment": 596.46,
    "totalInterest": 63150.04,
    "totalCost": 163150.04,
    "paymentSchedule": [...]
  }
}
```

### Calculate Multiple Scenarios
```
POST /finance/calculate/scenarios
```

Calculate multiple loan scenarios for comparison.

**Request Body:**
```json
{
  "baseParams": {
    "boatPrice": 100000,
    "downPayment": 20000,
    "interestRate": 6.5,
    "termMonths": 240
  },
  "scenarios": [
    { "interestRate": 5.5 },
    { "interestRate": 7.5 },
    { "termMonths": 180 },
    { "downPayment": 30000 }
  ],
  "listingId": "listing-123"
}
```

### Save Calculation
```
POST /finance/calculate/save
```

Save a calculation for a registered user (requires authentication).

**Request Body:**
```json
{
  "boatPrice": 100000,
  "downPayment": 20000,
  "interestRate": 6.5,
  "termMonths": 240,
  "listingId": "listing-123",
  "calculationNotes": "My boat financing calculation",
  "lenderInfo": {
    "name": "Marine Bank",
    "rate": 6.5,
    "terms": "20 years fixed"
  }
}
```

### Get User Calculations
```
GET /finance/calculations/{userId}?limit=20&listingId=listing-123
```

Retrieve saved calculations for a user (requires authentication).

### Share Calculation
```
POST /finance/share/{calculationId}
```

Generate a share token for a calculation (requires authentication).

**Response:**
```json
{
  "shareToken": "share-token-123",
  "shareUrl": "https://harborlist.com/finance/shared/share-token-123"
}
```

### Get Shared Calculation
```
GET /finance/calculations/shared/{shareToken}
```

Retrieve a shared calculation by token (no authentication required).

### Delete Calculation
```
DELETE /finance/calculations/{calculationId}
```

Delete a saved calculation (requires authentication).

### Get Suggested Interest Rates
```
GET /finance/rates/suggested?loanAmount=80000&termMonths=240
```

Get suggested interest rates based on loan parameters.

**Response:**
```json
{
  "suggestedRates": [5.5, 6.5, 7.5, 8.5],
  "loanAmount": 80000,
  "termMonths": 240
}
```

## Validation Rules

### Boat Price
- Minimum: $1,000
- Maximum: $10,000,000

### Down Payment
- Minimum: $0
- Maximum: 90% of boat price

### Interest Rate
- Minimum: 0%
- Maximum: 30%

### Loan Term
- Minimum: 12 months
- Maximum: 360 months (30 years)

### Loan Amount
- Minimum: $1,000 (after down payment)

## Calculation Formula

The service uses the standard amortization formula:

```
M = P * [r(1+r)^n] / [(1+r)^n - 1]
```

Where:
- M = Monthly payment
- P = Principal loan amount
- r = Monthly interest rate (annual rate / 12)
- n = Number of payments (months)

For 0% interest rate:
```
M = P / n
```

## Error Handling

The service provides comprehensive error handling with specific error codes:

- `VALIDATION_ERROR`: Invalid input parameters
- `CALCULATION_ERROR`: Calculation processing failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Access denied
- `INTERNAL_ERROR`: Server error

## Testing

Run the test suite:
```bash
npm test -- --testPathPattern=finance-service/finance.test.ts
```

The test suite covers:
- Loan payment calculations with various parameters
- Payment schedule generation
- Input validation and error handling
- Calculation saving and sharing
- Multiple scenario comparisons
- Authentication and authorization

## Dependencies

- AWS Lambda runtime
- DynamoDB for data persistence
- Shared utilities and database service
- TypeScript types from @harborlist/shared-types