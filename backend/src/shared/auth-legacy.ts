import * as jwt from 'jsonwebtoken';
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as crypto from 'crypto';
// Note: speakeasy would need to be installed: npm install speakeasy @types/speakeasy
// For now, we'll create a mock implementation
import { User, UserRole, UserStatus, AdminPermission, AuthSession, AuditLog } from '../types/common';

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  name: string;
  role: UserRole;
  permissions?: AdminPermission[];
  sessionId: string;
  deviceId: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginResult {
  success: boolean;
  tokens?: AuthTokens;
  user?: Partial<User>;
  requiresMFA?: boolean;
  mfaToken?: string;
  error?: string;
}

// Security Configuration
export const AUTH_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  ACCESS_TOKEN_EXPIRY: '15m', // Short-lived access tokens
  REFRESH_TOKEN_EXPIRY: '7d',
  MFA_TOKEN_EXPIRY: '5m',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes in milliseconds
  PASSWORD_MIN_LENGTH: 8,
  ADMIN_SESSION_TIMEOUT: 60, // minutes
  USER_SESSION_TIMEOUT: 24 * 60, // minutes
  // Configurable token expiry - default to 24 hours in development, 15 minutes in production
  ACCESS_TOKEN_EXPIRY_SECONDS: process.env.ACCESS_TOKEN_EXPIRY_SECONDS ? 
    parseInt(process.env.ACCESS_TOKEN_EXPIRY_SECONDS) : 
    (process.env.NODE_ENV === 'development' ? 24 * 60 * 60 : 15 * 60),
};

/**
 * Deployment context information for environment-aware behavior
 */
export interface DeploymentContext {
  isDocker: boolean;
  isAWS: boolean;
  environment: string;
  deploymentTarget: 'docker' | 'aws';
}

/**
 * Enhanced environment detection for deployment-target-aware behavior
 * 
 * Determines whether running in Docker container vs AWS Lambda
 * and provides appropriate configuration for each context
 * 
 * @returns DeploymentContext Information about current deployment context
 */
export function getDeploymentContext(): DeploymentContext {
  // AWS Lambda has this environment variable
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  // Docker containers can set this explicitly, or we infer from Lambda detection
  const deploymentTarget = process.env.DEPLOYMENT_TARGET || (isLambda ? 'aws' : 'docker');
  
  const environment = process.env.ENVIRONMENT || 'local';
  
  return {
    isDocker: deploymentTarget === 'docker',
    isAWS: deploymentTarget === 'aws',
    environment,
    deploymentTarget: deploymentTarget as 'docker' | 'aws'
  };
}

/**
 * Configuration service with deployment-target-aware behavior
 * 
 * Provides unified interface for configuration across Docker and AWS environments
 * while using the appropriate backend for each deployment target
 */
export class ConfigService {
  private static jwtSecretCache: string | null = null;

  /**
   * Retrieve JWT secret based on deployment context
   * 
   * Docker: Uses environment variables (fast, no network calls)
   * AWS: Uses AWS Secrets Manager (secure, centrally managed)
   * 
   * @returns Promise<string> The JWT secret
   */
  static async getJwtSecret(): Promise<string> {
    if (this.jwtSecretCache) {
      return this.jwtSecretCache;
    }

    const context = getDeploymentContext();
    
    // Docker environment - use environment variables
    if (context.isDocker) {
      this.jwtSecretCache = process.env.JWT_SECRET || 'local-dev-secret-harborlist-2025';
      return this.jwtSecretCache;
    }
    
    // AWS environment - use Secrets Manager
    if (context.isAWS) {
      return await this.getSecretFromAWS();
    }
    
    throw new Error(`Unknown deployment target: ${context.deploymentTarget}`);
  }

  /**
   * Retrieve JWT secret from AWS Secrets Manager
   * Private method for AWS-specific secret retrieval
   */
  private static async getSecretFromAWS(): Promise<string> {
    const secretArn = process.env.JWT_SECRET_ARN;
    if (!secretArn) {
      console.warn('JWT_SECRET_ARN not configured for non-local environment, falling back to environment variable');
      this.jwtSecretCache = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      return this.jwtSecretCache;
    }
    
    try {
      // Import AWS SDK dynamically to avoid issues in local development
      const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
      
      const secretsClient = new SecretsManagerClient({ 
        region: process.env.AWS_REGION || 'us-east-1' 
      });
      
      const command = new GetSecretValueCommand({ SecretId: secretArn });
      const response = await secretsClient.send(command);
      
      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }
      
      const secret = JSON.parse(response.SecretString);
      this.jwtSecretCache = secret.password; // The generated password from Secrets Manager
      return this.jwtSecretCache || 'fallback-secret';
    } catch (error) {
      console.error('Failed to retrieve JWT secret from Secrets Manager:', error);
      // Fallback to environment variable
      this.jwtSecretCache = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      return this.jwtSecretCache;
    }
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use ConfigService.getJwtSecret() instead
 */
export async function getJwtSecret(): Promise<string> {
  return ConfigService.getJwtSecret();
}

/**
 * Get authentication configuration with dynamically retrieved JWT secret
 * 
 * @returns Promise<typeof AUTH_CONFIG & { JWT_SECRET: string }>
 */
export async function getAuthConfig() {
  const jwtSecret = await ConfigService.getJwtSecret();
  return {
    ...AUTH_CONFIG,
    JWT_SECRET: jwtSecret,
  };
}

export function extractTokenFromEvent(event: APIGatewayProxyEvent): string | null {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateDeviceId(): string {
  return crypto.randomUUID();
}

export function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(password, 12); // Higher cost factor for better security
}

export function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, hashedPassword);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters long`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export async function verifyToken(token: string, secret: string = AUTH_CONFIG.JWT_SECRET): Promise<JWTPayload> {
  const jwksClient = require('jwks-rsa');
  const jwtLib = require('jsonwebtoken');
  const jwksUri = process.env.COGNITO_JWKS_URI || 'http://localhost:4566/_aws/cognito-idp/jwks/us-east-1_fda2cf0e211442aaba3f84ecb123172b';
  const client = jwksClient({ jwksUri });

  function getKey(header: { kid: string }, callback: (err: Error | null, key?: string) => void): void {
    client.getSigningKey(header.kid, function(err: Error | null, key: any) {
      if (err) {
        callback(err);
      } else {
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
      }
    });
  }

  return new Promise<JWTPayload>((resolve, reject) => {
    jwtLib.verify(token, getKey, {
      algorithms: ['RS256'],
      issuer: process.env.COGNITO_ISSUER || 'http://localhost:4566/us-east-1_fda2cf0e211442aaba3f84ecb123172b',
      audience: process.env.COGNITO_CLIENT_ID || 'ychk9h9c86u206sbqxd24uoo3z',
    }, (err: any, decoded: any) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          reject(new Error('Token expired'));
        } else {
          reject(new Error('Invalid token'));
        }
      } else {
        if (!decoded || !decoded.sub) {
          reject(new Error('Invalid token payload'));
        } else {
          resolve(decoded as JWTPayload);
        }
      }
    });
  });
}

export function createAccessToken(user: User, sessionId: string, deviceId: string): string {
  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    sessionId,
    deviceId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + AUTH_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS,
  };

  return jwt.sign(payload, AUTH_CONFIG.JWT_SECRET);
}

export function createRefreshToken(userId: string, sessionId: string): string {
  const payload = {
    sub: userId,
    sessionId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  };

  return jwt.sign(payload, AUTH_CONFIG.JWT_REFRESH_SECRET);
}

export function createMFAToken(userId: string): string {
  const payload = {
    sub: userId,
    type: 'mfa',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (5 * 60), // 5 minutes
  };

  return jwt.sign(payload, AUTH_CONFIG.JWT_SECRET);
}

export function generateMFASecret(): { secret: string; qrCode: string } {
  // Generate a random base32 secret
  const secret = crypto.randomBytes(20).toString('hex');
  const qrCode = `otpauth://totp/HarborList:admin?secret=${secret}&issuer=HarborList`;

  return {
    secret,
    qrCode,
  };
}

export function verifyMFAToken(token: string, secret: string): boolean {
  // Mock implementation - in production, use speakeasy or similar TOTP library
  // This is a simplified version for demonstration
  const timeStep = Math.floor(Date.now() / 30000); // 30-second time steps
  
  // Check current time step and adjacent ones (for clock drift)
  for (let i = -2; i <= 2; i++) {
    const testTimeStep = timeStep + i;
    const expectedToken = generateTOTP(secret, testTimeStep);
    if (expectedToken === token) {
      return true;
    }
  }
  
  return false;
}

function generateTOTP(secret: string, timeStep: number): string {
  // Simplified TOTP generation - in production, use proper TOTP implementation
  const hash = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
  hash.update(Buffer.from(timeStep.toString()));
  const hmac = hash.digest();
  
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

export async function getUserFromEvent(event: APIGatewayProxyEvent): Promise<JWTPayload> {
  // First try to get from Cognito authorizer context
  if (event.requestContext.authorizer?.claims) {
    return {
      sub: event.requestContext.authorizer.claims.sub,
      email: event.requestContext.authorizer.claims.email,
      name: event.requestContext.authorizer.claims.name || event.requestContext.authorizer.claims.email,
      role: event.requestContext.authorizer.claims.role || UserRole.USER,
      permissions: event.requestContext.authorizer.claims.permissions ? 
        JSON.parse(event.requestContext.authorizer.claims.permissions) : [],
      sessionId: event.requestContext.authorizer.claims.sessionId || '',
      deviceId: event.requestContext.authorizer.claims.deviceId || '',
      iat: 0,
      exp: 0,
    };
  }

  // Fallback to manual token verification
  const token = extractTokenFromEvent(event);
  if (!token) {
    throw new Error('No authentication token provided');
  }

  return await verifyToken(token);
}

export function requireAdminRole(payload: JWTPayload, requiredPermissions?: AdminPermission[]): void {
  if (payload.role === UserRole.USER) {
    throw new Error('Admin access required');
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const userPermissions = payload.permissions || [];
    const hasRequiredPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      throw new Error('Insufficient permissions');
    }
  }
}

export function getClientInfo(event: APIGatewayProxyEvent): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: event.requestContext.identity.sourceIp || 'unknown',
    userAgent: event.headers['User-Agent'] || event.headers['user-agent'] || 'unknown',
  };
}

export function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) return false;
  return new Date(user.lockedUntil) > new Date();
}

export function shouldLockAccount(loginAttempts: number): boolean {
  return loginAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS;
}

export function calculateLockoutExpiry(): string {
  return new Date(Date.now() + AUTH_CONFIG.LOCKOUT_DURATION).toISOString();
}

// Session Management
export function createAuthSession(
  userId: string, 
  deviceId: string, 
  clientInfo: { ipAddress: string; userAgent: string }
): AuthSession {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(); // 7 days

  return {
    sessionId,
    userId,
    deviceId,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    issuedAt: now,
    expiresAt,
    lastActivity: now,
    isActive: true,
  };
}

export function createAuditLog(
  user: JWTPayload,
  action: string,
  resource: string,
  details: Record<string, any>,
  clientInfo: { ipAddress: string; userAgent: string },
  resourceId?: string
): AuditLog {
  return {
    id: crypto.randomUUID(),
    userId: user.sub,
    userEmail: user.email,
    action,
    resource,
    resourceId,
    details,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    timestamp: new Date().toISOString(),
    sessionId: user.sessionId,
  };
}

// Rate limiting helpers
export function createRateLimitKey(identifier: string, action: string): string {
  return `rate_limit:${action}:${identifier}`;
}

export function isRateLimited(attempts: number, windowStart: number, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - windowStart > windowMs) {
    return false; // Window has expired
  }
  return attempts >= maxAttempts;
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Admin user creation helper
export function createAdminUser(userData: {
  email: string;
  name: string;
  role: UserRole;
  permissions: AdminPermission[];
}): Partial<User> {
  const now = new Date().toISOString();
  
  return {
    id: crypto.randomUUID(),
    email: userData.email,
    name: userData.name,
    role: userData.role,
    status: UserStatus.ACTIVE,
    permissions: userData.permissions,
    emailVerified: true, // Admin accounts are pre-verified
    phoneVerified: false,
    mfaEnabled: false,
    loginAttempts: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// Async JWT functions using dynamic secret retrieval

/**
 * Async version of verifyToken that uses dynamic JWT secret retrieval
 * 
 * @param token JWT token to verify
 * @returns Promise<JWTPayload> Verified token payload
 */
export async function verifyTokenAsync(token: string): Promise<JWTPayload> {
  const authConfig = await getAuthConfig();
  return await verifyToken(token, authConfig.JWT_SECRET);
}

/**
 * Async version of createAccessToken that uses dynamic JWT secret retrieval
 * 
 * @param user User object
 * @param sessionId Session identifier
 * @param deviceId Device identifier
 * @returns Promise<string> Signed JWT token
 */
export async function createAccessTokenAsync(user: User, sessionId: string, deviceId: string): Promise<string> {
  const authConfig = await getAuthConfig();
  
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    sessionId,
    deviceId,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
  };

  return jwt.sign(payload, authConfig.JWT_SECRET);
}

/**
 * Async version of createRefreshToken that uses dynamic JWT secret retrieval
 * 
 * @param userId User identifier
 * @param sessionId Session identifier
 * @returns Promise<string> Signed JWT refresh token
 */
export async function createRefreshTokenAsync(userId: string, sessionId: string): Promise<string> {
  const authConfig = await getAuthConfig();
  
  const payload = {
    sub: userId,
    sessionId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  };

  return jwt.sign(payload, authConfig.JWT_SECRET);
}
