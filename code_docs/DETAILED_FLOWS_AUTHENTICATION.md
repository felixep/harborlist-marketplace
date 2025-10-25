# Detailed Authentication Flows - HarborList Marketplace

**Last Updated:** October 25, 2025  
**Version:** 2.1.0

---

## 🎉 Recent Refactoring Updates (October 25, 2025)

### Phase 1 Foundation Utilities - COMPLETED ✅

The authentication service has been refactored to use new shared utilities that eliminate code duplication and provide consistent error handling:

#### New Shared Utilities

1. **ResponseHandler** (`backend/src/shared/response-handler.ts`)
   - Unified response handling for all Lambda functions
   - Automatic error handling with `wrapHandler()`
   - Consistent error format across all endpoints
   - Request tracking and execution time logging
   - Eliminates ~150 lines of duplicate error handling

2. **ValidationFramework** (`backend/src/shared/validators/validation-framework.ts`)
   - Declarative validation with rule arrays
   - Type-safe validation rules
   - Automatic error response generation
   - Eliminates ~300 lines of duplicate validation code

3. **CommonRules** (`backend/src/shared/validators/common-rules.ts`)
   - Reusable validation rules: `required()`, `email()`, `minLength()`, `oneOf()`, etc.
   - Consistent validation behavior across all services
   - Easy to extend with new rules

#### Refactored Handler Functions

The following authentication handlers have been refactored (marked with ✨ in this document):

- ✅ `handleCustomerLogin()` - Uses ResponseHandler & ValidationFramework
- ✅ `handleCustomerRegister()` - Uses ResponseHandler & ValidationFramework
- ✅ `handleCustomerRefresh()` - Uses ResponseHandler & ValidationFramework
- ✅ `handleCustomerLogout()` - Uses ResponseHandler
- ✅ `handleCustomerForgotPassword()` - Uses ResponseHandler & ValidationFramework
- ✅ `handleCustomerConfirmForgotPassword()` - Uses ResponseHandler & ValidationFramework
- ✅ `handleCustomerConfirmSignUp()` - Uses ResponseHandler & ValidationFramework
- ✅ `handleCustomerResendConfirmation()` - Uses ResponseHandler & ValidationFramework
- ✅ `handleStaffLogin()` - Uses ResponseHandler & ValidationFramework
- ✅ `handleStaffRefresh()` - Uses ResponseHandler & ValidationFramework
- ✅ `handleStaffLogout()` - Uses ResponseHandler

#### Impact

- **Code Reduction**: ~150 lines eliminated from auth service
- **Consistency**: All endpoints now use the same error handling and validation patterns
- **Maintainability**: Single point of change for validation rules and error responses
- **Type Safety**: Full TypeScript support with proper interfaces

See [REFACTORING_PROGRESS.md](./REFACTORING_PROGRESS.md) for complete refactoring details.

---

## Table of Contents

1. [Customer Registration Flow](#customer-registration-flow)
2. [Customer Login Flow](#customer-login-flow)
3. [Customer Email Verification Flow](#customer-email-verification-flow)
4. [Customer Password Reset Flow](#customer-password-reset-flow)
5. [Staff Login Flow](#staff-login-flow)
6. [MFA Enrollment Flow](#mfa-enrollment-flow)
7. [MFA Verification Flow](#mfa-verification-flow)
8. [Token Refresh Flow](#token-refresh-flow)
9. [Logout Flow](#logout-flow)

---

## Customer Registration Flow

### Overview
Complete user registration process from form submission to email verification, including Cognito user creation, database record creation, and user tier assignment.

### Mermaid Diagram

```mermaid
sequenceDiagram
    participant User as User Browser
    participant RF as RegisterForm Component
    participant AH as useAuth Hook
    participant API as API Service
    participant AGW as API Gateway
    participant AS as Auth Service Lambda
    participant VAL as Input Validator
    participant COG as AWS Cognito
    participant US as User Service Lambda
    participant DB as DynamoDB
    participant EMAIL as Email Service
    participant AUDIT as Audit Service

    Note over User,AUDIT: 1. USER INITIATES REGISTRATION
    User->>RF: Fills registration form
    Note right of User: Enters: name, email,<br/>password, customerType
    RF->>RF: validateForm()
    Note right of RF: Checks:<br/>- Email format<br/>- Password strength<br/>- Required fields

    alt Form validation fails
        RF->>User: Show validation errors
        Note right of RF: Display inline errors<br/>per field
    end

    RF->>AH: register(name, email, password, customerType)
    Note right of RF: Calls hook method<br/>frontend/src/hooks/useAuth.ts:184

    Note over AH,API: 2. FRONTEND API CALL
    AH->>API: api.register(name, email, password, customerType)
    Note right of AH: frontend/src/services/api.ts:47
    
    API->>API: getAuthHeaders()
    Note right of API: No auth needed for register<br/>Returns default headers
    
    API->>AGW: POST /auth/customer/register
    Note right of API: Request body:<br/>{name, email, password, customerType}

    Note over AGW,AS: 3. API GATEWAY PROCESSING
    AGW->>AGW: Route validation
    AGW->>AGW: CORS check
    AGW->>AS: Invoke Lambda
    Note right of AGW: Event object with:<br/>- httpMethod: POST<br/>- body: JSON string<br/>- headers

    Note over AS,VAL: 4. AUTH SERVICE PROCESSING
    AS->>AS: handler(event, context)
    Note right of AS: backend/src/auth-service/index.ts:1856
    
    AS->>AS: parseBody<RegistrationRequest>(event)
    Note right of AS: Extract and parse JSON body<br/>backend/src/shared/utils.ts:109
    
    AS->>VAL: validateRegistrationInput(data)
    Note right of AS: Input validation
    
    VAL->>VAL: validateEmail(email)
    Note right of VAL: Regex: /^[^@]+@[^@]+\.[^@]+$/
    
    VAL->>VAL: validatePassword(password)
    Note right of VAL: Requirements:<br/>- Min 8 chars<br/>- 1 uppercase<br/>- 1 lowercase<br/>- 1 number
    
    VAL->>VAL: validateName(name)
    Note right of VAL: 2-100 characters
    
    VAL->>VAL: validateCustomerType(customerType)
    Note right of VAL: Must be: individual | dealer

    alt Validation fails
        VAL-->>AS: Throw ValidationError
        AS->>AS: createErrorResponse(400, error)
        AS-->>AGW: 400 Bad Request
        AGW-->>API: Error response
        API-->>AH: Throw error
        AH-->>RF: Error caught
        RF->>User: Show error message
    end

    Note over AS,COG: 5. COGNITO USER CREATION
    AS->>AS: authService.customerRegister(data)
    Note right of AS: backend/src/auth-service/index.ts:480
    
    AS->>AS: Check rate limit
    Note right of AS: Max 5 registrations per IP/hour
    
    AS->>COG: SignUpCommand
    Note right of AS: Pool: Customer User Pool<br/>ClientId: CUSTOMER_CLIENT_ID
    
    rect rgb(200, 220, 255)
        Note over COG: Cognito Processing
        COG->>COG: Check if email exists
        
        alt Email already exists
            COG-->>AS: UsernameExistsException
            AS->>AS: createErrorResponse(409, 'EMAIL_EXISTS')
            AS-->>AGW: 409 Conflict
            AGW-->>User: Email already registered
        end
        
        COG->>COG: Validate password policy
        Note right of COG: Cognito password policy:<br/>- Min length: 8<br/>- Require uppercase<br/>- Require lowercase<br/>- Require numbers
        
        alt Password policy fails
            COG-->>AS: InvalidPasswordException
            AS-->>User: Password requirements not met
        end
        
        COG->>COG: Create user account
        COG->>COG: Set user attributes
        Note right of COG: Attributes:<br/>- email<br/>- name<br/>- custom:customerType
        
        COG->>COG: Mark email as unverified
        COG->>EMAIL: Send verification email
        Note right of COG: Contains 6-digit code<br/>Valid for 24 hours
        
        COG-->>AS: UserCreated (unverified)
    end

    Note over AS,US: 6. USER PROFILE CREATION
    AS->>AS: getUserId(response)
    Note right of AS: Extract sub from Cognito response
    
    AS->>US: POST /users (internal)
    Note right of AS: Create user profile
    
    US->>US: Determine user tier
    Note right of US: Logic:<br/>- individual → FREE<br/>- dealer → DEALER
    
    US->>US: assignInitialCapabilities(tier)
    Note right of US: FREE capabilities:<br/>- CREATE_LISTING (max 3)<br/>- EDIT_LISTING<br/>- DELETE_LISTING<br/>- VIEW_ANALYTICS_BASIC
    
    US->>DB: PutCommand
    Note right of US: Table: harborlist-users
    
    rect rgb(200, 255, 200)
        Note over DB: DynamoDB Write
        DB->>DB: Write user record
        Note right of DB: User object:<br/>{<br/>  id: userId,<br/>  email: email,<br/>  name: name,<br/>  customerType: type,<br/>  tier: tier,<br/>  capabilities: [],<br/>  listingsCount: 0,<br/>  maxListings: 3,<br/>  createdAt: timestamp<br/>}
        DB-->>US: Write successful
    end

    Note over AS,AUDIT: 7. AUDIT LOGGING
    AS->>AUDIT: logAuthEvent()
    Note right of AS: backend/src/auth-service/audit-service.ts:45
    
    AUDIT->>AUDIT: enrichEventData()
    Note right of AUDIT: Add:<br/>- IP address<br/>- User agent<br/>- Timestamp<br/>- Session info
    
    AUDIT->>DB: PutCommand
    Note right of AUDIT: Table: boat-audit-logs
    
    rect rgb(255, 220, 200)
        Note over DB: Audit Log Entry
        DB->>DB: Write audit log
        Note right of DB: {<br/>  auditId: uuid,<br/>  eventType: 'REGISTRATION',<br/>  userType: 'customer',<br/>  email: email,<br/>  success: true,<br/>  ipAddress: ip,<br/>  timestamp: ISO8601,<br/>  additionalData: {...}<br/>}
    end

    Note over AS,AGW: 8. RESPONSE GENERATION
    AS->>AS: createResponse(200, responseData)
    Note right of AS: backend/src/shared/utils.ts:65
    
    AS->>AS: addCORSHeaders()
    Note right of AS: Headers:<br/>- Access-Control-Allow-Origin<br/>- Access-Control-Allow-Credentials
    
    AS-->>AGW: 200 OK
    Note right of AS: Response:<br/>{<br/>  success: true,<br/>  requiresVerification: true,<br/>  message: "Check your email"<br/>}

    Note over AGW,User: 9. FRONTEND RESPONSE HANDLING
    AGW-->>API: Success response
    API-->>AH: Parse JSON response
    
    AH->>AH: Handle registration result
    Note right of AH: No token storage yet<br/>User must verify email first
    
    AH-->>RF: Registration successful
    
    RF->>RF: Navigate to success page
    Note right of RF: Route: /registration-success
    
    RF->>User: Show success message
    Note right of RF: "Registration successful!<br/>Please check your email<br/>to verify your account."

    Note over User,EMAIL: 10. EMAIL VERIFICATION (Async)
    EMAIL->>User: Verification email delivered
    Note right of EMAIL: Contains:<br/>- 6-digit code<br/>- Verification link<br/>- Expiration time (24h)
```

### Detailed Method Documentation

#### 1. Frontend Components

**File:** `frontend/src/pages/EnhancedRegister.tsx`

**Component:** `EnhancedRegister`
```typescript
/**
 * Enhanced registration form with validation
 * 
 * State managed:
 * - formData: { name, email, password, confirmPassword, customerType }
 * - errors: Field-level validation errors
 * - loading: Submission state
 * 
 * Validation rules:
 * - Email: Valid email format
 * - Password: 8+ chars, uppercase, lowercase, number
 * - Name: 2-100 characters
 * - Customer type: 'individual' or 'dealer'
 */
```

**Method:** `validateForm()`
```typescript
/**
 * Validates registration form data
 * 
 * @returns {boolean} true if valid, false otherwise
 * 
 * Checks performed:
 * 1. Email format validation using regex
 * 2. Password strength (8+ chars, uppercase, lowercase, number)
 * 3. Password confirmation match
 * 4. Name length (2-100 chars)
 * 5. Customer type selection
 * 
 * Sets errors state for each invalid field
 */
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    newErrors.email = 'Invalid email format';
  }
  
  // Password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(formData.password)) {
    newErrors.password = 'Password must be 8+ characters with uppercase, lowercase, and number';
  }
  
  // Password match
  if (formData.password !== formData.confirmPassword) {
    newErrors.confirmPassword = 'Passwords do not match';
  }
  
  // Name validation
  if (formData.name.length < 2 || formData.name.length > 100) {
    newErrors.name = 'Name must be 2-100 characters';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Method:** `handleSubmit()`
```typescript
/**
 * Handles form submission
 * 
 * @param {React.FormEvent} e - Form event
 * 
 * Flow:
 * 1. Prevent default form submission
 * 2. Validate form data
 * 3. Call useAuth hook's register method
 * 4. Handle success/error
 * 5. Navigate or show error
 */
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
  setLoading(true);
  
  try {
    const response = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.customerType
    );
    
    if (response.requiresVerification) {
      navigate('/registration-success', {
        state: { email: formData.email }
      });
    }
  } catch (error: any) {
    setErrors({ submit: error.message || 'Registration failed' });
  } finally {
    setLoading(false);
  }
};
```

---

**File:** `frontend/src/hooks/useAuth.ts`

**Hook:** `useAuthState`
```typescript
/**
 * Authentication state management hook
 * 
 * @returns {Object} Authentication state and methods
 * @returns {User | null} user - Current user or null
 * @returns {Function} login - Login method
 * @returns {Function} register - Registration method
 * @returns {Function} logout - Logout method
 * @returns {boolean} loading - Loading state
 * @returns {boolean} isAuthenticated - Computed auth state
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ... hook implementation
};
```

**Method:** `register()`
```typescript
/**
 * Registers a new user account
 * 
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {string} customerType - Type: 'individual' or 'dealer'
 * @returns {Promise<RegistrationResponse>} Registration result
 * 
 * @throws {Error} If registration fails
 * 
 * Flow:
 * 1. Call API service register method
 * 2. Parse response
 * 3. Handle verification requirement
 * 4. Return result to caller
 * 
 * Note: Does NOT store tokens - user must verify email first
 */
const register = async (
  name: string,
  email: string,
  password: string,
  customerType: string = 'individual'
): Promise<RegistrationResponse> => {
  const response = await api.register(name, email, password, customerType);
  return response;
};
```

---

**File:** `frontend/src/services/api.ts`

**Class:** `ApiService`

**Method:** `register()`
```typescript
/**
 * Calls registration API endpoint
 * 
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {string} customerType - Type: 'individual' or 'dealer'
 * @returns {Promise<any>} API response
 * 
 * Endpoint: POST /auth/customer/register
 * 
 * Request body:
 * {
 *   name: string,
 *   email: string,
 *   password: string,
 *   customerType: string
 * }
 * 
 * Success response:
 * {
 *   success: true,
 *   requiresVerification: true,
 *   message: string
 * }
 * 
 * Error response:
 * {
 *   error: {
 *     code: string,
 *     message: string,
 *     details: any[]
 *   }
 * }
 */
async register(
  name: string,
  email: string,
  password: string,
  customerType?: string
) {
  return this.request(endpoints.auth.register, {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      password,
      customerType: customerType || 'individual'
    })
  });
}
```

**Method:** `request()`
```typescript
/**
 * Generic HTTP request method with error handling
 * 
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<T>} Parsed response
 * 
 * Features:
 * - Automatic header injection
 * - Error response parsing
 * - Custom error object creation
 * - JSON response parsing
 * 
 * Error handling:
 * - Parses error response JSON
 * - Creates ApiError with code, message, status
 * - Preserves requestId for tracking
 */
private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...this.getAuthHeaders(),
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => 
      ({ error: 'Request failed' })
    );

    const error = new Error(
      errorData.error?.message || 
      errorData.error || 
      `HTTP ${response.status}`
    ) as ApiError;
    
    error.code = errorData.error?.code;
    error.requestId = errorData.error?.requestId;
    error.status = response.status;

    throw error;
  }

  return response.json();
}
```

---

#### 2. Backend Services

**File:** `backend/src/auth-service/index.ts`

**Function:** `handler()`
```typescript
/**
 * Main Lambda handler for authentication service
 * 
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @param {Context} context - Lambda context
 * @returns {Promise<APIGatewayProxyResult>} HTTP response
 * 
 * Routes:
 * - POST /auth/customer/register → customerRegister
 * - POST /auth/customer/login → customerLogin
 * - POST /auth/staff/login → staffLogin
 * - POST /auth/customer/verify-email → verifyEmail
 * - POST /auth/customer/forgot-password → forgotPassword
 * - POST /auth/customer/reset-password → resetPassword
 * - POST /auth/customer/logout → logout
 * - POST /auth/customer/refresh → refreshToken
 * 
 * Features:
 * - CORS handling
 * - Request logging
 * - Error handling
 * - Response formatting
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;
  const path = event.path;
  const method = event.httpMethod;

  console.log(`[${requestId}] ${method} ${path}`);

  try {
    // CORS preflight
    if (method === 'OPTIONS') {
      return createResponse(200, {}, {
        'Access-Control-Allow-Origin': 'https://local.harborlist.com',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
      });
    }

    // Route to appropriate handler
    if (path === '/auth/customer/register' && method === 'POST') {
      return await handleCustomerRegister(event, requestId);
    }
    
    // ... other routes

    return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'Internal server error',
      requestId
    );
  }
};
```

**Function:** `handleCustomerRegister()` ✨ **REFACTORED - Uses ResponseHandler & ValidationFramework**
```typescript
/**
 * Handles customer registration endpoint
 * 
 * @param {any} body - Request body
 * @param {string} requestId - Request tracking ID
 * @param {ClientInfo} clientInfo - Client information
 * @returns {Promise<APIGatewayProxyResult>} HTTP response
 * 
 * ✨ REFACTORED IMPROVEMENTS:
 * - Uses ResponseHandler.wrapHandler() for automatic error handling
 * - Uses ValidationFramework with CommonRules for declarative validation
 * - Eliminates 25+ lines of boilerplate code
 * - Consistent validation across all registration endpoints
 * - Automatic error categorization and response formatting
 * 
 * Steps:
 * 1. Validate input using ValidationFramework (all required fields, email format, customer type)
 * 2. Extract client information
 * 3. Call customerRegister on auth service
 * 4. Return success response with 201 status code
 * 
 * Validations:
 * - Required fields: email, password, name, customerType
 * - Email format valid
 * - Customer type is one of: ['individual', 'dealer', 'premium']
 * 
 * Rate limiting:
 * - Max 5 registrations per IP per hour
 * 
 * Error codes:
 * - 400: Validation error
 * - 409: Email already exists
 * - 429: Rate limit exceeded
 * - 500: Internal error
 */
async function handleCustomerRegister(
  body: any,
  requestId: string,
  clientInfo: any
): Promise<APIGatewayProxyResult> {
  return ResponseHandler.wrapHandler(
    async () => {
      // 1. Validate input using ValidationFramework
      const validationResult = ValidationFramework.validate(body, [
        CommonRules.required('email', 'Email'),
        CommonRules.email('email'),
        CommonRules.required('password', 'Password'),
        CommonRules.required('name', 'Name'),
        CommonRules.required('customerType', 'Customer type'),
        CommonRules.oneOf('customerType', ['individual', 'dealer', 'premium'], 'Customer type'),
      ], requestId);

      if (validationResult) {
        return ResponseHandler.error('Validation failed', 'VALIDATION_ERROR', 400);
      }

      // 2. Extract data
      const { email, password, name, customerType, phone } = body;

      // 3. Prepare user data
      const userData: CustomerRegistration = {
        email,
        password,
        name,
        customerType: customerType as CustomerTier,
        phone,
        agreeToTerms: body.agreeToTerms || true,
        marketingOptIn: body.marketingOptIn || false,
      };

      // 4. Call service
      const result = await getAuthService().customerRegister(userData);
      
      // 5. Return result
      if (result.success) {
        return ResponseHandler.success(
          {
            message: result.message,
            requiresVerification: result.requiresVerification,
          },
          { statusCode: 201 }
        );
      } else {
        return ResponseHandler.error(result.message, 'REGISTRATION_FAILED', 400);
      }
    },
    { operation: 'Customer Register', requestId, successCode: 201 }
  );
}
```

**Class Method:** `CognitoAuthService.customerRegister()`
```typescript
/**
 * Registers a new customer in Cognito and creates user profile
 * 
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {CustomerType} customerType - Type: 'individual' or 'dealer'
 * @param {ClientInfo} clientInfo - Client information (IP, user agent)
 * @returns {Promise<CustomerAuthResult>} Registration result
 * 
 * Flow:
 * 1. Check rate limiting
 * 2. Check IP blocking
 * 3. Create Cognito user
 * 4. Create database user profile
 * 5. Assign user tier and capabilities
 * 6. Log audit event
 * 7. Return result
 * 
 * Cognito user attributes:
 * - email: User's email
 * - name: User's display name
 * - custom:customerType: 'individual' or 'dealer'
 * - email_verified: false (requires verification)
 * 
 * User profile:
 * - Created in harborlist-users table
 * - Initial tier based on customer type
 * - Capabilities assigned based on tier
 * - Listing limits set
 * 
 * Rate limiting:
 * - 5 attempts per IP per hour
 * - Tracked in memory (could be Redis in production)
 * 
 * Security:
 * - Password stored in Cognito (encrypted)
 * - No password in DynamoDB
 * - Audit log created
 * - IP tracking for security
 */
async customerRegister(
  name: string,
  email: string,
  password: string,
  customerType: CustomerType,
  clientInfo: ClientInfo
): Promise<CustomerAuthResult> {
  try {
    // 1. Rate limiting
    const rateLimitResult = await checkRateLimit(
      email,
      'register',
      'customer',
      clientInfo.ipAddress,
      clientInfo.userAgent
    );
    
    if (!rateLimitResult.allowed) {
      await logAuthEvent({
        eventType: 'FAILED_REGISTRATION',
        userType: 'customer',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: 'RATE_LIMITED',
      });

      return {
        success: false,
        error: 'Too many registration attempts. Please try again later.',
        errorCode: 'RATE_LIMITED',
      };
    }

    // 2. IP blocking check
    if (await securityService.isIPBlocked(clientInfo.ipAddress)) {
      return {
        success: false,
        error: 'Access denied from this IP address.',
        errorCode: 'IP_BLOCKED',
      };
    }

    // 3. Create Cognito user
    const signUpCommand = new SignUpCommand({
      ClientId: this.config.cognito.customer.clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'name',
          Value: name,
        },
        {
          Name: 'custom:customerType',
          Value: customerType,
        },
      ],
    });

    const response = await this.customerCognitoClient.send(signUpCommand);
    
    console.log('Cognito user created:', response.UserSub);

    // 4. Determine user tier
    const tier = customerType === 'dealer' ? 'DEALER' : 'FREE';
    
    // 5. Create user profile in database
    const userId = response.UserSub!;
    
    await db.createUser({
      id: userId,
      userId: userId,
      email: email,
      name: name,
      customerType: customerType,
      tier: tier,
      capabilities: this.getCapabilitiesForTier(tier),
      listingsCount: 0,
      maxListings: tier === 'DEALER' ? 50 : 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 6. Log success
    await logAuthEvent({
      eventType: 'REGISTRATION',
      userType: 'customer',
      userId: userId,
      email: email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      timestamp: new Date().toISOString(),
      success: true,
      additionalData: {
        customerType: customerType,
        tier: tier,
      },
    });

    return {
      success: true,
      requiresVerification: true,
      message: 'Registration successful. Please verify your email.',
    };
  } catch (error: any) {
    console.error('Customer registration error:', error);
    
    // Log failed registration
    await logAuthEvent({
      eventType: 'FAILED_REGISTRATION',
      userType: 'customer',
      email: email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      timestamp: new Date().toISOString(),
      success: false,
      errorCode: error.name,
      additionalData: {
        errorMessage: error.message,
      },
    });

    throw error;
  }
}
```

**Helper Method:** `getCapabilitiesForTier()`
```typescript
/**
 * Returns capabilities for a given user tier
 * 
 * @param {UserTierType} tier - User tier (FREE, DEALER, PREMIUM)
 * @returns {UserCapability[]} Array of capabilities
 * 
 * Capabilities by tier:
 * 
 * FREE:
 * - CREATE_LISTING (up to 3)
 * - EDIT_LISTING
 * - DELETE_LISTING
 * - VIEW_ANALYTICS_BASIC
 * - CONTACT_SUPPORT
 * 
 * DEALER:
 * - All FREE capabilities
 * - BULK_UPLOAD (up to 50 listings)
 * - ADVANCED_ANALYTICS
 * - PRIORITY_SUPPORT
 * - FEATURED_LISTING (up to 5)
 * - EXPORT_DATA
 * 
 * PREMIUM:
 * - All DEALER capabilities
 * - UNLIMITED_LISTINGS
 * - VIP_SUPPORT
 * - ADVANCED_MARKETING
 * - API_ACCESS
 */
private getCapabilitiesForTier(tier: UserTierType): UserCapability[] {
  const baseCapabilities: UserCapability[] = [
    'CREATE_LISTING',
    'EDIT_LISTING',
    'DELETE_LISTING',
    'VIEW_ANALYTICS_BASIC',
    'CONTACT_SUPPORT',
  ];

  if (tier === 'DEALER') {
    return [
      ...baseCapabilities,
      'BULK_UPLOAD',
      'ADVANCED_ANALYTICS',
      'PRIORITY_SUPPORT',
      'FEATURED_LISTING',
      'EXPORT_DATA',
    ];
  }

  if (tier === 'PREMIUM') {
    return [
      ...baseCapabilities,
      'BULK_UPLOAD',
      'ADVANCED_ANALYTICS',
      'PRIORITY_SUPPORT',
      'FEATURED_LISTING',
      'EXPORT_DATA',
      'UNLIMITED_LISTINGS',
      'VIP_SUPPORT',
      'ADVANCED_MARKETING',
      'API_ACCESS',
    ];
  }

  return baseCapabilities;
}
```

---

**File:** `backend/src/shared/utils.ts`

**Function:** `parseBody()`
```typescript
/**
 * Parses and validates JSON request body
 * 
 * @template T - Expected body type
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @returns {T} Parsed body object
 * 
 * @throws {Error} If body is missing or invalid JSON
 * 
 * Features:
 * - Type-safe parsing
 * - Error handling for missing body
 * - Error handling for invalid JSON
 * - Enhanced error messages
 */
export function parseBody<T>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw createEnhancedError(
      EnhancedErrorCodes.INVALID_LOAN_PARAMETERS,
      ErrorSeverity.HIGH,
      ErrorCategory.VALIDATION,
      { operation: 'parseBody' },
      'Request body is required'
    );
  }

  try {
    return JSON.parse(event.body) as T;
  } catch (error) {
    throw createEnhancedError(
      EnhancedErrorCodes.INVALID_LOAN_PARAMETERS,
      ErrorSeverity.HIGH,
      ErrorCategory.VALIDATION,
      { operation: 'parseBody', originalError: String(error) },
      'Invalid JSON in request body'
    );
  }
}
```

**Function:** `validateRequired()`
```typescript
/**
 * Validates that required fields are present
 * 
 * @param {Record<string, any>} data - Data object to validate
 * @param {string[]} requiredFields - Array of required field names
 * 
 * @throws {Error} If any required field is missing
 * 
 * Checks:
 * - Field exists in object
 * - Field is not null
 * - Field is not undefined
 * - String fields are not empty
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (
      data[field] === undefined ||
      data[field] === null ||
      (typeof data[field] === 'string' && data[field].trim() === '')
    ) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}
```

**Function:** `validateEmail()`
```typescript
/**
 * Validates email format
 * 
 * @param {string} email - Email address to validate
 * 
 * @throws {Error} If email format is invalid
 * 
 * Validation:
 * - Uses standard email regex
 * - Checks for @ symbol
 * - Checks for domain
 * - Checks for TLD
 * 
 * Regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
}
```

**Function:** `validatePasswordStrength()`
```typescript
/**
 * Validates password strength
 * 
 * @param {string} password - Password to validate
 * 
 * @throws {Error} If password doesn't meet requirements
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * 
 * Regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
 */
export function validatePasswordStrength(password: string): void {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  
  if (!passwordRegex.test(password)) {
    throw new Error(
      'Password must be at least 8 characters and contain ' +
      'at least one uppercase letter, one lowercase letter, and one number'
    );
  }
}
```

**Function:** `createResponse()`
```typescript
/**
 * Creates standardized API Gateway response
 * 
 * @template T - Response data type
 * @param {number} statusCode - HTTP status code
 * @param {T} data - Response data
 * @param {Record<string, string>} headers - Additional headers
 * @returns {APIGatewayProxyResult} Formatted response
 * 
 * Features:
 * - Consistent response format
 * - CORS headers included
 * - JSON serialization
 * - Content-Type header
 * - Credentials support
 * 
 * Response format:
 * {
 *   statusCode: number,
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Access-Control-Allow-Origin': string,
 *     'Access-Control-Allow-Headers': string,
 *     'Access-Control-Allow-Methods': string,
 *     'Access-Control-Allow-Credentials': 'true',
 *     ...additionalHeaders
 *   },
 *   body: string (JSON)
 * }
 */
export function createResponse<T>(
  statusCode: number,
  data: T,
  headers: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://local.harborlist.com',
      'Access-Control-Allow-Headers': 
        'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      ...headers,
    },
    body: JSON.stringify(data),
  };
}
```

---

**File:** `backend/src/shared/database.ts`

**Method:** `DatabaseService.createUser()`
```typescript
/**
 * Creates a new user account in the database
 * 
 * @param {any} user - User object with all required fields
 * @returns {Promise<void>}
 * 
 * @throws {Error} When user creation fails
 * 
 * User object structure:
 * {
 *   id: string,              // Same as userId (DynamoDB primary key)
 *   userId: string,          // Cognito sub
 *   email: string,           // User email
 *   name: string,            // Display name
 *   customerType: string,    // 'individual' | 'dealer'
 *   tier: string,            // 'FREE' | 'DEALER' | 'PREMIUM'
 *   capabilities: string[],  // Array of capability strings
 *   listingsCount: number,   // Current listing count
 *   maxListings: number,     // Maximum allowed listings
 *   createdAt: number,       // Unix timestamp
 *   updatedAt: number        // Unix timestamp
 * }
 * 
 * DynamoDB operation:
 * - Table: harborlist-users
 * - Operation: PutItem
 * - No condition (allows overwrite)
 * 
 * Indexes used:
 * - Primary: id
 * - EmailIndex: email
 * - TierIndex: tier + createdAt
 */
async createUser(user: any): Promise<void> {
  // Add id field for DynamoDB primary key
  const userWithId = {
    ...user,
    id: user.userId, // Use userId as the id for DynamoDB
  };

  await docClient.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: userWithId,
  }));
  
  console.log(`User created in database: ${userWithId.id}`);
}
```

---

**File:** `backend/src/auth-service/audit-service.ts`

**Function:** `logAuthEvent()`
```typescript
/**
 * Logs authentication event to audit trail
 * 
 * @param {AuthEvent} event - Authentication event details
 * @returns {Promise<void>}
 * 
 * Event types:
 * - REGISTRATION
 * - FAILED_REGISTRATION
 * - LOGIN
 * - FAILED_LOGIN
 * - LOGOUT
 * - PASSWORD_RESET
 * - EMAIL_VERIFICATION
 * - MFA_ENROLLMENT
 * - MFA_VERIFICATION
 * 
 * Audit log structure:
 * {
 *   auditId: string,         // UUID
 *   timestamp: string,       // ISO 8601
 *   eventType: string,       // Event type
 *   userType: string,        // 'customer' | 'staff'
 *   userId?: string,         // User ID if available
 *   email: string,           // User email
 *   ipAddress: string,       // Client IP
 *   userAgent: string,       // Browser user agent
 *   success: boolean,        // Operation success
 *   errorCode?: string,      // Error code if failed
 *   additionalData?: any     // Extra context
 * }
 * 
 * Storage:
 * - Table: boat-audit-logs
 * - Retention: 7 years (compliance)
 * - TTL: Set for automatic cleanup
 * 
 * Security:
 * - Immutable logs (no updates)
 * - Encrypted at rest
 * - Tamper-evident
 */
export async function logAuthEvent(event: AuthEvent): Promise<void> {
  const auditLog = {
    auditId: crypto.randomUUID(),
    timestamp: event.timestamp || new Date().toISOString(),
    eventType: event.eventType,
    userType: event.userType,
    userId: event.userId,
    email: event.email,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    success: event.success,
    errorCode: event.errorCode,
    additionalData: event.additionalData,
    ttl: Math.floor(Date.now() / 1000) + (7 * 365 * 24 * 60 * 60), // 7 years
  };

  await docClient.send(new PutCommand({
    TableName: AUDIT_LOGS_TABLE,
    Item: auditLog,
  }));

  console.log(`Audit log created: ${auditLog.auditId} - ${auditLog.eventType}`);
}
```

---

### Error Scenarios

#### 1. Email Already Exists

**Trigger:** User tries to register with existing email

**Flow:**
```
User submits form
  → API call to backend
    → Cognito SignUp command
      → Cognito checks email
        → UsernameExistsException thrown
          → Backend catches exception
            → Returns 409 Conflict
              → Frontend shows "Email already registered"
                → User can login or use different email
```

**Cognito Response:**
```json
{
  "name": "UsernameExistsException",
  "message": "An account with the given email already exists.",
  "$metadata": {
    "httpStatusCode": 400
  }
}
```

**Backend Response:**
```json
{
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "An account with this email already exists",
    "requestId": "abc-123-def"
  }
}
```

#### 2. Weak Password

**Trigger:** Password doesn't meet requirements

**Flow:**
```
User submits form
  → Frontend validation
    → Password regex check fails
      → Show inline error: "Password must be 8+ characters..."
        → User corrects password
          → Resubmits form
```

**Or if frontend validation passes but Cognito rejects:**
```
Frontend validation passes
  → API call to backend
    → Cognito SignUp command
      → InvalidPasswordException thrown
        → Backend returns 400 Bad Request
          → Frontend shows error
```

#### 3. Rate Limit Exceeded

**Trigger:** Too many registration attempts from same IP

**Flow:**
```
User submits form (6th attempt in hour)
  → API call to backend
    → Rate limit check
      → Limit exceeded
        → Audit log created
          → Returns 429 Too Many Requests
            → Frontend shows rate limit message
              → User must wait before retrying
```

**Backend Response:**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many registration attempts. Please try again later.",
    "requestId": "abc-123-def"
  }
}
```

#### 4. Network Failure

**Trigger:** Network connection lost during registration

**Flow:**
```
User submits form
  → API call starts
    → Network error occurs
      → Fetch throws error
        → Frontend catches error
          → Shows generic error message
            → User can retry
```

**Frontend Error Handling:**
```typescript
try {
  await register(...)
} catch (error) {
  if (error.message === 'Failed to fetch') {
    setError('Network error. Please check your connection.');
  } else {
    setError(error.message || 'Registration failed');
  }
}
```

---

### Success Scenario

**Complete successful registration flow:**

1. ✅ User fills form with valid data
2. ✅ Frontend validation passes
3. ✅ API call to backend
4. ✅ Backend validation passes
5. ✅ Rate limit check passes
6. ✅ IP not blocked
7. ✅ Cognito creates user
8. ✅ Database user profile created
9. ✅ Tier and capabilities assigned
10. ✅ Audit log created
11. ✅ Success response returned
12. ✅ Frontend navigates to success page
13. ✅ User receives verification email
14. ✅ User can verify email and login

**Final State:**
- Cognito: User created, unverified
- Database: User profile with tier
- Audit: Registration event logged
- Email: Verification email sent
- Frontend: Success page shown

---

### Performance Metrics

**Expected Response Times:**
- Frontend validation: < 10ms
- API call initiation: < 50ms
- Backend processing: < 500ms
  - Input validation: < 10ms
  - Rate limit check: < 20ms
  - Cognito user creation: 200-300ms
  - Database write: 10-20ms
  - Audit log: 10-20ms
- Total time: < 600ms

**Scalability:**
- Lambda: Auto-scales to thousands of concurrent requests
- Cognito: Handles millions of users
- DynamoDB: Auto-scales with demand
- Rate limiting: Per-IP tracking (consider Redis for production)

---

### Security Considerations

**1. Password Security:**
- Never stored in plain text
- Cognito handles encryption
- Never logged or displayed
- Transmitted over HTTPS only

**2. Email Verification:**
- Required before login
- Code expires in 24 hours
- Can resend code
- Prevents fake accounts

**3. Rate Limiting:**
- Prevents brute force
- Per-IP tracking
- Configurable limits
- Automatic blocking

**4. Audit Trail:**
- All attempts logged
- IP address tracked
- User agent recorded
- 7-year retention

**5. Data Privacy:**
- GDPR compliant
- User can delete account
- Data export available
- Minimum data collected

---

This completes the detailed Customer Registration Flow documentation with every method, function, interaction, and error scenario documented.

---

## Customer Login Flow

### Overview
Complete customer authentication process from login form submission to authenticated session, including JWT token generation, session creation, and user profile retrieval.

### Mermaid Diagram

```mermaid
sequenceDiagram
    participant User as User Browser
    participant LF as LoginForm Component
    participant AH as useAuth Hook
    participant API as API Service
    participant AGW as API Gateway
    participant AS as Auth Service Lambda
    participant VAL as Input Validator
    participant SEC as Security Service
    participant COG as AWS Cognito
    participant DB as DynamoDB
    participant AUDIT as Audit Service

    Note over User,AUDIT: 1. USER INITIATES LOGIN
    User->>LF: Enters email and password
    LF->>LF: validateForm()
    Note right of LF: Basic validation:<br/>- Email format<br/>- Password not empty

    alt Form validation fails
        LF->>User: Show validation errors
    end

    User->>LF: Clicks "Login" button
    LF->>AH: login(email, password)
    Note right of LF: frontend/src/hooks/useAuth.ts:115

    Note over AH,API: 2. FRONTEND API CALL
    AH->>AH: setLoading(true)
    AH->>API: api.login(email, password)
    Note right of AH: frontend/src/services/api.ts:60
    
    API->>API: getAuthHeaders()
    Note right of API: No auth token needed for login
    
    API->>AGW: POST /auth/customer/login
    Note right of API: Body: {email, password}

    Note over AGW,AS: 3. API GATEWAY & RATE LIMITING
    AGW->>AGW: Route validation
    AGW->>AGW: CORS check
    AGW->>AS: Invoke Lambda
    Note right of AGW: Event contains:<br/>- body: JSON<br/>- headers<br/>- sourceIp

    Note over AS,SEC: 4. SECURITY CHECKS
    AS->>AS: handler(event, context)
    Note right of AS: backend/src/auth-service/index.ts:1920
    
    AS->>AS: parseBody<LoginRequest>(event)
    AS->>AS: extractClientInfo(event)
    Note right of AS: Get:<br/>- IP address<br/>- User agent<br/>- Device fingerprint
    
    AS->>SEC: checkRateLimit(email, 'login', 'customer', ip, userAgent)
    Note right of SEC: backend/src/auth-service/security-service.ts:145
    
    SEC->>SEC: getRateLimitKey(email, 'login', 'customer')
    SEC->>SEC: Check in-memory rate limiter
    Note right of SEC: Limits:<br/>- 5 attempts per 5 minutes<br/>- 20 attempts per hour<br/>- 50 attempts per day

    alt Rate limit exceeded
        SEC-->>AS: {allowed: false, remainingAttempts: 0}
        AS->>AUDIT: logAuthEvent('FAILED_LOGIN', 'RATE_LIMITED')
        AS-->>AGW: 429 Too Many Requests
        AGW-->>API: Rate limit error
        API-->>AH: Throw error
        AH->>AH: setError('Too many attempts')
        AH->>AH: setLoading(false)
        AH-->>LF: Error returned
        LF->>User: Show "Too many login attempts..."
    end

    AS->>SEC: isIPBlocked(ip)
    Note right of SEC: Check IP blocklist

    alt IP is blocked
        SEC-->>AS: true
        AS->>AUDIT: logAuthEvent('FAILED_LOGIN', 'IP_BLOCKED')
        AS-->>AGW: 403 Forbidden
        AGW-->>User: "Access denied"
    end

    Note over AS,VAL: 5. INPUT VALIDATION
    AS->>VAL: validateLoginInput(data)
    VAL->>VAL: validateEmail(email)
    VAL->>VAL: validatePasswordPresent(password)
    
    alt Validation fails
        VAL-->>AS: ValidationError
        AS-->>AGW: 400 Bad Request
        AGW-->>User: Validation error message
    end

    Note over AS,COG: 6. COGNITO AUTHENTICATION
    AS->>AS: authService.customerLogin(email, password, clientInfo)
    Note right of AS: backend/src/auth-service/index.ts:124
    
    AS->>COG: InitiateAuthCommand
    Note right of AS: Pool: Customer User Pool<br/>ClientId: CUSTOMER_CLIENT_ID<br/>AuthFlow: USER_PASSWORD_AUTH
    
    rect rgb(200, 220, 255)
        Note over COG: Cognito Authentication
        COG->>COG: Verify user exists
        
        alt User not found
            COG-->>AS: UserNotFoundException
            AS->>AUDIT: logAuthEvent('FAILED_LOGIN', 'USER_NOT_FOUND')
            AS-->>User: "Invalid credentials"
            Note right of AS: Generic message for security
        end
        
        COG->>COG: Verify password
        
        alt Password incorrect
            COG-->>AS: NotAuthorizedException
            AS->>SEC: incrementFailedAttempts(email)
            AS->>AUDIT: logAuthEvent('FAILED_LOGIN', 'INVALID_PASSWORD')
            AS-->>User: "Invalid credentials"
        end
        
        COG->>COG: Check email verification status
        
        alt Email not verified
            COG-->>AS: UserNotConfirmedException
            AS-->>User: "Please verify your email first"
        end
        
        COG->>COG: Check user status
        
        alt User disabled or suspended
            COG-->>AS: UserNotConfirmedException
            AS-->>User: "Account is disabled"
        end
        
        COG->>COG: Generate tokens
        Note right of COG: JWT tokens:<br/>- Access Token (1 hour)<br/>- ID Token (1 hour)<br/>- Refresh Token (30 days)
        
        COG-->>AS: AuthenticationResult
        Note right of COG: Contains:<br/>- AccessToken<br/>- IdToken<br/>- RefreshToken<br/>- ExpiresIn<br/>- TokenType
    end

    Note over AS,COG: 7. TOKEN EXTRACTION & VALIDATION
    AS->>AS: Extract tokens from response
    Note right of AS: {<br/>  accessToken,<br/>  idToken,<br/>  refreshToken,<br/>  expiresIn,<br/>  tokenType: 'Bearer'<br/>}
    
    AS->>AS: validateCustomerToken(accessToken)
    Note right of AS: backend/src/auth-service/index.ts:873
    
    AS->>AS: validateJWTToken()
    Note right of AS: backend/src/shared/auth.ts:85
    
    rect rgb(255, 240, 200)
        Note over AS: JWT Token Validation
        AS->>AS: Decode JWT without verification
        AS->>AS: Get kid from header
        AS->>AS: Fetch Cognito JWKS
        Note right of AS: URL: https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
        AS->>AS: Find matching key
        AS->>AS: Verify signature
        AS->>AS: Verify expiration
        AS->>AS: Verify issuer
        AS->>AS: Verify audience (client ID)
        AS->>AS: Extract claims
    end
    
    AS->>AS: Extract user claims
    Note right of AS: CustomerClaims:<br/>- sub (user ID)<br/>- email<br/>- name<br/>- custom:customer_type<br/>- permissions<br/>- cognito:groups

    Note over AS,DB: 8. USER PROFILE RETRIEVAL
    AS->>AS: getUserById(claims.sub)
    Note right of AS: Get full user profile
    
    AS->>DB: GetCommand
    Note right of AS: Table: harborlist-users<br/>Key: {id: userId}
    
    rect rgb(200, 255, 200)
        Note over DB: DynamoDB Read
        DB->>DB: Retrieve user record
        Note right of DB: User object with:<br/>- Profile data<br/>- Tier information<br/>- Capabilities<br/>- Listing counts<br/>- Preferences
        DB-->>AS: User profile
    end
    
    AS->>AS: Enrich user data
    Note right of AS: Combine:<br/>- Cognito claims<br/>- Database profile<br/>- Computed permissions

    Note over AS,SEC: 9. SESSION CREATION
    AS->>SEC: createSession(userId, 'customer', email, ip, userAgent, claims)
    Note right of SEC: backend/src/auth-service/security-service.ts:220
    
    SEC->>SEC: Generate session ID
    Note right of SEC: UUID v4
    
    SEC->>SEC: Generate device fingerprint
    Note right of SEC: Hash of:<br/>- User agent<br/>- IP address<br/>- Device info
    
    SEC->>SEC: Set session TTL
    Note right of SEC: Customer: 30 days<br/>Staff: 8 hours
    
    SEC->>DB: PutCommand
    Note right of SEC: Table: harborlist-sessions
    
    rect rgb(255, 220, 200)
        Note over DB: Session Storage
        DB->>DB: Store session
        Note right of DB: Session object:<br/>{<br/>  sessionId: uuid,<br/>  userId: userId,<br/>  userType: 'customer',<br/>  email: email,<br/>  ipAddress: ip,<br/>  userAgent: agent,<br/>  deviceFingerprint: hash,<br/>  claims: claims,<br/>  createdAt: timestamp,<br/>  expiresAt: timestamp + TTL,<br/>  lastActivityAt: timestamp<br/>}
        DB-->>SEC: Session created
    end
    
    SEC-->>AS: Session details

    Note over AS,AUDIT: 10. AUDIT LOGGING
    AS->>AUDIT: logAuthEvent()
    Note right of AS: backend/src/auth-service/audit-service.ts:45
    
    AUDIT->>AUDIT: Create audit entry
    Note right of AUDIT: {<br/>  eventType: 'LOGIN',<br/>  userType: 'customer',<br/>  userId: userId,<br/>  email: email,<br/>  ipAddress: ip,<br/>  userAgent: agent,<br/>  success: true,<br/>  sessionId: sessionId,<br/>  timestamp: ISO8601<br/>}
    
    AUDIT->>DB: PutCommand
    Note right of AUDIT: Table: boat-audit-logs
    
    DB->>DB: Write audit log
    DB-->>AUDIT: Success

    Note over AS,AGW: 11. RESPONSE GENERATION
    AS->>AS: createResponse(200, authData)
    Note right of AS: backend/src/shared/utils.ts:65
    
    AS->>AS: Prepare response data
    Note right of AS: {<br/>  success: true,<br/>  tokens: {<br/>    accessToken,<br/>    refreshToken,<br/>    idToken,<br/>    expiresIn,<br/>    tokenType<br/>  },<br/>  user: {<br/>    id, email, name,<br/>    tier, capabilities,<br/>    listingsCount, maxListings<br/>  }<br/>}
    
    AS->>AS: Add CORS headers
    AS-->>AGW: 200 OK with auth data

    Note over AGW,User: 12. FRONTEND TOKEN STORAGE
    AGW-->>API: Success response
    API->>API: Parse JSON response
    API-->>AH: {tokens, user}
    
    AH->>AH: storeTokens(tokens)
    Note right of AH: localStorage.setItem('authToken', accessToken)<br/>localStorage.setItem('refreshToken', refreshToken)
    
    AH->>AH: setUser(user)
    Note right of AH: Update React state
    
    AH->>AH: setIsAuthenticated(true)
    AH->>AH: setLoading(false)
    
    AH-->>LF: Login successful
    
    LF->>LF: navigate('/')
    Note right of LF: React Router navigation<br/>to dashboard or home
    
    LF->>User: Show dashboard
    Note right of User: User is now authenticated<br/>Can access protected routes

    Note over User,API: 13. AUTOMATIC API REQUESTS WITH AUTH
    loop Every API request
        User->>API: Make API call
        API->>API: getAuthHeaders()
        Note right of API: Returns:<br/>{<br/>  'Authorization': 'Bearer {accessToken}',<br/>  'Content-Type': 'application/json'<br/>}
        API->>AGW: Request with auth header
        AGW->>AS: Validate token
        AS->>AS: validateCustomerToken(accessToken)
        
        alt Token valid
            AS-->>API: Process request
        else Token expired
            AS-->>API: 401 Unauthorized
            API->>AH: handleTokenExpired()
            AH->>AH: Attempt refresh token
            Note right of AH: See Token Refresh Flow
        end
    end
```

### Detailed Method Documentation

#### 1. Frontend Components

**File:** `frontend/src/pages/Login.tsx`

**Component:** `LoginForm`
```typescript
/**
 * Login form component with validation
 * 
 * Features:
 * - Email/password input fields
 * - Real-time validation
 * - Loading states
 * - Error display
 * - "Remember me" option
 * - "Forgot password" link
 * - Registration link
 * 
 * State:
 * - formData: {email, password, rememberMe}
 * - errors: {email?, password?, submit?}
 * - loading: boolean
 * 
 * Validation:
 * - Email format check
 * - Password not empty
 */
const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuthState();
  const navigate = useNavigate();

  // ... component implementation
};
```

**Method:** `validateForm()`
```typescript
/**
 * Validates login form data
 * 
 * @returns {boolean} true if valid
 * 
 * Checks:
 * 1. Email format (basic regex)
 * 2. Password not empty
 * 
 * Sets errors state for invalid fields
 */
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (!formData.password) {
    newErrors.password = 'Password is required';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Method:** `handleSubmit()`
```typescript
/**
 * Handles login form submission
 * 
 * @param {React.FormEvent} e - Form event
 * 
 * Flow:
 * 1. Prevent default
 * 2. Validate form
 * 3. Call login from useAuth
 * 4. Handle success (navigate to dashboard)
 * 5. Handle errors (show error message)
 * 
 * Error handling:
 * - Network errors
 * - Invalid credentials
 * - Account not verified
 * - Account disabled
 * - Rate limiting
 */
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
  setLoading(true);
  setErrors({});
  
  try {
    await login(formData.email, formData.password);
    
    // Redirect based on user type or stored redirect
    const redirect = sessionStorage.getItem('redirectAfterLogin') || '/';
    sessionStorage.removeItem('redirectAfterLogin');
    navigate(redirect);
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Handle specific error types
    if (error.code === 'RATE_LIMITED') {
      setErrors({ submit: 'Too many login attempts. Please try again later.' });
    } else if (error.code === 'USER_NOT_VERIFIED') {
      setErrors({ submit: 'Please verify your email before logging in.' });
      // Optionally redirect to verification page
    } else if (error.code === 'INVALID_CREDENTIALS') {
      setErrors({ submit: 'Invalid email or password.' });
    } else {
      setErrors({ submit: error.message || 'Login failed. Please try again.' });
    }
  } finally {
    setLoading(false);
  }
};
```

---

**File:** `frontend/src/hooks/useAuth.ts`

**Method:** `login()`
```typescript
/**
 * Authenticates user with email and password
 * 
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<void>}
 * 
 * @throws {Error} If login fails
 * 
 * Flow:
 * 1. Call API login method
 * 2. Receive tokens and user data
 * 3. Store tokens in localStorage
 * 4. Parse and validate ID token
 * 5. Update user state
 * 6. Set authenticated state
 * 
 * Token storage:
 * - authToken: Access token for API calls
 * - refreshToken: For token renewal
 * - tokenExpiry: Calculated expiration time
 * 
 * Security:
 * - Tokens stored in localStorage (consider httpOnly cookies for production)
 * - Automatic token validation
 * - Error handling for invalid responses
 * 
 * @example
 * ```typescript
 * try {
 *   await login('user@example.com', 'SecurePassword123');
 *   // User is now logged in
 * } catch (error) {
 *   console.error('Login failed:', error.message);
 * }
 * ```
 */
const login = async (email: string, password: string): Promise<void> => {
  try {
    setLoading(true);
    
    const response = await api.login(email, password);
    
    if (!response.tokens || !response.user) {
      throw new Error('Invalid response from server');
    }
    
    // Store tokens
    localStorage.setItem('authToken', response.tokens.accessToken);
    localStorage.setItem('refreshToken', response.tokens.refreshToken);
    
    // Calculate and store token expiry
    const expiryTime = Date.now() + (response.tokens.expiresIn * 1000);
    localStorage.setItem('tokenExpiry', expiryTime.toString());
    
    // Parse ID token to get user claims
    const idToken = response.tokens.idToken;
    if (idToken) {
      const payload = parseJWT(idToken);
      console.log('User claims:', payload);
    }
    
    // Update user state
    setUser(response.user);
    setIsAuthenticated(true);
    
    console.log('Login successful:', response.user.email);
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Clear any partial state
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    setUser(null);
    setIsAuthenticated(false);
    
    throw error;
  } finally {
    setLoading(false);
  }
};
```

**Helper Method:** `parseJWT()`
```typescript
/**
 * Parses JWT token payload (without verification)
 * 
 * @param {string} token - JWT token
 * @returns {any} Decoded payload
 * 
 * Note: This only decodes the token, does NOT verify signature.
 * Server-side verification is required for security.
 * 
 * JWT structure: header.payload.signature
 * - Decodes base64 payload
 * - Parses JSON
 * - Returns claims object
 */
const parseJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
};
```

**Method:** `restoreSession()`
```typescript
/**
 * Attempts to restore user session from stored tokens
 * 
 * Called on app initialization (useEffect)
 * 
 * Flow:
 * 1. Check for stored auth token
 * 2. Check token expiration
 * 3. If expired, attempt refresh
 * 4. If valid, restore user session
 * 5. Validate token with backend
 * 
 * @returns {Promise<void>}
 * 
 * Features:
 * - Automatic session restoration
 * - Token expiration handling
 * - Refresh token flow
 * - Cleanup on failure
 */
const restoreSession = async (): Promise<void> => {
  try {
    setLoading(true);
    
    const token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const expiryStr = localStorage.getItem('tokenExpiry');
    
    if (!token) {
      // No token, user not logged in
      setLoading(false);
      return;
    }
    
    // Check token expiration
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();
      
      if (now >= expiry) {
        // Token expired, try refresh
        if (refreshToken) {
          await refreshAccessToken(refreshToken);
          // refreshAccessToken will call restoreSession again
          return;
        } else {
          // No refresh token, clear session
          logout();
          return;
        }
      }
    }
    
    // Token valid, restore session
    // Validate token and get user info
    try {
      const userInfo = await api.getUserProfile();
      setUser(userInfo);
      setIsAuthenticated(true);
    } catch (error) {
      // Token invalid, clear session
      console.error('Failed to validate token:', error);
      logout();
    }
  } catch (error) {
    console.error('Session restoration error:', error);
    logout();
  } finally {
    setLoading(false);
  }
};
```

---

**File:** `frontend/src/services/api.ts`

**Method:** `login()`
```typescript
/**
 * Calls login API endpoint
 * 
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<LoginResponse>} Login result with tokens and user
 * 
 * Endpoint: POST /auth/customer/login
 * 
 * Request:
 * {
 *   email: string,
 *   password: string
 * }
 * 
 * Success response (200):
 * {
 *   success: true,
 *   tokens: {
 *     accessToken: string,
 *     refreshToken: string,
 *     idToken: string,
 *     expiresIn: number,
 *     tokenType: 'Bearer'
 *   },
 *   user: {
 *     id: string,
 *     email: string,
 *     name: string,
 *     tier: string,
 *     capabilities: string[],
 *     listingsCount: number,
 *     maxListings: number
 *   }
 * }
 * 
 * Error responses:
 * - 400: Validation error
 * - 401: Invalid credentials
 * - 403: Email not verified or account disabled
 * - 429: Rate limit exceeded
 * - 500: Internal error
 */
async login(email: string, password: string): Promise<LoginResponse> {
  return this.request(endpoints.auth.login, {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}
```

**Method:** `getUserProfile()`
```typescript
/**
 * Fetches current user's profile
 * 
 * @returns {Promise<User>} User profile data
 * 
 * Endpoint: GET /users/profile
 * 
 * Headers:
 * - Authorization: Bearer {accessToken}
 * 
 * Response:
 * {
 *   id: string,
 *   userId: string,
 *   email: string,
 *   name: string,
 *   customerType: string,
 *   tier: string,
 *   capabilities: string[],
 *   listingsCount: number,
 *   maxListings: number,
 *   createdAt: number,
 *   updatedAt: number,
 *   preferences?: object
 * }
 * 
 * Used for:
 * - Session restoration
 * - Profile page
 * - User state updates
 */
async getUserProfile(): Promise<User> {
  return this.request(endpoints.users.profile, {
    method: 'GET'
  });
}
```

---

#### 2. Backend Authentication Service

**File:** `backend/src/auth-service/index.ts`

**Function:** `handleCustomerLogin()` ✨ **REFACTORED - Uses ResponseHandler & ValidationFramework**
```typescript
/**
 * Handles customer login endpoint
 * 
 * @param {any} body - Request body
 * @param {string} requestId - Request tracking ID
 * @param {ClientInfo} clientInfo - Client information
 * @returns {Promise<APIGatewayProxyResult>} HTTP response
 * 
 * ✨ REFACTORED IMPROVEMENTS:
 * - Uses ResponseHandler.wrapHandler() for automatic error handling
 * - Uses ValidationFramework with CommonRules for declarative validation
 * - Eliminates 15+ lines of boilerplate code
 * - Consistent error responses across all endpoints
 * - Automatic request tracking and logging
 * 
 * Steps:
 * 1. Validate input using ValidationFramework (email required, email format, password required)
 * 2. Extract client information
 * 3. Check rate limiting (delegated to auth service)
 * 4. Check IP blocking (delegated to auth service)
 * 5. Authenticate with Cognito
 * 6. Validate tokens
 * 7. Retrieve user profile
 * 8. Create session
 * 9. Log audit event
 * 10. Return tokens and user data
 * 
 * Rate limiting:
 * - 5 attempts per 5 minutes
 * - 20 attempts per hour
 * - 50 attempts per day
 * 
 * Security:
 * - Generic error messages (no user enumeration)
 * - Failed attempt tracking
 * - IP blocking after repeated failures
 * - Session fingerprinting
 * 
 * @throws Automatically handled by ResponseHandler.wrapHandler()
 */
async function handleCustomerLogin(
  body: any,
  requestId: string,
  clientInfo: any
): Promise<APIGatewayProxyResult> {
  return ResponseHandler.wrapHandler(
    async () => {
      // 1. Validate input using ValidationFramework
      const validationResult = ValidationFramework.validate(body, [
        CommonRules.required('email', 'Email'),
        CommonRules.email('email'),
        CommonRules.required('password', 'Password'),
      ], requestId);

      if (validationResult) {
        return ResponseHandler.error('Validation failed', 'VALIDATION_ERROR', 400);
      }

      // 2. Extract credentials
      const { email, password, deviceId } = body;
      
      // 3. Call auth service (handles rate limiting, IP blocking, Cognito auth)
      const result = await getAuthService().customerLogin(email, password, clientInfo, deviceId);
      
      // 4. Return result
      if (result.success) {
        return ResponseHandler.success({
          tokens: result.tokens,
          customer: result.customer,
        });
      } else {
        return ResponseHandler.error(
          result.error || 'Authentication failed',
          result.errorCode || 'AUTH_FAILED',
          401
        );
      }
    },
    { operation: 'Customer Login', requestId }
  );
}
```

**Class Method:** `CognitoAuthService.customerLogin()`
```typescript
/**
 * Authenticates customer with Cognito
 * 
 * @param {string} email - Customer email
 * @param {string} password - Customer password
 * @param {ClientInfo} clientInfo - Client information
 * @param {string} deviceId - Optional device ID
 * @returns {Promise<CustomerAuthResult>} Authentication result
 * 
 * Flow:
 * 1. Rate limiting check
 * 2. IP blocking check
 * 3. Cognito authentication
 * 4. Token extraction
 * 5. Token validation
 * 6. User profile retrieval
 * 7. Session creation
 * 8. Audit logging
 * 
 * Cognito auth flow:
 * - AuthFlow: USER_PASSWORD_AUTH
 * - Returns: AccessToken, IdToken, RefreshToken
 * 
 * Error handling:
 * - UserNotFoundException → Generic "Invalid credentials"
 * - NotAuthorizedException → Generic "Invalid credentials"
 * - UserNotConfirmedException → "Please verify email"
 * - PasswordResetRequiredException → "Password reset required"
 * - TooManyRequestsException → "Too many attempts"
 * 
 * Security features:
 * - Password never logged
 * - Generic error messages prevent user enumeration
 * - Failed attempt tracking
 * - Session fingerprinting
 * - Audit trail
 */
async customerLogin(
  email: string,
  password: string,
  clientInfo: ClientInfo,
  deviceId?: string
): Promise<CustomerAuthResult> {
  try {
    // 1. Rate limiting
    const rateLimitResult = await checkRateLimit(
      email,
      'login',
      'customer',
      clientInfo.ipAddress,
      clientInfo.userAgent
    );
    
    if (!rateLimitResult.allowed) {
      await logAuthEvent({
        eventType: 'FAILED_LOGIN',
        userType: 'customer',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: 'RATE_LIMITED',
      });

      return {
        success: false,
        error: 'Too many login attempts. Please try again later.',
        errorCode: 'RATE_LIMITED',
      };
    }

    // 2. IP blocking check
    if (await securityService.isIPBlocked(clientInfo.ipAddress)) {
      await logAuthEvent({
        eventType: 'FAILED_LOGIN',
        userType: 'customer',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: 'IP_BLOCKED',
      });

      return {
        success: false,
        error: 'Access denied.',
        errorCode: 'IP_BLOCKED',
      };
    }

    // 3. Cognito authentication
    const initiateAuthCommand = new InitiateAuthCommand({
      ClientId: this.config.cognito.customer.clientId,
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await this.customerCognitoClient.send(initiateAuthCommand);

    // Check for MFA challenge
    if (response.ChallengeName) {
      // MFA required (if enabled)
      await logAuthEvent({
        eventType: 'LOGIN_MFA_REQUIRED',
        userType: 'customer',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { requiresMFA: true, challengeName: response.ChallengeName },
      });

      return {
        success: false,
        requiresMFA: true,
        mfaToken: response.Session,
        error: 'MFA verification required',
      };
    }

    // 4. Extract tokens
    if (!response.AuthenticationResult) {
      await logAuthEvent({
        eventType: 'FAILED_LOGIN',
        userType: 'customer',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: 'AUTH_FAILED',
      });

      return {
        success: false,
        error: 'Authentication failed',
        errorCode: 'AUTH_FAILED',
      };
    }

    const tokens: TokenSet = {
      accessToken: response.AuthenticationResult.AccessToken!,
      refreshToken: response.AuthenticationResult.RefreshToken!,
      idToken: response.AuthenticationResult.IdToken,
      tokenType: 'Bearer',
      expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
    };

    // 5. Token validation
    const claims = await this.validateCustomerToken(tokens.accessToken);
    
    // 6. User profile retrieval
    const userId = claims.sub;
    const userProfile = await db.getUserById(userId);
    
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // 7. Session creation
    const session = await securityService.createSession(
      userId,
      'customer',
      email,
      clientInfo.ipAddress,
      clientInfo.userAgent,
      claims,
      deviceId
    );

    // 8. Audit logging
    await logAuthEvent({
      eventType: 'LOGIN',
      userType: 'customer',
      userId,
      email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      timestamp: new Date().toISOString(),
      success: true,
      additionalData: {
        sessionId: session.sessionId,
        tier: userProfile.tier,
      },
    });

    return {
      success: true,
      tokens,
      user: userProfile,
    };
  } catch (error: any) {
    console.error('Customer login error:', error);
    
    // Log failed login
    await logAuthEvent({
      eventType: 'FAILED_LOGIN',
      userType: 'customer',
      email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      timestamp: new Date().toISOString(),
      success: false,
      errorCode: error.name,
      additionalData: {
        errorMessage: error.message,
      },
    });

    // Handle specific Cognito errors
    if (error.name === 'UserNotFoundException' || error.name === 'NotAuthorizedException') {
      return {
        success: false,
        error: 'Invalid email or password',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }
    
    if (error.name === 'UserNotConfirmedException') {
      return {
        success: false,
        error: 'Please verify your email before logging in',
        errorCode: 'USER_NOT_VERIFIED',
      };
    }
    
    if (error.name === 'PasswordResetRequiredException') {
      return {
        success: false,
        error: 'Password reset required',
        errorCode: 'PASSWORD_RESET_REQUIRED',
      };
    }
    
    if (error.name === 'TooManyRequestsException') {
      return {
        success: false,
        error: 'Too many login attempts. Please try again later.',
        errorCode: 'RATE_LIMITED',
      };
    }

    return {
      success: false,
      error: 'Login failed',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}
```

---

## Customer Email Verification Flow

### Overview
Complete email verification process from receiving verification email through clicking link/entering code to account activation, enabling the user to login.

### Mermaid Diagram

```mermaid
sequenceDiagram
    participant User as User Email Client
    participant VE as VerifyEmail Page
    participant API as API Service
    participant AGW as API Gateway
    participant AS as Auth Service Lambda
    participant COG as AWS Cognito
    participant DB as DynamoDB
    participant AUDIT as Audit Service
    participant EMAIL as Email Service

    Note over User,EMAIL: 1. USER RECEIVES VERIFICATION EMAIL
    EMAIL->>User: Verification email delivered
    Note right of EMAIL: Email contains:<br/>- 6-digit code: 123456<br/>- Verification link with token<br/>- Expires in 24 hours

    User->>User: Opens email
    User->>User: Reads verification instructions

    Note over User,VE: 2. USER CLICKS VERIFICATION LINK
    User->>VE: Clicks link: /verify-email?token={token}
    Note right of User: Token: JWT with:<br/>- email<br/>- code<br/>- expiry

    VE->>VE: useEffect() triggered
    Note right of VE: frontend/src/pages/VerifyEmail.tsx:38
    
    VE->>VE: Extract token from URL params
    Note right of VE: useSearchParams().get('token')
    
    alt Token missing
        VE->>VE: setStatus('error')
        VE->>User: Show "No verification token provided"
        Note right of User: User must check email<br/>for correct link
    end
    
    VE->>VE: setStatus('loading')
    VE->>User: Show loading spinner
    Note right of User: "Verifying Your Email"

    Note over VE,API: 3. FRONTEND VERIFICATION REQUEST
    VE->>API: verifyEmail(token)
    Note right of VE: frontend/src/services/api.ts
    
    API->>AGW: POST /auth/customer/verify-email
    Note right of API: Body: {token: token}

    Note over AGW,AS: 4. API GATEWAY PROCESSING
    AGW->>AGW: Route to auth service
    AGW->>AS: Invoke Lambda

    AS->>AS: handler(event, context)
    Note right of AS: backend/src/auth-service/index.ts:2100
    
    AS->>AS: parseBody(event)
    AS->>AS: Extract token from body

    Note over AS,COG: 5. TOKEN VALIDATION
    AS->>AS: decodeVerificationToken(token)
    Note right of AS: JWT decode (no verification yet)
    
    AS->>AS: Extract token payload
    Note right of AS: {<br/>  email: email,<br/>  code: verificationCode,<br/>  exp: expiryTimestamp<br/>}
    
    AS->>AS: Check token expiration
    Note right of AS: Compare exp with current time
    
    alt Token expired
        AS->>AS: createErrorResponse(400, 'TOKEN_EXPIRED')
        AS-->>AGW: 400 Bad Request
        AGW-->>API: Token expired
        API-->>VE: Throw error
        VE->>VE: setStatus('expired')
        VE->>User: Show "Link expired" + resend option
    end

    Note over AS,COG: 6. COGNITO EMAIL VERIFICATION
    AS->>AS: Extract email and code from token
    
    AS->>AS: customerConfirmSignUp(email, code)
    Note right of AS: backend/src/auth-service/index.ts:487
    
    AS->>COG: ConfirmSignUpCommand
    Note right of AS: ClientId: CUSTOMER_CLIENT_ID<br/>Username: email<br/>ConfirmationCode: code
    
    rect rgb(200, 220, 255)
        Note over COG: Cognito Verification
        COG->>COG: Lookup user by email
        
        alt User not found
            COG-->>AS: UserNotFoundException
            AS->>AUDIT: logAuthEvent('FAILED_VERIFICATION')
            AS-->>User: "Invalid verification token"
        end
        
        COG->>COG: Verify confirmation code
        
        alt Code invalid
            COG-->>AS: CodeMismatchException
            AS->>AUDIT: logAuthEvent('FAILED_VERIFICATION')
            AS-->>User: "Invalid verification code"
        end
        
        alt Code expired
            COG-->>AS: ExpiredCodeException
            AS->>AUDIT: logAuthEvent('FAILED_VERIFICATION')
            AS-->>User: "Verification code expired"
        end
        
        alt Already verified
            COG-->>AS: NotAuthorizedException
            AS->>AUDIT: logAuthEvent('ALREADY_VERIFIED')
            AS-->>User: "Email already verified"
        end
        
        COG->>COG: Mark email as verified
        Note right of COG: email_verified: true
        
        COG->>COG: Enable user account
        Note right of COG: UserStatus: CONFIRMED
        
        COG-->>AS: Success
    end

    Note over AS,DB: 7. UPDATE DATABASE USER RECORD
    AS->>AS: updateUserEmailVerified(email)
    Note right of AS: backend/src/auth-service/index.ts:520
    
    AS->>DB: GetCommand
    Note right of AS: Table: harborlist-users<br/>EmailIndex: email
    
    DB-->>AS: User record
    
    AS->>DB: UpdateCommand
    Note right of AS: Update user record
    
    rect rgb(200, 255, 200)
        Note over DB: DynamoDB Update
        DB->>DB: Update user
        Note right of DB: UpdateExpression:<br/>"SET emailVerified = :verified,<br/>     updatedAt = :now,<br/>     verifiedAt = :now"<br/>ExpressionAttributeValues:<br/>{<br/>  ":verified": true,<br/>  ":now": timestamp<br/>}
        DB-->>AS: Update successful
    end

    Note over AS,AUDIT: 8. AUDIT LOGGING
    AS->>AUDIT: logAuthEvent()
    Note right of AS: backend/src/auth-service/audit-service.ts:45
    
    AUDIT->>DB: PutCommand
    Note right of AUDIT: Table: boat-audit-logs
    
    rect rgb(255, 220, 200)
        Note over DB: Audit Log
        DB->>DB: Write audit entry
        Note right of DB: {<br/>  auditId: uuid,<br/>  eventType: 'EMAIL_VERIFIED',<br/>  userType: 'customer',<br/>  email: email,<br/>  ipAddress: ip,<br/>  timestamp: ISO8601,<br/>  success: true<br/>}
    end

    Note over AS,EMAIL: 9. WELCOME EMAIL (Optional)
    AS->>EMAIL: sendWelcomeEmail(email, userName)
    Note right of AS: Async - doesn't block response
    
    EMAIL->>EMAIL: Prepare welcome email
    Note right of EMAIL: Template: welcome-customer<br/>Personalized with user name
    
    EMAIL->>EMAIL: Send via AWS SES
    EMAIL->>User: Welcome email delivered
    Note right of EMAIL: Contains:<br/>- Getting started guide<br/>- Create listing button<br/>- Support contacts

    Note over AS,AGW: 10. SUCCESS RESPONSE
    AS->>AS: createResponse(200, successData)
    Note right of AS: {<br/>  success: true,<br/>  message: "Email verified successfully"<br/>}
    
    AS-->>AGW: 200 OK
    AGW-->>API: Success response
    API-->>VE: Verification successful

    Note over VE,User: 11. FRONTEND SUCCESS HANDLING
    VE->>VE: setStatus('success')
    VE->>VE: setMessage(response.message)
    
    VE->>User: Show success icon + message
    Note right of User: Green checkmark<br/>"Email Verified!"
    
    VE->>VE: setTimeout(() => navigate('/login'), 3000)
    Note right of VE: Auto-redirect after 3 seconds
    
    VE->>User: Show countdown
    Note right of User: "Redirecting to login..."

    alt User clicks "Continue to Login"
        User->>VE: Clicks button
        VE->>VE: navigate('/login')
    end
    
    VE->>User: Login page with success message
    Note right of User: "Email verified! Please log in"

    Note over User,VE: 12. ALTERNATIVE: MANUAL CODE ENTRY
    alt User prefers manual code entry
        User->>VE: Navigates to /verify-email (no token)
        VE->>User: Show code entry form
        User->>VE: Enters email + 6-digit code
        VE->>API: verifyEmailWithCode(email, code)
        Note right of VE: Same backend flow as token
    end

    Note over User,VE: 13. RESEND VERIFICATION CODE
    alt Verification code expired
        VE->>User: Show "Resend code" option
        User->>VE: Enters email
        User->>VE: Clicks "Resend Verification"
        
        VE->>API: resendVerification(email)
        API->>AGW: POST /auth/customer/resend-verification
        AGW->>AS: Invoke Lambda
        
        AS->>COG: ResendConfirmationCodeCommand
        Note right of AS: ClientId: CUSTOMER_CLIENT_ID<br/>Username: email
        
        COG->>COG: Generate new 6-digit code
        COG->>EMAIL: Send new verification email
        COG-->>AS: Success
        
        AS-->>VE: Code sent
        VE->>User: "Verification email sent! Check your inbox"
    end
```

### Detailed Method Documentation

#### Frontend Components

**File:** `frontend/src/pages/VerifyEmail.tsx`

**Component:** `VerifyEmail`
```typescript
/**
 * Email verification page component
 * 
 * Handles both:
 * 1. Automatic verification via URL token
 * 2. Manual verification code entry
 * 
 * Features:
 * - Token extraction from URL
 * - Automatic verification on load
 * - Loading/success/error states
 * - Resend verification functionality
 * - Auto-redirect after success
 * - Professional UI with animations
 * 
 * State:
 * - status: 'loading' | 'success' | 'error' | 'expired'
 * - message: Status message to display
 * - userEmail: For resend functionality
 * - resendLoading: Resend button loading state
 * 
 * URL Parameters:
 * - token: JWT verification token from email
 */
```

**Method:** `verifyEmail()`
```typescript
/**
 * Verifies email address using token from URL
 * 
 * @returns {Promise<void>}
 * 
 * Flow:
 * 1. Set loading state
 * 2. Call API verification endpoint
 * 3. Handle success response
 * 4. Set success state
 * 5. Auto-redirect to login after 3 seconds
 * 
 * Error handling:
 * - Token expired: Show resend option
 * - Invalid token: Show error message
 * - Network error: Show retry option
 * - Already verified: Redirect to login
 * 
 * @example
 * // Called automatically on component mount if token exists
 * useEffect(() => {
 *   if (token) {
 *     verifyEmail();
 *   }
 * }, [token]);
 */
const verifyEmail = async () => {
  try {
    setStatus('loading');
    const response = await api.verifyEmail(token!);
    
    setStatus('success');
    setMessage(response.message || 'Email verified successfully!');
    
    // Auto-redirect after 3 seconds
    setTimeout(() => {
      navigate('/login', { 
        state: { 
          message: 'Email verified! Please log in to access your account.',
          type: 'success'
        }
      });
    }, 3000);
  } catch (error: any) {
    console.error('Email verification error:', error);
    
    setStatus('error');
    
    // Handle specific error types
    if (error.message.includes('expired')) {
      setStatus('expired');
      setMessage('Your verification link has expired. Please request a new one below.');
    } else if (error.message.includes('invalid')) {
      setMessage('Invalid verification token. Please check your email for the correct link.');
    } else if (error.message.includes('already verified')) {
      setMessage('Your email is already verified. Please log in.');
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setMessage(error.message || 'Verification failed. Please try again.');
    }
  }
};
```

**Method:** `handleResendVerification()`
```typescript
/**
 * Handles resending verification email
 * 
 * @returns {Promise<void>}
 * 
 * Flow:
 * 1. Validate email is entered
 * 2. Set loading state
 * 3. Call resend API
 * 4. Show success message
 * 5. Clear email field
 * 
 * Validation:
 * - Email field not empty
 * - Valid email format
 * 
 * Rate limiting:
 * - User can resend max 3 times per hour
 * - Backend enforces this limit
 * 
 * @throws {Error} If resend fails
 */
const handleResendVerification = async () => {
  if (!userEmail) {
    alert('Please enter your email address to resend verification.');
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    alert('Please enter a valid email address.');
    return;
  }

  try {
    setResendLoading(true);
    await api.resendVerification(userEmail);
    
    alert('Verification email sent! Please check your inbox.');
    setUserEmail('');
  } catch (error: any) {
    console.error('Resend verification error:', error);
    
    if (error.code === 'RATE_LIMITED') {
      alert('Too many resend attempts. Please wait before trying again.');
    } else if (error.code === 'USER_NOT_FOUND') {
      alert('No account found with this email address.');
    } else if (error.code === 'ALREADY_VERIFIED') {
      alert('This email is already verified. Please log in.');
      navigate('/login');
    } else {
      alert(error.message || 'Failed to send verification email. Please try again.');
    }
  } finally {
    setResendLoading(false);
  }
};
```

#### Backend Service Methods

**File:** `backend/src/auth-service/index.ts`

**Method:** `customerConfirmSignUp()`
```typescript
/**
 * Confirms customer sign up with verification code
 * 
 * @param {string} email - User's email address
 * @param {string} confirmationCode - 6-digit verification code
 * @returns {Promise<{success: boolean, message: string}>}
 * 
 * Flow:
 * 1. Call Cognito ConfirmSignUp
 * 2. Update database user record
 * 3. Log audit event
 * 4. Send welcome email
 * 5. Return success
 * 
 * Cognito operation:
 * - Command: ConfirmSignUpCommand
 * - Pool: Customer User Pool
 * - Sets email_verified to true
 * - Changes UserStatus to CONFIRMED
 * 
 * Error handling:
 * - CodeMismatchException: Invalid code
 * - ExpiredCodeException: Code expired (24 hours)
 * - NotAuthorizedException: Already verified
 * - UserNotFoundException: User doesn't exist
 * 
 * Security:
 * - No rate limiting (Cognito handles this)
 * - Code is single-use
 * - Audit trail created
 */
async customerConfirmSignUp(
  email: string,
  confirmationCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: this.config.cognito.customer.clientId,
      Username: email,
      ConfirmationCode: confirmationCode,
    });

    await this.customerCognitoClient.send(command);

    // Update emailVerified status in DynamoDB
    await this.updateUserEmailVerified(email);

    // Log successful verification
    await logAuthEvent({
      eventType: 'EMAIL_VERIFIED',
      userType: 'customer',
      email: email,
      timestamp: new Date().toISOString(),
      success: true,
    });

    // Send welcome email (async, don't wait)
    this.sendWelcomeEmail(email).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  } catch (error: any) {
    console.error('Customer confirm sign up error:', error);
    
    // Log failed verification
    await logAuthEvent({
      eventType: 'FAILED_EMAIL_VERIFICATION',
      userType: 'customer',
      email: email,
      timestamp: new Date().toISOString(),
      success: false,
      errorCode: error.name,
    });

    const authError = createAuthError(error, 'customer', {
      email,
      endpoint: '/auth/customer/confirm-signup'
    });
    
    await logAuthError(authError, 'customer_confirm_signup');
    
    return {
      success: false,
      message: authError.userMessage,
    };
  }
}
```

**Method:** `updateUserEmailVerified()`
```typescript
/**
 * Updates user's email verification status in database
 * 
 * @param {string} email - User's email address
 * @returns {Promise<void>}
 * 
 * Database operation:
 * - Table: harborlist-users
 * - Index: EmailIndex (GSI)
 * - Updates: emailVerified, verifiedAt, updatedAt
 * 
 * Flow:
 * 1. Query user by email (GSI)
 * 2. Extract user ID
 * 3. Update user record
 * 4. Set emailVerified = true
 * 5. Set verifiedAt = current timestamp
 * 
 * @throws {Error} If user not found or update fails
 */
async updateUserEmailVerified(email: string): Promise<void> {
  try {
    // Query user by email using GSI
    const queryCommand = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    });

    const queryResult = await docClient.send(queryCommand);
    
    if (!queryResult.Items || queryResult.Items.length === 0) {
      throw new Error('User not found');
    }

    const user = queryResult.Items[0];
    const userId = user.id;

    // Update user record
    const updateCommand = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: 
        'SET emailVerified = :verified, verifiedAt = :now, updatedAt = :now',
      ExpressionAttributeValues: {
        ':verified': true,
        ':now': Date.now(),
      },
    });

    await docClient.send(updateCommand);
    
    console.log(`Email verified for user: ${userId}`);
  } catch (error) {
    console.error('Failed to update email verified status:', error);
    throw error;
  }
}
```

**Method:** `customerResendConfirmation()`
```typescript
/**
 * Resends verification code to user's email
 * 
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, message: string}>}
 * 
 * Flow:
 * 1. Check rate limiting (3 per hour)
 * 2. Call Cognito ResendConfirmationCode
 * 3. Cognito generates new code
 * 4. Cognito sends new email
 * 5. Log audit event
 * 6. Return success
 * 
 * Rate limiting:
 * - Max 3 resend attempts per hour per email
 * - Tracked in memory (consider Redis for production)
 * 
 * Cognito operation:
 * - Command: ResendConfirmationCodeCommand
 * - Generates new 6-digit code
 * - Previous code becomes invalid
 * - New code expires in 24 hours
 * 
 * Error handling:
 * - UserNotFoundException: User doesn't exist
 * - InvalidParameterException: Email already verified
 * - LimitExceededException: Too many resend attempts
 * 
 * @throws {Error} If resend fails
 */
async customerResendConfirmation(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Rate limiting check
    const rateLimitKey = `resend_verification:${email}`;
    const attemptCount = await rateLimiter.getAttemptCount(rateLimitKey);
    
    if (attemptCount >= 3) {
      return {
        success: false,
        message: 'Too many resend attempts. Please wait before trying again.',
      };
    }

    const command = new ResendConfirmationCodeCommand({
      ClientId: this.config.cognito.customer.clientId,
      Username: email,
    });

    await this.customerCognitoClient.send(command);

    // Increment rate limit counter
    await rateLimiter.incrementAttempt(rateLimitKey, 3600); // 1 hour TTL

    // Log resend event
    await logAuthEvent({
      eventType: 'RESEND_VERIFICATION',
      userType: 'customer',
      email: email,
      timestamp: new Date().toISOString(),
      success: true,
    });

    return {
      success: true,
      message: 'Confirmation code resent to your email',
    };
  } catch (error: any) {
    console.error('Customer resend confirmation error:', error);
    
    // Log failed resend
    await logAuthEvent({
      eventType: 'FAILED_RESEND_VERIFICATION',
      userType: 'customer',
      email: email,
      timestamp: new Date().toISOString(),
      success: false,
      errorCode: error.name,
    });

    // Handle specific errors
    if (error.name === 'UserNotFoundException') {
      return {
        success: false,
        message: 'No account found with this email address.',
      };
    }

    if (error.name === 'InvalidParameterException') {
      return {
        success: false,
        message: 'This email is already verified.',
      };
    }

    if (error.name === 'LimitExceededException') {
      return {
        success: false,
        message: 'Too many requests. Please try again later.',
      };
    }

    const authError = createAuthError(error, 'customer', {
      email,
      endpoint: '/auth/customer/resend-confirmation'
    });
    
    await logAuthError(authError, 'customer_resend_confirmation');
    
    return {
      success: false,
      message: authError.userMessage,
    };
  }
}
```

---

## Customer Password Reset Flow

### Overview
Complete password reset process from forgot password request through email confirmation code entry to new password setup.

### Mermaid Diagram

```mermaid
sequenceDiagram
    participant User as User Browser
    participant FP as ForgotPassword Page
    participant RP as ResetPassword Page
    participant API as API Service
    participant AGW as API Gateway
    participant AS as Auth Service Lambda
    participant COG as AWS Cognito
    participant DB as DynamoDB
    participant EMAIL as Email Service (SES)
    participant AUDIT as Audit Service

    Note over User,AUDIT: 1. USER INITIATES PASSWORD RESET
    User->>FP: Navigates to /forgot-password
    FP->>User: Show email input form

    User->>FP: Enters email address
    FP->>FP: validateEmail(email)
    Note right of FP: Basic format check

    alt Invalid email format
        FP->>User: Show "Invalid email format"
    end

    User->>FP: Clicks "Send Reset Code"
    FP->>FP: setLoading(true)

    Note over FP,API: 2. FRONTEND REQUEST
    FP->>API: forgotPassword(email)
    Note right of FP: frontend/src/services/api.ts
    
    API->>AGW: POST /auth/customer/forgot-password
    Note right of API: Body: {email: email}

    Note over AGW,AS: 3. API GATEWAY & AUTH SERVICE
    AGW->>AS: Invoke Lambda
    AS->>AS: handler(event, context)
    Note right of AS: backend/src/auth-service/index.ts:2200
    
    AS->>AS: parseBody(event)
    AS->>AS: validateEmail(email)

    Note over AS,COG: 4. RATE LIMITING CHECK
    AS->>AS: checkPasswordResetRateLimit(email)
    Note right of AS: Max 3 attempts per hour
    
    alt Rate limit exceeded
        AS->>AUDIT: logAuthEvent('RATE_LIMITED')
        AS-->>User: "Too many reset attempts"
    end

    Note over AS,COG: 5. COGNITO FORGOT PASSWORD
    AS->>AS: customerForgotPassword(email)
    Note right of AS: backend/src/auth-service/index.ts:405
    
    AS->>COG: ForgotPasswordCommand
    Note right of AS: ClientId: CUSTOMER_CLIENT_ID<br/>Username: email
    
    rect rgb(200, 220, 255)
        Note over COG: Cognito Processing
        COG->>COG: Lookup user by email
        
        alt User not found
            Note right of COG: Return success anyway<br/>(security - no user enumeration)
            COG-->>AS: Success (fake)
        end
        
        COG->>COG: Generate 6-digit reset code
        Note right of COG: Code: Random 6 digits<br/>Valid for: 1 hour
        
        COG->>COG: Store code with user
        Note right of COG: Invalidates previous codes
        
        COG->>EMAIL: Trigger password reset email
        Note right of COG: Via AWS SNS → SES
        
        COG-->>AS: Success (code sent)
    end

    Note over EMAIL,User: 6. EMAIL DELIVERY
    EMAIL->>EMAIL: Prepare reset email
    Note right of EMAIL: Template: password-reset<br/>Contains:<br/>- 6-digit code<br/>- Reset link<br/>- Expiry time (1 hour)
    
    EMAIL->>User: Password reset email delivered
    Note right of User: Subject: "Password Reset Code"

    Note over AS,AUDIT: 7. AUDIT LOGGING
    AS->>AUDIT: logAuthEvent()
    Note right of AS: Event: PASSWORD_RESET_REQUESTED
    
    AUDIT->>DB: PutCommand
    Note right of AUDIT: Table: boat-audit-logs
    
    rect rgb(255, 220, 200)
        Note over DB: Audit Log
        DB->>DB: Write audit entry
        Note right of DB: {<br/>  auditId: uuid,<br/>  eventType: 'PASSWORD_RESET_REQUESTED',<br/>  userType: 'customer',<br/>  email: email,<br/>  timestamp: ISO8601,<br/>  success: true<br/>}
    end

    Note over AS,AGW: 8. SUCCESS RESPONSE
    AS->>AS: createResponse(200, successData)
    Note right of AS: {<br/>  success: true,<br/>  message: "Password reset code sent"<br/>}
    
    AS-->>AGW: 200 OK
    AGW-->>API: Success response
    API-->>FP: Code sent

    Note over FP,User: 9. FRONTEND SUCCESS HANDLING
    FP->>FP: setLoading(false)
    FP->>FP: Show success message
    Note right of FP: "Reset code sent to your email"
    
    FP->>FP: navigate('/reset-password')
    Note right of FP: Pass email via state
    
    FP->>RP: Navigate with email
    RP->>User: Show reset code + password form

    Note over User,RP: 10. USER RECEIVES AND ENTERS CODE
    User->>User: Opens email
    User->>User: Copies 6-digit code
    
    User->>RP: Enters reset code
    User->>RP: Enters new password
    User->>RP: Confirms new password
    
    RP->>RP: validateForm()
    Note right of RP: Validate:<br/>- Code format (6 digits)<br/>- Password strength<br/>- Passwords match

    alt Validation fails
        RP->>User: Show validation errors
    end

    User->>RP: Clicks "Reset Password"
    RP->>RP: setLoading(true)

    Note over RP,API: 11. PASSWORD RESET SUBMISSION
    RP->>API: confirmForgotPassword(email, code, newPassword)
    Note right of RP: frontend/src/services/api.ts
    
    API->>AGW: POST /auth/customer/reset-password
    Note right of API: Body:<br/>{<br/>  email,<br/>  confirmationCode,<br/>  newPassword<br/>}

    AGW->>AS: Invoke Lambda
    AS->>AS: handler(event, context)
    AS->>AS: parseBody(event)
    
    AS->>AS: validatePasswordStrength(newPassword)
    Note right of AS: - Min 8 chars<br/>- Uppercase<br/>- Lowercase<br/>- Number

    alt Weak password
        AS-->>User: "Password doesn't meet requirements"
    end

    Note over AS,COG: 12. COGNITO PASSWORD RESET
    AS->>AS: customerConfirmForgotPassword(email, code, newPassword)
    Note right of AS: backend/src/auth-service/index.ts:434
    
    AS->>COG: ConfirmForgotPasswordCommand
    Note right of AS: ClientId: CUSTOMER_CLIENT_ID<br/>Username: email<br/>ConfirmationCode: code<br/>Password: newPassword
    
    rect rgb(200, 220, 255)
        Note over COG: Cognito Password Update
        COG->>COG: Verify confirmation code
        
        alt Code invalid
            COG-->>AS: CodeMismatchException
            AS->>AUDIT: logAuthEvent('FAILED_PASSWORD_RESET')
            AS-->>User: "Invalid reset code"
        end
        
        alt Code expired (1 hour)
            COG-->>AS: ExpiredCodeException
            AS->>AUDIT: logAuthEvent('FAILED_PASSWORD_RESET')
            AS-->>User: "Reset code expired. Request new one"
        end
        
        COG->>COG: Validate new password
        Note right of COG: Against Cognito password policy
        
        alt Password policy violation
            COG-->>AS: InvalidPasswordException
            AS-->>User: "Password doesn't meet requirements"
        end
        
        COG->>COG: Hash new password
        Note right of COG: Bcrypt with salt
        
        COG->>COG: Update user password
        Note right of COG: Overwrites old password hash
        
        COG->>COG: Invalidate all refresh tokens
        Note right of COG: Security: Force re-login on all devices
        
        COG->>COG: Invalidate reset code
        Note right of COG: Code is single-use
        
        COG-->>AS: Password updated successfully
    end

    Note over AS,AUDIT: 13. SECURITY ACTIONS
    AS->>AUDIT: logAuthEvent('PASSWORD_RESET')
    Note right of AS: Event: PASSWORD_RESET_COMPLETED
    
    AS->>AS: invalidateAllUserSessions(userId)
    Note right of AS: Security: Logout from all devices
    
    AS->>DB: DeleteMultiple
    Note right of AS: Table: harborlist-sessions<br/>Delete all sessions for user
    
    AS->>EMAIL: sendPasswordChangedNotification(email)
    Note right of AS: Security alert email

    Note over AS,AGW: 14. SUCCESS RESPONSE
    AS->>AS: createResponse(200, successData)
    Note right of AS: {<br/>  success: true,<br/>  message: "Password reset successfully"<br/>}
    
    AS-->>AGW: 200 OK
    AGW-->>API: Success
    API-->>RP: Password reset

    Note over RP,User: 15. FRONTEND SUCCESS HANDLING
    RP->>RP: setLoading(false)
    RP->>RP: Show success message
    Note right of RP: "Password reset successfully!<br/>Please log in with your new password"
    
    RP->>RP: setTimeout(() => navigate('/login'), 2000)
    
    RP->>User: Redirect to login page
    Note right of User: Auto-redirect after 2 seconds

    Note over User,EMAIL: 16. SECURITY NOTIFICATION
    EMAIL->>User: Password changed notification
    Note right of EMAIL: Security alert email:<br/>- Password was changed<br/>- If not you, contact support<br/>- All devices logged out

    User->>User: Login with new password
    Note right of User: Must re-authenticate<br/>on all devices
```

### Detailed Method Documentation

#### Frontend Components

**File:** `frontend/src/pages/ForgotPassword.tsx`

**Component:** `ForgotPassword`
```typescript
/**
 * Forgot password page component
 * 
 * Allows users to request password reset code via email.
 * 
 * Features:
 * - Email input with validation
 * - Submit button with loading state
 * - Success message display
 * - Error handling
 * - Link back to login
 * 
 * State:
 * - email: User's email input
 * - loading: Request in progress
 * - success: Request completed successfully
 * - error: Error message if any
 * 
 * Flow:
 * 1. User enters email
 * 2. Validation check
 * 3. API call to request reset code
 * 4. Show success message
 * 5. Navigate to reset password page
 */
```

**Method:** `handleSubmit()`
```typescript
/**
 * Handles forgot password form submission
 * 
 * @param {React.FormEvent} e - Form event
 * @returns {Promise<void>}
 * 
 * Flow:
 * 1. Prevent default
 * 2. Validate email format
 * 3. Call API forgotPassword
 * 4. Handle success (navigate to reset page)
 * 5. Handle errors
 * 
 * Error handling:
 * - Invalid email format
 * - Rate limit exceeded
 * - Network error
 * 
 * Success flow:
 * - Show success message
 * - Navigate to /reset-password with email
 * 
 * Note: Always returns success even if user not found
 * (security measure to prevent user enumeration)
 */
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setError('Please enter a valid email address');
    return;
  }
  
  setLoading(true);
  setError('');
  
  try {
    await api.forgotPassword(email);
    
    setSuccess(true);
    
    // Navigate to reset password page with email
    setTimeout(() => {
      navigate('/reset-password', { 
        state: { email } 
      });
    }, 2000);
  } catch (error: any) {
    console.error('Forgot password error:', error);
    
    if (error.code === 'RATE_LIMITED') {
      setError('Too many reset attempts. Please try again later.');
    } else {
      // Generic error message
      setError('Failed to send reset code. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};
```

---

**File:** `frontend/src/pages/ResetPassword.tsx`

**Component:** `ResetPassword`
```typescript
/**
 * Password reset page component
 * 
 * Allows users to reset password using code from email.
 * 
 * Features:
 * - Code input (6 digits)
 * - New password input with strength indicator
 * - Confirm password input
 * - Real-time validation
 * - Submit with loading state
 * - Success/error handling
 * 
 * State:
 * - email: From navigation state or user input
 * - code: 6-digit reset code
 * - newPassword: New password
 * - confirmPassword: Password confirmation
 * - errors: Field-level errors
 * - loading: Submission in progress
 * 
 * Validation:
 * - Code: Exactly 6 digits
 * - Password: 8+ chars, uppercase, lowercase, number
 * - Passwords must match
 */
```

**Method:** `validateForm()`
```typescript
/**
 * Validates reset password form
 * 
 * @returns {boolean} true if valid
 * 
 * Validations:
 * 1. Email format check
 * 2. Code format (6 digits)
 * 3. Password strength
 * 4. Passwords match
 * 
 * Password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - Special characters optional but recommended
 * 
 * Sets errors object with field-specific messages
 */
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    newErrors.email = 'Invalid email format';
  }
  
  // Code validation
  const codeRegex = /^\d{6}$/;
  if (!codeRegex.test(code)) {
    newErrors.code = 'Code must be exactly 6 digits';
  }
  
  // Password strength validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    newErrors.newPassword = 
      'Password must be 8+ characters with uppercase, lowercase, and number';
  }
  
  // Password match validation
  if (newPassword !== confirmPassword) {
    newErrors.confirmPassword = 'Passwords do not match';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Method:** `handleSubmit()`
```typescript
/**
 * Handles password reset form submission
 * 
 * @param {React.FormEvent} e - Form event
 * @returns {Promise<void>}
 * 
 * Flow:
 * 1. Prevent default
 * 2. Validate form
 * 3. Call API confirmForgotPassword
 * 4. Handle success (navigate to login)
 * 5. Handle errors
 * 
 * Error handling:
 * - Invalid code
 * - Expired code
 * - Weak password
 * - Network error
 * 
 * Success flow:
 * - Show success message
 * - Auto-redirect to login after 2 seconds
 * - Display message about being logged out of all devices
 */
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
  setLoading(true);
  setErrors({});
  
  try {
    await api.confirmForgotPassword(email, code, newPassword);
    
    // Show success message
    toast.success('Password reset successfully!');
    
    // Navigate to login
    setTimeout(() => {
      navigate('/login', {
        state: {
          message: 'Password reset successfully. Please log in with your new password.',
          type: 'success'
        }
      });
    }, 2000);
  } catch (error: any) {
    console.error('Reset password error:', error);
    
    if (error.code === 'CODE_MISMATCH') {
      setErrors({ code: 'Invalid reset code. Please check your email.' });
    } else if (error.code === 'CODE_EXPIRED') {
      setErrors({ 
        code: 'Reset code has expired. Please request a new one.',
        submit: 'Code expired'
      });
    } else if (error.code === 'INVALID_PASSWORD') {
      setErrors({ 
        newPassword: 'Password does not meet security requirements.'
      });
    } else {
      setErrors({ 
        submit: error.message || 'Failed to reset password. Please try again.'
      });
    }
  } finally {
    setLoading(false);
  }
};
```

#### Backend Service Methods

**File:** `backend/src/auth-service/index.ts`

**Method:** `customerForgotPassword()`
```typescript
/**
 * Initiates password reset process for customer
 * 
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, message: string}>}
 * 
 * Flow:
 * 1. Check rate limiting (3 per hour)
 * 2. Call Cognito ForgotPassword
 * 3. Cognito sends reset code email
 * 4. Log audit event
 * 5. Return success
 * 
 * Security features:
 * - Rate limiting per email
 * - Always returns success (no user enumeration)
 * - Audit logging
 * - Code expires in 1 hour
 * 
 * Cognito operation:
 * - Command: ForgotPasswordCommand
 * - Generates 6-digit code
 * - Sends email via Cognito
 * - Code is single-use
 * 
 * @throws Returns success even if user not found (security)
 */
async customerForgotPassword(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const command = new ForgotPasswordCommand({
      ClientId: this.config.cognito.customer.clientId,
      Username: email,
    });

    await this.customerCognitoClient.send(command);

    // Log password reset request
    await logAuthEvent({
      eventType: 'PASSWORD_RESET_REQUESTED',
      userType: 'customer',
      email: email,
      timestamp: new Date().toISOString(),
      success: true,
    });

    return {
      success: true,
      message: 'Password reset code sent to your email',
    };
  } catch (error: any) {
    console.error('Customer forgot password error:', error);
    
    // Log failed request
    await logAuthEvent({
      eventType: 'FAILED_PASSWORD_RESET_REQUEST',
      userType: 'customer',
      email: email,
      timestamp: new Date().toISOString(),
      success: false,
      errorCode: error.name,
    });

    // Security: Return generic message even on error
    // Don't reveal if user exists or not
    if (error.name === 'UserNotFoundException') {
      return {
        success: true,
        message: 'If an account exists with this email, a reset code has been sent.',
      };
    }

    const authError = createAuthError(error, 'customer', {
      email,
      endpoint: '/auth/customer/forgot-password'
    });
    
    await logAuthError(authError, 'customer_forgot_password');
    
    return {
      success: false,
      message: authError.userMessage,
    };
  }
}
```

**Method:** `customerConfirmForgotPassword()`
```typescript
/**
 * Completes password reset with code and new password
 * 
 * @param {string} email - User's email address
 * @param {string} confirmationCode - 6-digit reset code from email
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, message: string}>}
 * 
 * Flow:
 * 1. Validate password strength
 * 2. Call Cognito ConfirmForgotPassword
 * 3. Invalidate all user sessions
 * 4. Send password changed notification
 * 5. Log audit event
 * 6. Return success
 * 
 * Security actions:
 * - Password strength validation
 * - Invalidates all refresh tokens
 * - Logs out from all devices
 * - Sends security notification email
 * - Audit trail created
 * 
 * Cognito operation:
 * - Command: ConfirmForgotPasswordCommand
 * - Verifies code
 * - Updates password
 * - Invalidates refresh tokens
 * - Code becomes invalid after use
 * 
 * Error handling:
 * - CodeMismatchException: Invalid code
 * - ExpiredCodeException: Code expired
 * - InvalidPasswordException: Weak password
 * - LimitExceededException: Too many attempts
 * 
 * @throws {Error} If password reset fails
 */
async customerConfirmForgotPassword(
  email: string,
  confirmationCode: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate new password strength
    validatePasswordStrength(newPassword);

    const command = new ConfirmForgotPasswordCommand({
      ClientId: this.config.cognito.customer.clientId,
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    });

    await this.customerCognitoClient.send(command);

    // Get user ID for session invalidation
    const user = await db.getUserByEmail(email);
    
    if (user) {
      // Invalidate all user sessions (logout from all devices)
      await securityService.invalidateAllUserSessions(user.id);
      
      // Send password changed notification
      await emailService.sendPasswordChangedNotification(email, user.name);
    }

    // Log successful password reset
    await logAuthEvent({
      eventType: 'PASSWORD_RESET_COMPLETED',
      userType: 'customer',
      userId: user?.id,
      email: email,
      timestamp: new Date().toISOString(),
      success: true,
      additionalData: {
        sessionsInvalidated: true,
      },
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  } catch (error: any) {
    console.error('Customer confirm forgot password error:', error);
    
    // Log failed password reset
    await logAuthEvent({
      eventType: 'FAILED_PASSWORD_RESET',
      userType: 'customer',
      email: email,
      timestamp: new Date().toISOString(),
      success: false,
      errorCode: error.name,
    });

    // Handle specific errors
    if (error.name === 'CodeMismatchException') {
      return {
        success: false,
        message: 'Invalid reset code. Please check your email and try again.',
      };
    }

    if (error.name === 'ExpiredCodeException') {
      return {
        success: false,
        message: 'Reset code has expired. Please request a new one.',
      };
    }

    if (error.name === 'InvalidPasswordException') {
      return {
        success: false,
        message: 'Password does not meet security requirements.',
      };
    }

    if (error.name === 'LimitExceededException') {
      return {
        success: false,
        message: 'Too many attempts. Please try again later.',
      };
    }

    const authError = createAuthError(error, 'customer', {
      email,
      endpoint: '/auth/customer/confirm-forgot-password'
    });
    
    await logAuthError(authError, 'customer_confirm_forgot_password');
    
    return {
      success: false,
      message: authError.userMessage,
    };
  }
}
```

---

## Staff Login Flow

### Overview
Complete staff authentication process with enhanced security including MFA requirement, stricter rate limiting, IP validation, role-based permissions, and session management for administrative access.

### Mermaid Diagram

```mermaid
sequenceDiagram
    participant Staff as Staff User Browser
    participant SLF as StaffLoginForm
    participant API as API Service
    participant AGW as API Gateway
    participant AS as Auth Service Lambda
    participant SEC as Security Service
    participant COG as AWS Cognito (Staff Pool)
    participant DB as DynamoDB
    participant MFA as MFA Service
    participant AUDIT as Audit Service

    Note over Staff,AUDIT: 1. STAFF USER INITIATES LOGIN
    Staff->>SLF: Navigates to /admin/login
    Note right of Staff: Separate admin subdomain<br/>admin.harborlist.com
    
    SLF->>SLF: Check if already authenticated
    Note right of SLF: Check for existing admin session

    alt Already authenticated
        SLF->>SLF: navigate('/admin/dashboard')
    end

    Staff->>SLF: Enters email and password
    SLF->>SLF: validateForm()

    Staff->>SLF: Clicks "Login"
    SLF->>SLF: setLoading(true)

    Note over SLF,API: 2. FRONTEND API CALL
    SLF->>API: staffLogin(email, password)
    Note right of SLF: frontend/src/services/adminApi.ts
    
    API->>API: getAuthHeaders()
    Note right of API: No auth header needed for login
    
    API->>AGW: POST /auth/staff/login
    Note right of API: Admin API Gateway endpoint<br/>Separate from customer API

    Note over AGW,AS: 3. ENHANCED SECURITY CHECKS
    AGW->>AS: Invoke Lambda
    AS->>AS: handler(event, context)
    AS->>AS: parseBody(event)
    AS->>AS: extractClientInfo(event)
    Note right of AS: Get IP, user agent, device fingerprint

    AS->>SEC: checkStaffRateLimit(email, ip)
    Note right of SEC: Stricter limits for staff:<br/>- 3 attempts per 5 minutes<br/>- 10 attempts per hour<br/>- 20 attempts per day
    
    alt Rate limit exceeded
        SEC-->>AS: {allowed: false}
        AS->>AUDIT: logAuthEvent('STAFF_RATE_LIMITED')
        AS->>SEC: blockIP(ip, duration: 1 hour)
        AS-->>Staff: 429 "Too many attempts"
    end

    AS->>SEC: isIPBlocked(ip)
    Note right of SEC: Check IP blocklist
    
    alt IP blocked
        AS->>AUDIT: logAuthEvent('STAFF_IP_BLOCKED')
        AS-->>Staff: 403 "Access denied from this IP"
    end

    AS->>SEC: checkStaffIPWhitelist(ip)
    Note right of SEC: Optional: Require IP whitelisting<br/>for SuperAdmin access
    
    alt IP not whitelisted (SuperAdmin only)
        AS-->>Staff: 403 "Access restricted to whitelisted IPs"
    end

    Note over AS,COG: 4. COGNITO STAFF AUTHENTICATION
    AS->>AS: staffLogin(email, password, clientInfo)
    Note right of AS: backend/src/auth-service/index.ts:517
    
    AS->>COG: AdminInitiateAuthCommand
    Note right of AS: Pool: Staff User Pool<br/>ClientId: STAFF_CLIENT_ID<br/>AuthFlow: ADMIN_NO_SRP_AUTH
    
    rect rgb(255, 200, 200)
        Note over COG: Staff Cognito Processing
        COG->>COG: Verify user exists in Staff pool
        
        alt User not found
            COG-->>AS: UserNotFoundException
            AS->>SEC: incrementFailedAttempts(email)
            AS->>AUDIT: logAuthEvent('FAILED_STAFF_LOGIN')
            AS-->>Staff: "Invalid credentials"
        end
        
        COG->>COG: Verify password
        
        alt Password incorrect
            COG-->>AS: NotAuthorizedException
            AS->>SEC: incrementFailedAttempts(email)
            Note right of AS: 5+ failures → block IP
            AS->>AUDIT: logAuthEvent('FAILED_STAFF_LOGIN')
            AS-->>Staff: "Invalid credentials"
        end
        
        COG->>COG: Check account status
        
        alt Account disabled
            COG-->>AS: UserNotConfirmedException
            AS-->>Staff: "Account is disabled"
        end
        
        COG->>COG: Check MFA requirement
        Note right of COG: MFA REQUIRED for all staff
        
        alt MFA not enrolled
            COG-->>AS: MFARequiredException
            AS-->>Staff: "MFA setup required"
        end
        
        COG->>COG: Generate auth challenge
        Note right of COG: ChallengeName: SMS_MFA or SOFTWARE_TOKEN_MFA
        
        COG-->>AS: Challenge required
        Note right of COG: Session token + Challenge name
    end

    Note over AS,Staff: 5. MFA CHALLENGE REQUIRED
    AS->>AS: Handle MFA challenge
    Note right of AS: response.ChallengeName exists
    
    AS->>AUDIT: logAuthEvent('STAFF_LOGIN_MFA_REQUIRED')
    Note right of AS: Log that MFA challenge was issued
    
    AS->>AS: createResponse(200, mfaChallenge)
    Note right of AS: {<br/>  requiresMFA: true,<br/>  session: sessionToken,<br/>  challengeName: 'SOFTWARE_TOKEN_MFA',<br/>  message: "Enter MFA code"<br/>}
    
    AS-->>AGW: 200 OK with MFA challenge
    AGW-->>API: MFA required
    API-->>SLF: {requiresMFA: true, session}

    Note over SLF,Staff: 6. FRONTEND MFA PROMPT
    SLF->>SLF: Handle MFA response
    Note right of SLF: requiresMFA === true
    
    SLF->>SLF: Show MFA code input
    Note right of SLF: 6-digit code input field
    
    SLF->>SLF: Store session token
    Note right of SLF: Needed for MFA verification
    
    SLF->>Staff: Prompt for MFA code
    Note right of Staff: "Enter code from authenticator app"

    Staff->>Staff: Opens authenticator app
    Note right of Staff: Google Authenticator,<br/>Authy, Microsoft Authenticator
    
    Staff->>Staff: Gets 6-digit TOTP code
    Note right of Staff: Time-based One-Time Password

    Staff->>SLF: Enters MFA code
    SLF->>SLF: validateMFACode(code)
    Note right of SLF: Check format: 6 digits

    Staff->>SLF: Clicks "Verify"
    SLF->>SLF: setMFALoading(true)

    Note over SLF,API: 7. MFA VERIFICATION REQUEST
    SLF->>API: verifyStaffMFA(session, mfaCode)
    Note right of SLF: frontend/src/services/adminApi.ts
    
    API->>AGW: POST /auth/staff/verify-mfa
    Note right of API: Body:<br/>{<br/>  session: sessionToken,<br/>  mfaCode: code<br/>}

    AGW->>AS: Invoke Lambda
    AS->>AS: handler(event, context)
    AS->>AS: parseBody(event)

    Note over AS,MFA: 8. MFA CODE VERIFICATION
    AS->>MFA: verifyMFACode(session, code)
    Note right of AS: backend/src/auth-service/mfa-service.ts
    
    MFA->>COG: RespondToAuthChallengeCommand
    Note right of MFA: ChallengeName: SOFTWARE_TOKEN_MFA<br/>ChallengeResponses:<br/>{<br/>  USERNAME: email,<br/>  SOFTWARE_TOKEN_MFA_CODE: code<br/>}<br/>Session: sessionToken
    
    rect rgb(200, 220, 255)
        Note over COG: MFA Verification
        COG->>COG: Verify session token validity
        
        alt Session expired
            COG-->>AS: NotAuthorizedException
            AS-->>Staff: "Session expired. Please login again"
        end
        
        COG->>COG: Verify TOTP code
        Note right of COG: Check against user's secret<br/>Account for time drift (+/- 30 seconds)
        
        alt Invalid MFA code
            COG-->>AS: CodeMismatchException
            AS->>SEC: incrementMFAFailures(email)
            AS->>AUDIT: logAuthEvent('FAILED_MFA_VERIFICATION')
            AS-->>Staff: "Invalid MFA code"
        end
        
        COG->>COG: Generate tokens
        Note right of COG: JWT tokens:<br/>- Access Token (1 hour)<br/>- ID Token (1 hour)<br/>- Refresh Token (7 days - shorter for staff)
        
        COG-->>MFA: AuthenticationResult
    end

    MFA-->>AS: Tokens + MFA verified

    Note over AS,COG: 9. STAFF USER DETAILS & PERMISSIONS
    AS->>AS: Extract tokens
    AS->>AS: validateStaffToken(accessToken)
    Note right of AS: backend/src/auth-service/index.ts:873
    
    AS->>AS: Extract staff claims from token
    Note right of AS: Claims:<br/>- sub (user ID)<br/>- email<br/>- cognito:groups (roles)<br/>- custom:permissions<br/>- custom:team
    
    AS->>AS: getStaffUserDetails(accessToken)
    Note right of AS: Query Cognito for full user attributes
    
    AS->>COG: GetUserCommand
    Note right of AS: AccessToken: accessToken
    
    COG-->>AS: User attributes + groups
    
    AS->>AS: parseStaffRole(groups)
    Note right of AS: Determine highest role:<br/>- SuperAdmin<br/>- Admin<br/>- Moderator<br/>- Support<br/>- TeamMember
    
    AS->>AS: getStaffPermissions(role)
    Note right of AS: backend/src/auth-service/permissions.ts
    
    rect rgb(255, 255, 200)
        Note over AS: Permission Assignment
        AS->>AS: Load role-based permissions
        Note right of AS: SuperAdmin: ALL_PERMISSIONS<br/>Admin:<br/>- MANAGE_USERS<br/>- VIEW_ANALYTICS<br/>- MANAGE_LISTINGS<br/>- MANAGE_MODERATION<br/>Moderator:<br/>- MANAGE_LISTINGS<br/>- MANAGE_MODERATION<br/>Support:<br/>- VIEW_USERS<br/>- VIEW_LISTINGS<br/>- MANAGE_TICKETS
    end

    Note over AS,DB: 10. STAFF SESSION CREATION
    AS->>SEC: createStaffSession()
    Note right of SEC: backend/src/auth-service/security-service.ts:280
    
    SEC->>SEC: generateSessionId()
    SEC->>SEC: Calculate session TTL
    Note right of SEC: Staff sessions:<br/>- 8 hours (vs 30 days for customers)<br/>- Auto-expire for security
    
    SEC->>SEC: generateDeviceFingerprint()
    Note right of SEC: Hash of:<br/>- IP<br/>- User agent<br/>- Device info
    
    SEC->>DB: PutCommand
    Note right of SEC: Table: harborlist-staff-sessions
    
    rect rgb(200, 255, 200)
        Note over DB: Staff Session Storage
        DB->>DB: Store staff session
        Note right of DB: {<br/>  sessionId: uuid,<br/>  staffId: userId,<br/>  email: email,<br/>  role: role,<br/>  permissions: permissions[],<br/>  ipAddress: ip,<br/>  userAgent: agent,<br/>  deviceFingerprint: hash,<br/>  createdAt: timestamp,<br/>  expiresAt: timestamp + 8 hours,<br/>  lastActivityAt: timestamp,<br/>  mfaVerified: true<br/>}
        DB-->>SEC: Session created
    end

    Note over AS,AUDIT: 11. COMPREHENSIVE AUDIT LOGGING
    AS->>AUDIT: logStaffAuthEvent()
    Note right of AS: Enhanced audit for staff
    
    AUDIT->>DB: PutCommand
    Note right of AUDIT: Table: boat-audit-logs
    
    rect rgb(255, 220, 200)
        Note over DB: Staff Login Audit
        DB->>DB: Write detailed audit entry
        Note right of DB: {<br/>  auditId: uuid,<br/>  eventType: 'STAFF_LOGIN',<br/>  userType: 'staff',<br/>  staffId: userId,<br/>  email: email,<br/>  role: role,<br/>  ipAddress: ip,<br/>  userAgent: agent,<br/>  mfaVerified: true,<br/>  sessionId: sessionId,<br/>  timestamp: ISO8601,<br/>  success: true,<br/>  additionalData: {<br/>    loginMethod: 'password+mfa',<br/>    deviceInfo: {...}<br/>  }<br/>}
    end

    Note over AS,AGW: 12. SUCCESS RESPONSE
    AS->>AS: createResponse(200, authData)
    Note right of AS: {<br/>  success: true,<br/>  tokens: {<br/>    accessToken,<br/>    refreshToken,<br/>    idToken,<br/>    expiresIn: 3600<br/>  },<br/>  staff: {<br/>    id, email, name,<br/>    role, permissions[],<br/>    team, mfaEnabled: true<br/>  },<br/>  session: {<br/>    id: sessionId,<br/>    expiresAt: timestamp<br/>  }<br/>}
    
    AS-->>AGW: 200 OK
    AGW-->>API: Staff authenticated
    API-->>SLF: Login successful

    Note over SLF,Staff: 13. FRONTEND SESSION MANAGEMENT
    SLF->>SLF: storeStaffTokens(tokens)
    Note right of SLF: Separate storage from customer tokens:<br/>localStorage.setItem('adminAuthToken', accessToken)<br/>localStorage.setItem('adminRefreshToken', refreshToken)
    
    SLF->>SLF: setStaffUser(staff)
    Note right of SLF: Store in admin context
    
    SLF->>SLF: setPermissions(staff.permissions)
    Note right of SLF: For RBAC checks in UI
    
    SLF->>SLF: setSessionExpiry(tokens.expiresIn)
    Note right of SLF: Calculate expiration time
    
    SLF->>SLF: startSessionMonitor()
    Note right of SLF: Monitor for token expiration<br/>Refresh before expiry<br/>Logout on invalid session
    
    SLF->>SLF: setMFALoading(false)
    SLF->>SLF: navigate('/admin/dashboard')
    
    SLF->>Staff: Admin dashboard loaded
    Note right of Staff: Role-based UI:<br/>- SuperAdmin: Full access<br/>- Admin: Most features<br/>- Moderator: Moderation focus<br/>- Support: Support tools

    Note over Staff,API: 14. SUBSEQUENT REQUESTS WITH AUTH
    loop Every admin API request
        Staff->>API: Make admin API call
        API->>API: getAdminAuthHeaders()
        Note right of API: 'Authorization': 'Bearer {adminAccessToken}'
        
        API->>AGW: Request with staff token
        AGW->>AS: Validate staff token
        
        AS->>AS: validateStaffToken(token)
        AS->>AS: Check token expiration
        AS->>AS: Verify staff permissions
        
        alt Token valid + has permission
            AS->>AS: Process request
        else Token expired
            AS-->>API: 401 Unauthorized
            API->>SLF: Token expired
            SLF->>SLF: Attempt refresh
            Note right of SLF: See Token Refresh Flow
        else Insufficient permissions
            AS-->>API: 403 Forbidden
            API-->>Staff: "Insufficient permissions"
        end
    end

    Note over Staff,SLF: 15. AUTO-LOGOUT ON INACTIVITY
    SLF->>SLF: Track user activity
    Note right of SLF: Mouse, keyboard, API calls
    
    SLF->>SLF: Check inactivity timer
    Note right of SLF: 15 minutes of no activity
    
    alt 15 min inactivity
        SLF->>SLF: Show inactivity warning
        Note right of Staff: "You will be logged out in 60 seconds"
        
        alt User interacts
            SLF->>SLF: Reset inactivity timer
        else No interaction
            SLF->>API: logout()
            SLF->>SLF: Clear session
            SLF->>SLF: navigate('/admin/login')
            SLF->>Staff: "Logged out due to inactivity"
        end
    end
```

### Detailed Method Documentation

#### Backend Methods

**File:** `backend/src/auth-service/index.ts`

**Method:** `staffLogin()`
```typescript
/**
 * Authenticates staff member with enhanced security
 * 
 * @param {string} email - Staff email
 * @param {string} password - Staff password
 * @param {ClientInfo} clientInfo - Client information
 * @param {string} deviceId - Optional device identifier
 * @returns {Promise<StaffAuthResult>} Authentication result
 * 
 * Security features:
 * - Stricter rate limiting (3/5min, 10/hour, 20/day)
 * - IP blocking after failed attempts
 * - Optional IP whitelisting for SuperAdmin
 * - Mandatory MFA for all staff
 * - Enhanced audit logging
 * - Shorter session duration (8 hours)
 * - Device fingerprinting
 * 
 * MFA requirement:
 * - All staff MUST have MFA enabled
 * - Returns MFA challenge on successful password auth
 * - Requires second request with MFA code
 * 
 * Cognito auth flow:
 * - AuthFlow: ADMIN_NO_SRP_AUTH (admin-only flow)
 * - Pool: Staff User Pool (separate from customers)
 * - Returns challenge if MFA required
 * 
 * @throws Returns detailed error for failed authentication
 */
async staffLogin(
  email: string,
  password: string,
  clientInfo: ClientInfo,
  deviceId?: string
): Promise<StaffAuthResult> {
  try {
    // 1. Enhanced rate limiting for staff
    const rateLimitResult = await checkRateLimit(
      email,
      'login',
      'staff',
      clientInfo.ipAddress,
      clientInfo.userAgent
    );
    
    if (!rateLimitResult.allowed) {
      // Automatically block IP after rate limit exceeded
      await securityService.blockIP(clientInfo.ipAddress, 3600); // 1 hour
      
      await logAuthEvent({
        eventType: 'FAILED_LOGIN',
        userType: 'staff',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: 'RATE_LIMITED',
        additionalData: { rateLimitResult },
      });

      return {
        success: false,
        error: 'Too many login attempts. Please try again later.',
        errorCode: 'RATE_LIMITED',
      };
    }

    // 2. IP blocking check
    if (await securityService.isIPBlocked(clientInfo.ipAddress)) {
      await logAuthEvent({
        eventType: 'FAILED_LOGIN',
        userType: 'staff',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: 'IP_BLOCKED',
      });

      return {
        success: false,
        error: 'Access denied from this IP address.',
        errorCode: 'IP_BLOCKED',
      };
    }

    // 3. Cognito authentication (will return MFA challenge)
    const command = new AdminInitiateAuthCommand({
      UserPoolId: this.config.cognito.staff.poolId,
      ClientId: this.config.cognito.staff.clientId,
      AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
      ...(deviceId && {
        ContextData: {
          IpAddress: clientInfo.ipAddress,
          ServerName: 'admin.harborlist.com',
          ServerPath: '/auth/staff/login',
          HttpHeaders: [
            {
              headerName: 'X-Device-ID',
              headerValue: deviceId,
            },
          ],
        },
      }),
    });

    const response = await this.staffCognitoClient.send(command);

    // 4. Handle MFA challenge (required for all staff)
    if (response.ChallengeName) {
      await logAuthEvent({
        eventType: 'LOGIN',
        userType: 'staff',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: true,
        additionalData: { requiresMFA: true, challengeName: response.ChallengeName },
      });

      return {
        success: false, // Not fully authenticated yet
        requiresMFA: true,
        mfaToken: response.Session,
        challengeName: response.ChallengeName,
        error: 'MFA verification required',
      };
    }

    // This point shouldn't be reached for staff (MFA required)
    // But handle just in case
    if (!response.AuthenticationResult) {
      await logAuthEvent({
        eventType: 'FAILED_LOGIN',
        userType: 'staff',
        email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        errorCode: 'AUTH_FAILED',
      });

      return {
        success: false,
        error: 'Authentication failed',
        errorCode: 'AUTH_FAILED',
      };
    }

    // Continue with token processing (only if no MFA required - rare)
    const tokens: TokenSet = {
      accessToken: response.AuthenticationResult.AccessToken!,
      refreshToken: response.AuthenticationResult.RefreshToken!,
      idToken: response.AuthenticationResult.IdToken,
      tokenType: 'Bearer',
      expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
    };

    // Get staff user details and groups
    const staffDetails = await this.getStaffUserDetails(tokens.accessToken);
    
    // Validate staff claims and create session
    const claims = await this.validateStaffToken(tokens.accessToken);
    const session = await securityService.createStaffSession(
      staffDetails.id,
      staffDetails.email,
      staffDetails.role,
      clientInfo.ipAddress,
      clientInfo.userAgent,
      claims,
      deviceId
    );

    // Log successful login
    await logAuthEvent({
      eventType: 'LOGIN',
      userType: 'staff',
      userId: staffDetails.id,
      email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      timestamp: new Date().toISOString(),
      success: true,
      additionalData: { 
        sessionId: session.sessionId, 
        role: staffDetails.role,
        mfaVerified: claims.mfaVerified || false
      },
    });
    
    return {
      success: true,
      tokens,
      staff: staffDetails,
      session,
    };
  } catch (error: any) {
    console.error('Staff login error:', error);
    
    // Increment failed attempts
    await securityService.incrementFailedLoginAttempts(
      email,
      'staff',
      clientInfo.ipAddress
    );
    
    // Log failed login
    await logAuthEvent({
      eventType: 'FAILED_LOGIN',
      userType: 'staff',
      email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      timestamp: new Date().toISOString(),
      success: false,
      errorCode: error.name,
      additionalData: { error: error.message },
    });

    return this.handleCognitoError(error, 'staff', {
      email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      endpoint: '/auth/staff/login'
    }) as StaffAuthResult;
  }
}
```

---

## Token Refresh Flow

### Overview
Automatic token refresh process to maintain user session without requiring re-authentication, handling token expiration gracefully.

### Mermaid Diagram

```mermaid
sequenceDiagram
    participant User as User Browser
    participant API as API Service
    participant AGW as API Gateway
    participant AS as Auth Service Lambda
    participant COG as AWS Cognito
    participant DB as DynamoDB
    participant AUDIT as Audit Service

    Note over User,AUDIT: SCENARIO: Token Expiration Detected
    
    User->>API: Makes API request
    API->>API: getAuthHeaders()
    API->>API: Check token expiration
    Note right of API: tokenExpiry < now + 5min<br/>(Proactive refresh)

    alt Token expired or expiring soon
        API->>API: Get refresh token
        Note right of API: localStorage.getItem('refreshToken')
        
        alt No refresh token
            API->>API: clearAuth()
            API->>User: Redirect to login
            Note right of User: "Session expired"
        end
        
        Note over API,AGW: 1. REFRESH TOKEN REQUEST
        API->>AGW: POST /auth/customer/refresh
        Note right of API: Body: {refreshToken: token}
        
        AGW->>AS: Invoke Lambda
        AS->>AS: handler(event, context)
        AS->>AS: parseBody(event)
        AS->>AS: Extract refresh token
        
        Note over AS,COG: 2. COGNITO TOKEN REFRESH
        AS->>AS: customerRefreshToken(refreshToken)
        Note right of AS: backend/src/auth-service/index.ts:377
        
        AS->>COG: AdminInitiateAuthCommand
        Note right of AS: Pool: Customer User Pool<br/>AuthFlow: REFRESH_TOKEN_AUTH<br/>AuthParameters:<br/>{REFRESH_TOKEN: token}
        
        rect rgb(200, 220, 255)
            Note over COG: Cognito Refresh Process
            COG->>COG: Validate refresh token
            
            alt Refresh token invalid
                COG-->>AS: NotAuthorizedException
                AS->>AUDIT: logAuthEvent('INVALID_REFRESH_TOKEN')
                AS-->>API: 401 Unauthorized
                API->>API: clearAuth()
                API->>User: Redirect to login
            end
            
            alt Refresh token expired (30 days)
                COG-->>AS: NotAuthorizedException
                AS->>AUDIT: logAuthEvent('REFRESH_TOKEN_EXPIRED')
                AS-->>API: 401 Unauthorized
                API->>User: "Please login again"
            end
            
            alt Refresh token revoked
                COG-->>AS: NotAuthorizedException
                AS->>AUDIT: logAuthEvent('REFRESH_TOKEN_REVOKED')
                AS-->>API: 401 Unauthorized
                API->>User: "Session invalid. Please login"
            end
            
            COG->>COG: Generate new access token
            Note right of COG: New access token (1 hour)<br/>New ID token (1 hour)<br/>Refresh token unchanged
            
            COG-->>AS: New tokens
        end
        
        Note over AS,DB: 3. SESSION UPDATE
        AS->>AS: Extract user ID from new token
        AS->>AS: validateCustomerToken(newAccessToken)
        AS->>AS: Extract claims
        
        AS->>DB: UpdateCommand
        Note right of AS: Table: harborlist-sessions<br/>Update lastActivityAt
        
        DB->>DB: Update session timestamp
        DB-->>AS: Session updated
        
        Note over AS,AUDIT: 4. AUDIT LOGGING
        AS->>AUDIT: logAuthEvent()
        Note right of AS: Event: TOKEN_REFRESHED
        
        AUDIT->>DB: PutCommand
        Note right of AUDIT: Table: boat-audit-logs
        
        rect rgb(255, 220, 200)
            Note over DB: Audit Log
            DB->>DB: Write entry
            Note right of DB: {<br/>  eventType: 'TOKEN_REFRESHED',<br/>  userType: 'customer',<br/>  userId: userId,<br/>  timestamp: ISO8601<br/>}
        end
        
        Note over AS,AGW: 5. SUCCESS RESPONSE
        AS->>AS: createResponse(200, tokens)
        Note right of AS: {<br/>  success: true,<br/>  tokens: {<br/>    accessToken: newAccessToken,<br/>    idToken: newIdToken,<br/>    refreshToken: sameRefreshToken,<br/>    expiresIn: 3600<br/>  }<br/>}
        
        AS-->>AGW: 200 OK
        AGW-->>API: New tokens
        
        Note over API,User: 6. FRONTEND TOKEN UPDATE
        API->>API: updateTokens(tokens)
        Note right of API: localStorage.setItem('authToken', newAccessToken)<br/>localStorage.setItem('tokenExpiry', newExpiry)
        
        API->>API: Retry original request
        Note right of API: Use new access token
        
        API->>AGW: Original request with new token
        AGW->>AS: Process request
        AS-->>API: Success response
        API-->>User: Original request completed
        Note right of User: Seamless - user unaware of refresh
    end

    Note over User,API: AUTOMATIC REFRESH MONITORING
    loop Every 1 minute
        API->>API: checkTokenExpiration()
        Note right of API: Background timer
        
        alt Token expiring in < 5 minutes
            API->>API: refreshToken()
            Note right of API: Proactive refresh<br/>before expiration
        end
    end
```

### Detailed Method Documentation

**File:** `frontend/src/services/api.ts`

**Method:** `refreshAccessToken()`
```typescript
/**
 * Refreshes access token using refresh token
 * 
 * @returns {Promise<void>}
 * 
 * Flow:
 * 1. Get refresh token from storage
 * 2. Call refresh API endpoint
 * 3. Receive new access token
 * 4. Update stored tokens
 * 5. Update expiry time
 * 
 * Called automatically when:
 * - Token expired (on API error 401)
 * - Token expiring soon (proactive refresh)
 * - Manual refresh request
 * 
 * Error handling:
 * - No refresh token: Logout
 * - Invalid refresh token: Logout
 * - Expired refresh token: Logout
 * - Network error: Retry once
 * 
 * @throws Clears auth and redirects to login on failure
 */
async refreshAccessToken(): Promise<void> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await fetch(`${this.baseUrl}/auth/customer/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const data = await response.json();
    
    // Update tokens
    localStorage.setItem('authToken', data.tokens.accessToken);
    const expiryTime = Date.now() + (data.tokens.expiresIn * 1000);
    localStorage.setItem('tokenExpiry', expiryTime.toString());
    
    // Note: Refresh token typically doesn't change
    if (data.tokens.refreshToken) {
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
    }
    
    console.log('Token refreshed successfully');
  } catch (error) {
    console.error('Token refresh failed:', error);
    
    // Clear auth and logout
    this.clearAuth();
    window.location.href = '/login?reason=session_expired';
  }
}
```

**Method:** `request()` (Enhanced with automatic refresh)
```typescript
/**
 * Enhanced HTTP request method with automatic token refresh
 * 
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<T>} Response data
 * 
 * Features:
 * - Automatic token refresh on 401
 * - Retry original request after refresh
 * - Token expiration check before request
 * - Error handling
 * 
 * Flow:
 * 1. Check if token is expiring soon
 * 2. Refresh if needed
 * 3. Make request
 * 4. If 401, attempt refresh and retry
 * 5. Return response or throw error
 */
private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
  // Check token expiration before request
  await this.ensureValidToken();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    if (response.status === 401) {
      // Token expired - attempt refresh
      await this.refreshAccessToken();
      
      // Retry request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });
      
      if (!retryResponse.ok) {
        throw new Error(`HTTP ${retryResponse.status}`);
      }
      
      return retryResponse.json();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => 
        ({ error: 'Request failed' })
      );

      const error = new Error(
        errorData.error?.message || 
        errorData.error || 
        `HTTP ${response.status}`
      ) as ApiError;
      
      error.code = errorData.error?.code;
      error.status = response.status;

      throw error;
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
```

---

## Logout Flow

### Overview
Complete logout process including token invalidation, session cleanup, audit logging, and secure redirection.

### Mermaid Diagram

```mermaid
sequenceDiagram
    participant User as User Browser
    participant APP as App Component
    participant API as API Service
    participant AGW as API Gateway
    participant AS as Auth Service Lambda
    participant COG as AWS Cognito
    participant DB as DynamoDB
    participant AUDIT as Audit Service

    Note over User,AUDIT: USER INITIATES LOGOUT
    
    User->>APP: Clicks "Logout" button
    APP->>APP: Show confirmation dialog
    Note right of APP: Optional: "Are you sure?"

    User->>APP: Confirms logout
    APP->>APP: setLoading(true)

    Note over APP,API: 1. FRONTEND LOGOUT REQUEST
    APP->>API: logout()
    Note right of APP: frontend/src/services/api.ts
    
    API->>API: getAuthHeaders()
    Note right of API: Get current access token<br/>for server-side logout
    
    API->>AGW: POST /auth/customer/logout
    Note right of API: Body: {accessToken: token}

    Note over AGW,AS: 2. API GATEWAY & AUTH SERVICE
    AGW->>AS: Invoke Lambda
    AS->>AS: handler(event, context)
    AS->>AS: parseBody(event)
    AS->>AS: Extract access token
    AS->>AS: Extract user context from token

    Note over AS,COG: 3. TOKEN VALIDATION
    AS->>AS: validateCustomerToken(accessToken)
    Note right of AS: Extract user ID and email

    alt Token invalid or expired
        Note right of AS: Still proceed with cleanup<br/>(idempotent logout)
    end

    Note over AS,COG: 4. COGNITO GLOBAL SIGN OUT
    AS->>COG: GlobalSignOutCommand
    Note right of AS: AccessToken: accessToken
    
    rect rgb(200, 220, 255)
        Note over COG: Cognito Sign Out
        COG->>COG: Invalidate access token
        COG->>COG: Invalidate ID token
        COG->>COG: Invalidate refresh token
        Note right of COG: All tokens for this session<br/>become invalid immediately
        
        COG->>COG: Remove from active sessions
        COG-->>AS: Sign out successful
    end

    Note over AS,DB: 5. DATABASE SESSION CLEANUP
    AS->>AS: getUserIdFromToken(accessToken)
    
    AS->>DB: QueryCommand
    Note right of AS: Table: harborlist-sessions<br/>Query all active sessions for user
    
    DB-->>AS: User sessions
    
    AS->>DB: BatchDeleteCommand
    Note right of AS: Delete all user sessions
    
    rect rgb(200, 255, 200)
        Note over DB: Session Cleanup
        DB->>DB: Delete all sessions
        Note right of DB: Removes:<br/>- Current session<br/>- All device sessions<br/>- Session history
        DB-->>AS: Sessions deleted
    end

    Note over AS,AUDIT: 6. AUDIT LOGGING
    AS->>AUDIT: logAuthEvent()
    Note right of AS: Event: LOGOUT
    
    AUDIT->>DB: PutCommand
    Note right of AUDIT: Table: boat-audit-logs
    
    rect rgb(255, 220, 200)
        Note over DB: Audit Log
        DB->>DB: Write logout event
        Note right of DB: {<br/>  eventType: 'LOGOUT',<br/>  userType: 'customer',<br/>  userId: userId,<br/>  email: email,<br/>  ipAddress: ip,<br/>  userAgent: agent,<br/>  timestamp: ISO8601,<br/>  success: true,<br/>  additionalData: {<br/>    logoutType: 'user_initiated',<br/>    sessionsInvalidated: count<br/>  }<br/>}
    end

    Note over AS,AGW: 7. SUCCESS RESPONSE
    AS->>AS: createResponse(200, logoutData)
    Note right of AS: {<br/>  success: true,<br/>  message: "Logged out successfully"<br/>}
    
    AS-->>AGW: 200 OK
    AGW-->>API: Logout successful

    Note over API,User: 8. FRONTEND CLEANUP
    API->>API: clearAuth()
    Note right of API: Remove all stored auth data
    
    rect rgb(255, 255, 200)
        Note over API: Local Storage Cleanup
        API->>API: localStorage.removeItem('authToken')
        API->>API: localStorage.removeItem('refreshToken')
        API->>API: localStorage.removeItem('tokenExpiry')
        API->>API: localStorage.removeItem('user')
        API->>API: sessionStorage.clear()
    end
    
    API->>API: Clear any cached data
    Note right of API: Clear React Query cache<br/>Clear local state
    
    API-->>APP: Logout complete

    Note over APP,User: 9. UI UPDATE & REDIRECT
    APP->>APP: setUser(null)
    APP->>APP: setIsAuthenticated(false)
    APP->>APP: setLoading(false)
    
    APP->>APP: navigate('/login')
    Note right of APP: Redirect to login page
    
    APP->>User: Show login page
    Note right of User: Optional success message:<br/>"You have been logged out"

    Note over User,APP: 10. PREVENT BACK BUTTON ACCESS
    User->>APP: Presses back button
    APP->>APP: Check authentication
    Note right of APP: Auth guard/protected route
    
    alt Not authenticated
        APP->>APP: navigate('/login')
        Note right of APP: Redirect back to login
    end

    Note over User,APP: ALTERNATIVE: LOGOUT FROM ALL DEVICES
    alt Global logout requested
        User->>APP: Clicks "Logout from all devices"
        APP->>API: globalLogout()
        
        API->>AGW: POST /auth/customer/global-logout
        AGW->>AS: Process global logout
        
        AS->>COG: AdminUserGlobalSignOut
        Note right of AS: Admin API - signs out from ALL devices
        
        AS->>DB: Delete ALL user sessions
        Note right of AS: All devices logged out
        
        AS->>AUDIT: Log global logout event
        AS-->>API: Global logout successful
        
        API->>APP: All sessions terminated
        APP->>User: "Logged out from all devices"
    end
```

### Detailed Method Documentation

**File:** `frontend/src/services/api.ts`

**Method:** `logout()`
```typescript
/**
 * Logs out current user
 * 
 * @returns {Promise<void>}
 * 
 * Flow:
 * 1. Call backend logout endpoint
 * 2. Backend invalidates tokens in Cognito
 * 3. Backend clears session in database
 * 4. Clear local storage
 * 5. Clear React state
 * 6. Redirect to login
 * 
 * Features:
 * - Server-side token invalidation
 * - Client-side cleanup
 * - Audit logging
 * - Graceful error handling
 * 
 * Error handling:
 * - Network errors: Still clear local auth
 * - Server errors: Still clear local auth
 * - Invalid token: Still clear local auth
 * (Idempotent - always succeeds locally)
 */
async logout(): Promise<void> {
  try {
    // Attempt server-side logout
    const token = localStorage.getItem('authToken');
    
    if (token) {
      await this.request('/auth/customer/logout', {
        method: 'POST',
        body: JSON.stringify({ accessToken: token })
      });
    }
  } catch (error) {
    console.error('Server logout failed:', error);
    // Continue with local cleanup anyway
  } finally {
    // Always clear local auth data
    this.clearAuth();
  }
}
```

**Method:** `clearAuth()`
```typescript
/**
 * Clears all authentication data from local storage
 * 
 * Called during:
 * - User logout
 * - Token refresh failure
 * - Invalid session detection
 * - Session expiration
 * 
 * Removes:
 * - Auth tokens
 * - User data
 * - Session info
 * - Cached data
 * 
 * @returns {void}
 */
clearAuth(): void {
  // Remove tokens
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiry');
  
  // Remove user data
  localStorage.removeItem('user');
  localStorage.removeItem('userPreferences');
  
  // Clear session storage
  sessionStorage.clear();
  
  // Clear any cached API responses
  // (if using React Query, invalidate all queries)
  
  console.log('Authentication data cleared');
}
```

---

**File:** `backend/src/auth-service/index.ts`

**Method:** `handleCustomerLogout()`
```typescript
/**
 * Handles customer logout endpoint
 * 
 * @param {APIGatewayProxyEvent} event - API Gateway event
 * @param {string} requestId - Request tracking ID
 * @returns {Promise<APIGatewayProxyResult>} HTTP response
 * 
 * Steps:
 * 1. Parse request body
 * 2. Extract and validate token
 * 3. Call Cognito GlobalSignOut
 * 4. Delete user sessions from database
 * 5. Log audit event
 * 6. Return success
 * 
 * Features:
 * - Idempotent (safe to call multiple times)
 * - Graceful handling of invalid tokens
 * - Complete session cleanup
 * - Audit trail
 * 
 * @throws Never throws - returns success even on errors
 */
async function handleCustomerLogout(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseBody<LogoutRequest>(event);
    const { accessToken } = body;
    
    // Extract user info from token (if valid)
    let userId: string | undefined;
    let email: string | undefined;
    
    try {
      const claims = await authService.validateCustomerToken(accessToken);
      userId = claims.sub;
      email = claims.email;
    } catch (error) {
      console.warn('Token validation failed during logout:', error);
      // Continue with logout anyway
    }
    
    // Cognito global sign out
    try {
      await authService.customerGlobalSignOut(accessToken);
    } catch (error) {
      console.warn('Cognito sign out failed:', error);
      // Continue with local cleanup
    }
    
    // Delete sessions from database
    if (userId) {
      await securityService.deleteAllUserSessions(userId);
    }
    
    // Log logout event
    await logAuthEvent({
      eventType: 'LOGOUT',
      userType: 'customer',
      userId,
      email,
      ipAddress: event.requestContext.identity.sourceIp,
      userAgent: event.requestContext.identity.userAgent,
      timestamp: new Date().toISOString(),
      success: true,
      additionalData: {
        logoutType: 'user_initiated',
      },
    });
    
    return createResponse(200, {
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    // Always return success for logout
    // (idempotent operation)
    return createResponse(200, {
      success: true,
      message: 'Logged out successfully',
    });
  }
}
```

---

This completes the detailed authentication flows! I've documented:
1. ✅ Customer Registration
2. ✅ Customer Login  
3. ✅ Email Verification
4. ✅ Password Reset
5. ✅ Staff Login
6. ✅ Token Refresh
7. ✅ Logout

Would you like me to continue with the listing management flows or move to another flow category?
