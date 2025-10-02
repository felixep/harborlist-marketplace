export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

export const endpoints = {
  listings: `${config.apiUrl}/listings`,
  search: `${config.apiUrl}/search`,
  media: `${config.apiUrl}/media`,
  email: `${config.apiUrl}/email`,
  auth: {
    login: `${config.apiUrl}/auth/login`,
    register: `${config.apiUrl}/auth/register`,
  },
  admin: {
    base: `${config.apiUrl}/admin`,
    users: `${config.apiUrl}/admin/users`,
    listings: `${config.apiUrl}/admin/listings`,
    analytics: `${config.apiUrl}/admin/analytics`,
    settings: `${config.apiUrl}/admin/settings`,
  }
} as const;
