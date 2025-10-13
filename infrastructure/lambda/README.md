# HarborList API Gateway Lambda Authorizers

This directory contains Lambda authorizers for the HarborList dual Cognito User Pool architecture.

## Overview

The dual authentication system uses separate Lambda authorizers for customer and staff endpoints:

- **Customer Authorizer**: Validates tokens from the Customer User Pool for `/api/customer/*` endpoints
- **Staff Authorizer**: Validates tokens from the Staff User Pool for `/api/admin/*` endpoints

## Features

### Customer Authorizer (`customer-authorizer.ts`)
- Validates JWT tokens from Customer Cognito User Pool
- Extracts customer tier (Individual/Dealer/Premium) and permissions
- Prevents cross-pool access (staff tokens cannot access customer endpoints)
- Returns appropriate IAM policy documents for API Gateway
- Caches authorization results for performance

### Staff Authorizer (`staff-authorizer.ts`)
- Validates JWT tokens from Staff Cognito User Pool
- Enhanced security with shorter session TTL validation
- Extracts staff role and permissions from token claims
- Prevents cross-pool access (customer tokens cannot access staff endpoints)
- Integrates with existing admin interface routing
- Enhanced logging for security monitoring

## Cross-Pool Access Prevention

Both authorizers implement cross-pool access prevention by:

1. **Token Validation**: Checking for pool-specific claims in JWT tokens
2. **Claim Verification**: Validating that tokens contain expected user type indicators
3. **Error Responses**: Returning appropriate deny policies with error codes
4. **Audit Logging**: Logging cross-pool access attempts for security monitoring

### Customer Token Indicators
- Presence of `custom:customer_type` claim
- Absence of `custom:permissions` claim (staff-specific)
- `token_use` equals `access`

### Staff Token Indicators
- Presence of `custom:permissions` claim
- Absence of `custom:customer_type` claim (customer-specific)
- `token_use` equals `access`

## Environment Configuration

The authorizers support both AWS and LocalStack environments:

### Environment Variables
- `CUSTOMER_USER_POOL_ID`: Customer Cognito User Pool ID
- `CUSTOMER_USER_POOL_CLIENT_ID`: Customer User Pool Client ID
- `STAFF_USER_POOL_ID`: Staff Cognito User Pool ID
- `STAFF_USER_POOL_CLIENT_ID`: Staff User Pool Client ID
- `ENVIRONMENT`: Deployment environment (local/dev/staging/prod)
- `DEPLOYMENT_TARGET`: Target platform (aws/localstack)
- `AWS_REGION`: AWS region for Cognito service
- `COGNITO_ENDPOINT`: Custom endpoint for LocalStack (optional)
- `STAFF_SESSION_TTL`: Maximum session duration for staff tokens (seconds)

## Deployment

The authorizers are deployed as part of the `DualAuthAuthorizersConstruct` CDK construct:

```typescript
import { DualAuthAuthorizersConstruct } from './lib/dual-auth-authorizers-construct';

const authorizers = new DualAuthAuthorizersConstruct(this, 'DualAuthAuthorizers', {
  environment: 'dev',
  customerUserPoolId: customerStack.userPool.userPoolId,
  customerUserPoolClientId: customerStack.userPoolClient.userPoolClientId,
  staffUserPoolId: staffStack.userPool.userPoolId,
  staffUserPoolClientId: staffStack.userPoolClient.userPoolClientId,
  restApi: api,
});
```

## API Gateway Integration

The authorizers are integrated with API Gateway using Token Authorizers:

### Customer Endpoints
- `/api/customer/auth/*` - No authorization (login/register)
- `/api/customer/profile` - Customer authorization required
- `/api/customer/listings` - Customer authorization required
- `/api/customer/search` - Customer authorization required

### Staff Endpoints
- `/api/admin/auth/*` - No authorization (login/refresh)
- `/api/admin/dashboard` - Staff authorization required
- `/api/admin/users` - Staff authorization required
- `/api/admin/listings` - Staff authorization required
- `/api/admin/*` - Staff authorization required (catch-all)

## Error Handling

The authorizers return appropriate error codes for different failure scenarios:

### Common Error Codes
- `INVALID_TOKEN_FORMAT`: Authorization header not in Bearer format
- `TOKEN_EXPIRED`: JWT token has expired
- `INVALID_SIGNATURE`: Token signature is invalid
- `INVALID_AUDIENCE`: Token audience doesn't match expected client ID
- `CROSS_POOL_ACCESS`: Token from wrong user pool attempting access

### Staff-Specific Error Codes
- `SESSION_EXPIRED`: Staff token has exceeded maximum session duration

## Testing

Run the test suite:

```bash
npm test
```

The test suite covers:
- Valid token authorization
- Cross-pool access prevention
- Invalid token handling
- Session expiration (staff)
- Error response formatting

## Security Considerations

### Token Validation
- JWT signature verification using Cognito JWKS
- Token expiration checking
- Audience validation
- Issuer validation

### Enhanced Staff Security
- Shorter session TTL validation (8 hours default)
- Enhanced logging for security events
- MFA challenge handling (future enhancement)

### Cross-Pool Prevention
- Pool-specific claim validation
- Comprehensive error logging
- Audit trail for security monitoring

## Performance

### Caching
- API Gateway caches authorization results for 5 minutes
- JWKS keys are cached to reduce external calls
- Token validation results are cached per request

### Optimization
- Minimal Lambda cold start time
- Efficient JWT validation
- Optimized error handling paths

## Monitoring

### CloudWatch Logs
- All authorization events are logged
- Error details included for debugging
- Performance metrics tracked

### Metrics
- Authorization success/failure rates
- Cross-pool access attempts
- Token validation latency
- Cache hit/miss ratios

## Troubleshooting

### Common Issues

1. **Cross-Pool Access Denied**
   - Verify token is from correct user pool
   - Check token claims for user type indicators
   - Review authorization logs for details

2. **Token Validation Failures**
   - Verify Cognito User Pool configuration
   - Check JWKS endpoint accessibility
   - Validate token format and structure

3. **Session Expired (Staff)**
   - Check `STAFF_SESSION_TTL` configuration
   - Verify token `iat` (issued at) claim
   - Consider token refresh flow

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in environment variables.

## Future Enhancements

- MFA challenge integration
- Rate limiting per user
- Advanced threat detection
- Token refresh automation
- Performance optimizations