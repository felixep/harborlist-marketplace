# Payment Processor Integration

This document describes the comprehensive payment processor integration implemented for the HarborList billing service, including Stripe and PayPal support with secure payment method management and PCI compliance.

## Overview

The payment processor integration provides:

- **Multi-processor support**: Stripe and PayPal integration with unified interface
- **Secure payment method management**: PCI-compliant payment method storage and handling
- **Configuration management**: Environment-specific processor configuration and health monitoring
- **Comprehensive error handling**: Robust error handling with proper security measures
- **Extensive testing**: Full test coverage for all payment operations

## Architecture

### Core Components

1. **Payment Processors** (`payment-processors/`)
   - `stripe.ts`: Stripe payment processor implementation
   - `paypal.ts`: PayPal payment processor implementation

2. **Payment Method Manager** (`payment-method-manager.ts`)
   - Secure payment method creation, storage, and management
   - PCI-compliant data handling and validation

3. **Configuration Manager** (`payment-processor-config.ts`)
   - Centralized processor configuration and health monitoring
   - Environment-specific settings and processor selection

4. **Main Service** (`index.ts`)
   - Enhanced billing service with payment method endpoints
   - Integration with existing billing operations

### Payment Processor Interface

All payment processors implement the `PaymentProcessor` interface:

```typescript
interface PaymentProcessor {
  createCustomer(userInfo: CustomerInfo): Promise<{ customerId: string }>;
  createPaymentMethod(customerId: string, paymentData: PaymentMethodData): Promise<{ paymentMethodId: string }>;
  createSubscription(customerId: string, priceId: string, paymentMethodId: string): Promise<SubscriptionResult>;
  processPayment(amount: number, currency: string, paymentMethodId: string): Promise<PaymentResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  updateSubscription(subscriptionId: string, updates: SubscriptionUpdateData): Promise<void>;
  processRefund(transactionId: string, amount?: number, reason?: string): Promise<RefundResult>;
  retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntentData>;
  retrieveSubscription(subscriptionId: string): Promise<SubscriptionData>;
  constructWebhookEvent(payload: string, signature: string): any;
  handleWebhookEvent(event: any): Promise<WebhookHandlerResult>;
}
```

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Payment Processing Configuration
PAYMENT_PROCESSOR=stripe                                    # Primary processor (stripe|paypal)
ENABLED_PAYMENT_PROCESSORS=stripe,paypal                   # Comma-separated list of enabled processors

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
STRIPE_RETURN_URL=http://local.harborlist.com:3000/payment/return
STRIPE_CANCEL_URL=http://local.harborlist.com:3000/payment/cancel

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id_here
PAYPAL_ENVIRONMENT=sandbox                                  # sandbox|live
PAYPAL_RETURN_URL=http://local.harborlist.com:3000/payment/return
PAYPAL_CANCEL_URL=http://local.harborlist.com:3000/payment/cancel

# Database Tables
PAYMENT_METHODS_TABLE=harborlist-payment-methods
BILLING_ACCOUNTS_TABLE=harborlist-billing-accounts
TRANSACTIONS_TABLE=harborlist-transactions
```

### Processor Selection

The system automatically selects the primary processor based on the `PAYMENT_PROCESSOR` environment variable. If the primary processor is unavailable, it falls back to the first available processor.

## API Endpoints

### Payment Method Management

#### Create Payment Method
```http
POST /billing/payment-methods
Content-Type: application/json

{
  "type": "card",
  "card": {
    "number": "4242424242424242",
    "exp_month": 12,
    "exp_year": 2025,
    "cvc": "123",
    "name": "John Doe"
  },
  "billing_details": {
    "name": "John Doe",
    "email": "john@example.com",
    "address": {
      "line1": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postal_code": "94105",
      "country": "US"
    }
  }
}
```

#### Get User Payment Methods
```http
GET /billing/payment-methods
Authorization: Bearer <jwt_token>
```

#### Update Payment Method
```http
PUT /billing/payment-methods/{paymentMethodId}
Content-Type: application/json

{
  "billingDetails": {
    "name": "John Smith",
    "email": "johnsmith@example.com"
  },
  "setAsDefault": true
}
```

#### Delete Payment Method
```http
DELETE /billing/payment-methods/{paymentMethodId}
Authorization: Bearer <jwt_token>
```

### Health Check

#### Get Processor Health Status
```http
GET /billing/health-check
```

Returns:
```json
{
  "healthStatus": {
    "stripe": {
      "type": "stripe",
      "healthy": true,
      "lastChecked": 1640995200000,
      "responseTime": 150,
      "capabilities": {
        "payments": true,
        "subscriptions": true,
        "refunds": true,
        "webhooks": true
      }
    },
    "paypal": {
      "type": "paypal",
      "healthy": true,
      "lastChecked": 1640995200000,
      "responseTime": 200,
      "capabilities": {
        "payments": true,
        "subscriptions": true,
        "refunds": true,
        "webhooks": true
      }
    }
  },
  "availableProcessors": ["stripe", "paypal"],
  "primaryProcessor": "stripe"
}
```

## Security Features

### PCI Compliance

- **No sensitive data storage**: Credit card numbers, CVV codes, and other sensitive payment data are never stored in our database
- **Tokenization**: All payment methods are tokenized through the payment processor
- **Secure transmission**: All payment data is transmitted over HTTPS with proper encryption
- **Input validation**: Comprehensive validation of all payment method data
- **Audit trails**: Complete audit logging for all payment operations

### Data Protection

- **Input sanitization**: All user input is sanitized to prevent XSS and injection attacks
- **Access control**: Payment methods can only be accessed by their owners
- **Secure storage**: Only safe metadata (last 4 digits, expiry dates, etc.) is stored locally
- **Error handling**: Errors are handled without exposing sensitive information

## Payment Method Types

### Card Payments (Stripe)

Supports all major credit and debit cards:
- Visa
- Mastercard
- American Express
- Discover
- And more

### PayPal Payments

Supports PayPal account payments and PayPal Credit.

### Bank Account Payments (Future)

ACH bank account payments will be supported in future versions.

## Error Handling

The system provides comprehensive error handling with specific error codes:

### Payment Method Errors
- `VALIDATION_ERROR`: Invalid payment method data
- `PAYMENT_METHOD_ERROR`: General payment method operation error
- `PROCESSOR_ERROR`: Payment processor-specific error

### Common Error Responses
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid payment method data: Invalid card number",
    "requestId": "req_123456789"
  }
}
```

## Testing

### Running Tests

```bash
# Run payment processor integration tests
npm test -- payment-processor-integration.test.ts

# Run all billing service tests
npm test -- billing-service/
```

### Test Coverage

The test suite covers:
- Stripe and PayPal processor initialization
- Payment method creation and validation
- Payment processing and subscription handling
- Error handling and security validation
- Configuration management and health checks

## Monitoring and Observability

### Health Checks

The system provides comprehensive health monitoring:
- Processor availability and response times
- Configuration validation
- Capability assessment
- Error tracking and alerting

### Logging

All payment operations are logged with:
- Request/response details (without sensitive data)
- Error information and stack traces
- Performance metrics
- Security events

### Metrics

Key metrics tracked:
- Payment success/failure rates
- Response times by processor
- Error rates and types
- Configuration health status

## Development Guidelines

### Adding New Payment Processors

1. Implement the `PaymentProcessor` interface
2. Add processor configuration to `PaymentProcessorConfigManager`
3. Update environment variable documentation
4. Add comprehensive tests
5. Update health check logic

### Security Best Practices

1. Never log sensitive payment data
2. Always validate input data
3. Use secure communication channels
4. Implement proper error handling
5. Follow PCI DSS guidelines

### Testing Guidelines

1. Mock all external payment processor calls
2. Test both success and failure scenarios
3. Validate input sanitization
4. Test configuration edge cases
5. Ensure proper error handling

## Troubleshooting

### Common Issues

#### Processor Initialization Failures
- Check environment variables are set correctly
- Verify API keys and secrets are valid
- Ensure network connectivity to processor APIs

#### Payment Method Creation Failures
- Validate payment method data format
- Check processor-specific requirements
- Verify customer exists in processor system

#### Configuration Issues
- Review environment variable names and values
- Check processor availability and health status
- Validate webhook configurations

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

This will provide detailed logging for all payment operations.

## Future Enhancements

### Planned Features

1. **Additional Payment Methods**
   - Apple Pay and Google Pay integration
   - Bank account (ACH) payments
   - Cryptocurrency payments

2. **Enhanced Security**
   - 3D Secure authentication
   - Fraud detection integration
   - Advanced risk scoring

3. **Improved Monitoring**
   - Real-time dashboards
   - Advanced analytics
   - Automated alerting

4. **Performance Optimizations**
   - Payment method caching
   - Batch operations
   - Connection pooling

## Support

For issues related to payment processor integration:

1. Check the troubleshooting section above
2. Review the test suite for examples
3. Check processor documentation (Stripe/PayPal)
4. Contact the development team

## References

- [Stripe API Documentation](https://stripe.com/docs/api)
- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PCI DSS Compliance Guide](https://www.pcisecuritystandards.org/)
- [HarborList Architecture Documentation](../../../docs/architecture/)