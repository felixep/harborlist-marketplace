import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as crypto from 'crypto';
import { User, UserRole, AdminPermission } from '../types/common';

export interface JWTPayload {
  sub: string;
  email: string;
  name?: string;
  role?: UserRole;
  userType?: 'buyer' | 'seller';
  permissions?: AdminPermission[];
  sessionId?: string;
  deviceId?: string;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  iat?: number;
  exp?: number;
}

const COGNITO_REGION = process.env.COGNITO_REGION || 'us-east-1';
const BUYER_USER_POOL_ID = process.env.BUYER_USER_POOL_ID || '';
const SELLER_USER_POOL_ID = process.env.SELLER_USER_POOL_ID || '';

const buyerJwksClient = jwksClient({
  jwksUri: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${BUYER_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000,
});

const sellerJwksClient = jwksClient({
  jwksUri: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${SELLER_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000,
});

async function getSigningKey(kid: string, userType: 'buyer' | 'seller'): Promise<string> {
  const client = userType === 'buyer' ? buyerJwksClient : sellerJwksClient;
  
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err: any, key: any) => {
      if (err) {
        reject(err);
        return;
      }
      const signingKey = key?.getPublicKey();
      if (!signingKey) {
        reject(new Error('No signing key found'));
        return;
      }
      resolve(signingKey);
    });
  });
}

async function verifyCognitoToken(token: string, userType: 'buyer' | 'seller'): Promise<JWTPayload> {
  return new Promise((resolve, reject) => {
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || typeof decodedHeader === 'string') {
      reject(new Error('Invalid token format'));
      return;
    }

    const kid = decodedHeader.header.kid;
    if (!kid) {
      reject(new Error('No kid found in token'));
      return;
    }

    getSigningKey(kid, userType)
      .then(signingKey => {
        jwt.verify(token, signingKey, {
          algorithms: ['RS256'],
        }, (err, decoded) => {
          if (err) {
            reject(err);
            return;
          }
          
          const payload = decoded as any;
          
          const transformedPayload: JWTPayload = {
            sub: payload.sub || payload['cognito:username'] || '',
            email: payload.email || '',
            name: payload.name || payload.email,
            role: payload['cognito:groups']?.[0] === 'Admins' ? UserRole.ADMIN : UserRole.USER,
            userType: userType,
            'cognito:username': payload['cognito:username'],
            'cognito:groups': payload['cognito:groups'],
            iat: payload.iat,
            exp: payload.exp,
          };
          
          resolve(transformedPayload);
        });
      })
      .catch(reject);
  });
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const decoded = jwt.decode(token, { complete: true });
  
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }
  
  const payload = decoded.payload as any;
  
  // Check if we're in LocalStack/local environment
  const isLocalStack = !!process.env.COGNITO_ENDPOINT || !!process.env.LOCALSTACK_ENDPOINT;
  
  if (isLocalStack) {
    // For LocalStack, use simpler validation - just verify the token structure
    // The auth-service already validated it during login
    const role = mapCognitoGroupsToRole(payload['cognito:groups']);
    
    const transformedPayload: JWTPayload = {
      sub: payload.sub || payload['cognito:username'] || '',
      email: payload.email || '',
      name: payload.name || payload.email,
      role: role,
      permissions: payload.permissions || [],
      'cognito:username': payload['cognito:username'],
      'cognito:groups': payload['cognito:groups'],
      iat: payload.iat,
      exp: payload.exp,
    };
    
    return transformedPayload;
  }
  
  // AWS Cognito validation (existing logic)
  if (!payload.iss || !payload.iss.includes('cognito-idp')) {
    throw new Error('Invalid token: Not a Cognito token');
  }
  
  const isBuyer = payload.iss.includes(BUYER_USER_POOL_ID);
  const userType = isBuyer ? 'buyer' : 'seller';
  
  return verifyCognitoToken(token, userType);
}

// Helper function to map Cognito groups to UserRole
function mapCognitoGroupsToRole(groups?: string[]): UserRole {
  if (!groups || groups.length === 0) {
    return UserRole.USER;
  }
  
  // Check for admin roles (case-insensitive)
  const groupLower = groups[0].toLowerCase();
  if (groupLower === 'super-admin' || groupLower === 'super_admin') {
    return UserRole.SUPER_ADMIN;
  }
  if (groupLower === 'admin' || groupLower === 'admins') {
    return UserRole.ADMIN;
  }
  if (groupLower === 'moderator' || groupLower === 'moderators') {
    return UserRole.MODERATOR;
  }
  if (groupLower === 'support') {
    return UserRole.SUPPORT;
  }
  
  return UserRole.USER;
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

export async function getUserFromEvent(event: APIGatewayProxyEvent): Promise<JWTPayload> {
  const isLocalStack = !!process.env.COGNITO_ENDPOINT || !!process.env.LOCALSTACK_ENDPOINT;
  
  // In LocalStack/local mode, skip authorizer claims and always verify token directly
  // In AWS mode, use authorizer claims if available for better performance
  if (!isLocalStack && event.requestContext.authorizer?.claims) {
    const claims = event.requestContext.authorizer.claims;
    
    // Map cognito:groups to proper role
    const groups = claims['cognito:groups'] || [];
    const role = mapCognitoGroupsToRole(Array.isArray(groups) ? groups : [groups]);
    
    return {
      sub: claims.sub,
      email: claims.email,
      name: claims.name || claims.email,
      role: role,
      permissions: claims.permissions || [],
      'cognito:username': claims['cognito:username'],
      'cognito:groups': claims['cognito:groups'],
      iat: parseInt(claims.iat || '0'),
      exp: parseInt(claims.exp || '0'),
    };
  }

  const token = extractTokenFromEvent(event);
  if (!token) {
    throw new Error('No authentication token provided');
  }

  return await verifyToken(token);
}

export function requireAdminRole(payload: JWTPayload, requiredPermissions?: AdminPermission[]): void {
  // Check if user has any admin role
  const adminRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR, UserRole.SUPPORT];
  
  if (!payload.role || !adminRoles.includes(payload.role)) {
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

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateDeviceId(): string {
  return crypto.randomUUID();
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hashedPassword);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const PASSWORD_MIN_LENGTH = 8;
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
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

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) return false;
  return new Date(user.lockedUntil) > new Date();
}

// Deployment context for environment-aware behavior
export interface DeploymentContext {
  isDocker: boolean;
  isAWS: boolean;
  environment: string;
  deploymentTarget: 'docker' | 'aws';
}

export function getDeploymentContext(): DeploymentContext {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const deploymentTarget = process.env.DEPLOYMENT_TARGET || (isLambda ? 'aws' : 'docker');
  const environment = process.env.ENVIRONMENT || 'local';
  
  return {
    isDocker: deploymentTarget === 'docker',
    isAWS: deploymentTarget === 'aws',
    environment,
    deploymentTarget: deploymentTarget as 'docker' | 'aws'
  };
}

// Audit logging
export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  sessionId?: string;
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
