export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://local-api.harborlist.com:3001/api',
  environment: import.meta.env.VITE_ENVIRONMENT || 'local',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isLocal: import.meta.env.VITE_ENVIRONMENT === 'local',
  
  // AWS Cognito configuration for Staff User Pool
  awsRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  cognitoStaffPoolId: import.meta.env.VITE_COGNITO_STAFF_POOL_ID || 'us-east-1_STAFF_POOL',
  cognitoStaffClientId: import.meta.env.VITE_COGNITO_STAFF_CLIENT_ID || 'staff-client-id',
  cognitoCustomerPoolId: import.meta.env.VITE_COGNITO_CUSTOMER_POOL_ID || 'us-east-1_CUSTOMER_POOL',
  cognitoCustomerClientId: import.meta.env.VITE_COGNITO_CUSTOMER_CLIENT_ID || 'customer-client-id',
} as const;

export const endpoints = {
  listings: `${config.apiUrl}/listings`,
  search: `${config.apiUrl}/search`,
  media: `${config.apiUrl}/media`,
  email: `${config.apiUrl}/email`,
  auth: {
    login: `${config.apiUrl}/auth/customer/login`,
    register: `${config.apiUrl}/auth/customer/register`,
    verifyEmail: `${config.apiUrl}/auth/customer/confirm-signup`,
    resendVerification: `${config.apiUrl}/auth/customer/resend-confirmation`,
  },
  admin: {
    base: `${config.apiUrl}/admin`,
    users: `${config.apiUrl}/admin/users`,
    listings: `${config.apiUrl}/admin/listings`,
    analytics: `${config.apiUrl}/admin/analytics`,
    settings: `${config.apiUrl}/admin/settings`,
  }
} as const;
