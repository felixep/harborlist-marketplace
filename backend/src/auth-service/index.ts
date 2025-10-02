/**
 * @fileoverview Authentication service Lambda function for HarborList boat marketplace.
 * 
 * Provides comprehensive authentication and authorization services including:
 * - User registration and login with secure password hashing
 * - JWT-based session management with refresh tokens
 * - Multi-factor authentication (MFA) support
 * - Admin authentication with enhanced security requirements
 * - Password reset functionality with secure token generation
 * - Account lockout protection against brute force attacks
 * - Comprehensive audit logging for security events
 * - Session management with device tracking
 * 
 * Security Features:
 * - bcrypt password hashing with salt rounds
 * - JWT tokens with configurable expiration
 * - Rate limiting through account lockout mechanisms
 * - Secure token generation for password resets
 * - IP address and user agent tracking
 * - Comprehensive audit trail for compliance
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';
import { createResponse, createErrorResponse } from '../shared/utils';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  validateEmail,
  createAccessToken,
  createRefreshToken,
  createMFAToken,
  verifyToken,
  verifyMFAToken,
  generateMFASecret,
  generateDeviceId,
  generateSecureToken,
  createAuthSession,
  createAuditLog,
  getClientInfo,
  isAccountLocked,
  shouldLockAccount,
  calculateLockoutExpiry,
  AUTH_CONFIG,
  AuthTokens,
  LoginResult,
} from '../shared/auth';
import { User, UserRole, UserStatus, AdminPermission, AuthSession, LoginAttempt, AuditLog } from '../types/common';

/**
 * DynamoDB client configuration for authentication service
 */
const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Environment-based table name configuration with fallback defaults
 */
const USERS_TABLE = process.env.USERS_TABLE || 'boat-users';
const SESSIONS_TABLE = process.env.SESSIONS_TABLE || 'boat-sessions';
const LOGIN_ATTEMPTS_TABLE = process.env.LOGIN_ATTEMPTS_TABLE || 'boat-login-attempts';
const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || 'boat-audit-logs';

/**
 * Main Lambda handler for authentication service endpoints
 * 
 * Handles all authentication-related operations including user registration,
 * login, logout, MFA setup/verification, and password reset functionality.
 * Supports both regular user and admin authentication flows.
 * 
 * Supported endpoints:
 * - POST /login - User authentication
 * - POST /admin/login - Admin authentication with MFA requirement
 * - POST /register - New user registration
 * - POST /refresh - JWT token refresh
 * - POST /logout - Session termination
 * - POST /mfa/setup - MFA configuration
 * - POST /mfa/verify - MFA code verification
 * - POST /password/reset - Password reset request
 * - POST /password/reset/confirm - Password reset confirmation
 * 
 * @param event - API Gateway proxy event containing request details
 * @returns Promise<APIGatewayProxyResult> - Standardized API response
 * 
 * @throws {Error} When database operations fail or invalid requests are made
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const clientInfo = getClientInfo(event);

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    const path = event.path;
    const method = event.httpMethod;
    const body = JSON.parse(event.body || '{}');

    // Route handling
    if (path.endsWith('/login') && method === 'POST') {
      return await handleLogin(body, requestId, clientInfo);
    } else if (path.endsWith('/admin/login') && method === 'POST') {
      return await handleAdminLogin(body, requestId, clientInfo);
    } else if (path.includes('/auth/admin/login') && method === 'POST') {
      return await handleAdminLogin(body, requestId, clientInfo);
    } else if (path.endsWith('/register') && method === 'POST') {
      return await handleRegister(body, requestId, clientInfo);
    } else if (path.endsWith('/refresh') && method === 'POST') {
      return await handleRefreshToken(body, requestId, clientInfo);
    } else if (path.endsWith('/logout') && method === 'POST') {
      return await handleLogout(event, requestId, clientInfo);
    } else if (path.endsWith('/mfa/setup') && method === 'POST') {
      return await handleMFASetup(event, requestId, clientInfo);
    } else if (path.endsWith('/mfa/verify') && method === 'POST') {
      return await handleMFAVerify(body, requestId, clientInfo);
    } else if (path.endsWith('/password/reset') && method === 'POST') {
      return await handlePasswordResetRequest(body, requestId, clientInfo);
    } else if (path.endsWith('/password/reset/confirm') && method === 'POST') {
      return await handlePasswordResetConfirm(body, requestId, clientInfo);
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Endpoint not found', requestId);
  } catch (error) {
    console.error('Auth error:', error);
    await logAuditEvent('AUTH_ERROR', 'system', { error: error instanceof Error ? error.message : String(error) }, clientInfo, requestId);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', requestId);
  }
};

/**
 * Handles user login authentication with comprehensive security checks
 * 
 * Performs multi-layered authentication including:
 * - Email format validation
 * - Password verification with bcrypt
 * - Account status and lockout checks
 * - MFA requirement detection
 * - Session creation and token generation
 * - Audit logging for security compliance
 * 
 * Security Features:
 * - Account lockout after failed attempts
 * - Login attempt tracking and logging
 * - Device fingerprinting for session management
 * - IP address and user agent tracking
 * 
 * @param body - Login request containing email, password, and optional deviceId
 * @param requestId - Unique request identifier for tracking
 * @param clientInfo - Client metadata (IP address, user agent)
 * @returns Promise<APIGatewayProxyResult> - Authentication result with tokens or MFA requirement
 * 
 * @throws {Error} When database operations fail or authentication errors occur
 */
const handleLogin = async (
  body: { email: string; password: string; deviceId?: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { email, password, deviceId = generateDeviceId() } = body;

  // Log login attempt
  await logLoginAttempt(email, clientInfo, false);

  if (!email || !password) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'Email and password are required', requestId);
  }

  if (!validateEmail(email)) {
    return createErrorResponse(400, 'INVALID_EMAIL', 'Invalid email format', requestId);
  }

  try {
    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return createErrorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password', requestId);
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return createErrorResponse(423, 'ACCOUNT_LOCKED', 'Account is temporarily locked due to too many failed login attempts', requestId);
    }

    // Check if account is active
    if (user.status !== UserStatus.ACTIVE) {
      return createErrorResponse(403, 'ACCOUNT_INACTIVE', 'Account is not active', requestId);
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password || '');
    if (!passwordValid) {
      await handleFailedLogin(user, clientInfo);
      return createErrorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password', requestId);
    }

    // Reset login attempts on successful password verification
    await resetLoginAttempts(user.id);

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      const mfaToken = createMFAToken(user.id);
      return createResponse(200, {
        requiresMFA: true,
        mfaToken,
        message: 'MFA verification required'
      });
    }

    // Create session and tokens
    const loginResult = await createUserSession(user, deviceId, clientInfo);
    
    // Log successful login
    await logLoginAttempt(email, clientInfo, true);
    await logAuditEvent('USER_LOGIN', 'user', { userId: user.id }, clientInfo, requestId, user.id);

    return createResponse(200, loginResult);
  } catch (error) {
    console.error('Login error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Login failed', requestId);
  }
};

const handleRegister = async (
  body: { name: string; email: string; password: string; deviceId?: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { name, email, password, deviceId = generateDeviceId() } = body;

  if (!name || !email || !password) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'Name, email, and password are required', requestId);
  }

  // Validate email format
  if (!validateEmail(email)) {
    return createErrorResponse(400, 'INVALID_EMAIL', 'Invalid email format', requestId);
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return createErrorResponse(400, 'WEAK_PASSWORD', passwordValidation.errors.join(', '), requestId);
  }

  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return createErrorResponse(400, 'USER_EXISTS', 'User with this email already exists', requestId);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Generate email verification token
    const emailVerificationToken = generateSecureToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Create user
    const user: User = {
      id: userId,
      email,
      name,
      password: hashedPassword,
      role: UserRole.USER,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerified: false,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      emailVerificationToken,
      emailVerificationExpires,
      createdAt: now,
      updatedAt: now
    };

    // Save user to database
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: user
    }));

    // Log registration
    await logAuditEvent('USER_REGISTERED', 'user', { userId, email }, clientInfo, requestId, userId);

    // TODO: Send verification email
    // await sendVerificationEmail(email, emailVerificationToken);

    return createResponse(201, {
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: userId,
        name,
        email,
        status: user.status,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Registration failed', requestId);
  }
};
const handleAdminLogin = async (
  body: { email: string; password: string; mfaCode?: string; deviceId?: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { email, password, mfaCode, deviceId = generateDeviceId() } = body;

  // Log admin login attempt
  await logLoginAttempt(email, clientInfo, false, 'admin');

  if (!email || !password) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'Email and password are required', requestId);
  }

  try {
    // Get user by email
    const user = await getUserByEmail(email);
    if (!user || user.role === UserRole.USER) {
      return createErrorResponse(401, 'INVALID_CREDENTIALS', 'Invalid admin credentials', requestId);
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return createErrorResponse(423, 'ACCOUNT_LOCKED', 'Account is temporarily locked', requestId);
    }

    // Check if account is active
    if (user.status !== UserStatus.ACTIVE) {
      return createErrorResponse(403, 'ACCOUNT_INACTIVE', 'Admin account is not active', requestId);
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password || '');
    if (!passwordValid) {
      await handleFailedLogin(user, clientInfo);
      return createErrorResponse(401, 'INVALID_CREDENTIALS', 'Invalid admin credentials', requestId);
    }

    // Admin accounts require MFA
    if (!user.mfaEnabled) {
      return createErrorResponse(403, 'MFA_REQUIRED', 'MFA must be enabled for admin accounts', requestId);
    }

    // Verify MFA code
    if (!mfaCode) {
      const mfaToken = createMFAToken(user.id);
      return createResponse(200, {
        requiresMFA: true,
        mfaToken,
        message: 'MFA verification required'
      });
    }

    const mfaValid = verifyMFAToken(mfaCode, user.mfaSecret || '');
    if (!mfaValid) {
      await handleFailedLogin(user, clientInfo);
      return createErrorResponse(401, 'INVALID_MFA', 'Invalid MFA code', requestId);
    }

    // Reset login attempts on successful authentication
    await resetLoginAttempts(user.id);

    // Create admin session with shorter timeout
    const loginResult = await createUserSession(user, deviceId, clientInfo, true);
    
    // Log successful admin login
    await logLoginAttempt(email, clientInfo, true, 'admin');
    await logAuditEvent('ADMIN_LOGIN', 'admin', { userId: user.id, role: user.role }, clientInfo, requestId, user.id);

    return createResponse(200, loginResult);
  } catch (error) {
    console.error('Admin login error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Admin login failed', requestId);
  }
};

const handleRefreshToken = async (
  body: { refreshToken: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { refreshToken } = body;

  if (!refreshToken) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'Refresh token is required', requestId);
  }

  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken, AUTH_CONFIG.JWT_REFRESH_SECRET);
    
    // Get user and session
    const user = await getUserById(decoded.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      return createErrorResponse(401, 'INVALID_TOKEN', 'Invalid refresh token', requestId);
    }

    const session = await getSession(decoded.sessionId);
    if (!session || !session.isActive) {
      return createErrorResponse(401, 'INVALID_SESSION', 'Session expired or invalid', requestId);
    }

    // Update session activity
    await updateSessionActivity(session.sessionId);

    // Create new access token
    const accessToken = createAccessToken(user, session.sessionId, session.deviceId);

    // Log token refresh
    await logAuditEvent('TOKEN_REFRESH', 'auth', { userId: user.id }, clientInfo, requestId, user.id);

    return createResponse(200, {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60, // 15 minutes
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return createErrorResponse(401, 'INVALID_TOKEN', 'Invalid refresh token', requestId);
  }
};

const handleLogout = async (
  event: APIGatewayProxyEvent,
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  try {
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return createErrorResponse(400, 'MISSING_TOKEN', 'Authorization token required', requestId);
    }

    const decoded = verifyToken(token);
    
    // Invalidate session
    await invalidateSession(decoded.sessionId);

    // Log logout
    await logAuditEvent('USER_LOGOUT', 'auth', { userId: decoded.sub }, clientInfo, requestId, decoded.sub);

    return createResponse(200, { message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Logout failed', requestId);
  }
};

const handleMFASetup = async (
  event: APIGatewayProxyEvent,
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  try {
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authorization required', requestId);
    }

    const decoded = verifyToken(token);
    const user = await getUserById(decoded.sub);
    
    if (!user) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found', requestId);
    }

    // Generate MFA secret
    const { secret, qrCode } = generateMFASecret();

    // Store secret temporarily (user needs to verify before enabling)
    await updateUser(user.id, { mfaSecret: secret });

    // Log MFA setup attempt
    await logAuditEvent('MFA_SETUP_INITIATED', 'security', { userId: user.id }, clientInfo, requestId, user.id);

    return createResponse(200, {
      secret,
      qrCode,
      message: 'Scan QR code with your authenticator app and verify to enable MFA'
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'MFA setup failed', requestId);
  }
};

const handleMFAVerify = async (
  body: { mfaToken?: string; code: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { mfaToken, code } = body;

  if (!code) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'MFA code is required', requestId);
  }

  try {
    let userId: string;

    if (mfaToken) {
      // Verify MFA token for login flow
      const decoded = verifyToken(mfaToken);
      userId = decoded.sub;
    } else {
      return createErrorResponse(400, 'MISSING_TOKEN', 'MFA token is required', requestId);
    }

    const user = await getUserById(userId);
    if (!user || !user.mfaSecret) {
      return createErrorResponse(404, 'USER_NOT_FOUND', 'User not found or MFA not set up', requestId);
    }

    // Verify MFA code
    const isValid = verifyMFAToken(code, user.mfaSecret);
    if (!isValid) {
      return createErrorResponse(401, 'INVALID_MFA', 'Invalid MFA code', requestId);
    }

    // If this is MFA setup verification, enable MFA
    if (!user.mfaEnabled) {
      await updateUser(userId, { mfaEnabled: true });
      await logAuditEvent('MFA_ENABLED', 'security', { userId }, clientInfo, requestId, userId);
      
      return createResponse(200, { message: 'MFA enabled successfully' });
    }

    // For login flow, create session
    const deviceId = generateDeviceId();
    const loginResult = await createUserSession(user, deviceId, clientInfo);

    // Log successful MFA verification
    await logAuditEvent('MFA_VERIFIED', 'security', { userId }, clientInfo, requestId, userId);

    return createResponse(200, loginResult);
  } catch (error) {
    console.error('MFA verification error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'MFA verification failed', requestId);
  }
};

const handlePasswordResetRequest = async (
  body: { email: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { email } = body;

  if (!email || !validateEmail(email)) {
    return createErrorResponse(400, 'INVALID_EMAIL', 'Valid email is required', requestId);
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return createResponse(200, { message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = generateSecureToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store reset token
    await updateUser(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires
    });

    // Log password reset request
    await logAuditEvent('PASSWORD_RESET_REQUESTED', 'security', { userId: user.id }, clientInfo, requestId, user.id);

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(user.email, resetToken);

    return createResponse(200, { message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Password reset request failed', requestId);
  }
};

const handlePasswordResetConfirm = async (
  body: { token: string; newPassword: string },
  requestId: string,
  clientInfo: { ipAddress: string; userAgent: string }
): Promise<APIGatewayProxyResult> => {
  const { token, newPassword } = body;

  if (!token || !newPassword) {
    return createErrorResponse(400, 'MISSING_FIELDS', 'Token and new password are required', requestId);
  }

  // Validate password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return createErrorResponse(400, 'WEAK_PASSWORD', passwordValidation.errors.join(', '), requestId);
  }

  try {
    // Find user by reset token
    const user = await getUserByResetToken(token);
    if (!user || !user.passwordResetExpires) {
      return createErrorResponse(400, 'INVALID_TOKEN', 'Invalid or expired reset token', requestId);
    }

    // Check if token is expired
    if (new Date(user.passwordResetExpires) < new Date()) {
      return createErrorResponse(400, 'EXPIRED_TOKEN', 'Reset token has expired', requestId);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password and clear reset token
    await updateUser(user.id, {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      loginAttempts: 0,
      lockedUntil: undefined
    });

    // Invalidate all existing sessions
    await invalidateAllUserSessions(user.id);

    // Log password reset
    await logAuditEvent('PASSWORD_RESET_COMPLETED', 'security', { userId: user.id }, clientInfo, requestId, user.id);

    return createResponse(200, { message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Password reset failed', requestId);
  }
};

// Utility Functions

async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    }));

    return result.Items && result.Items.length > 0 ? result.Items[0] as User : null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

async function getUserById(userId: string): Promise<User | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: userId }
    }));

    return result.Item as User || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

async function getUserByResetToken(token: string): Promise<User | null> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'password-reset-token-index',
      KeyConditionExpression: 'passwordResetToken = :token',
      ExpressionAttributeValues: {
        ':token': token
      }
    }));

    return result.Items && result.Items.length > 0 ? result.Items[0] as User : null;
  } catch (error) {
    console.error('Error getting user by reset token:', error);
    return null;
  }
}

async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  try {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (value !== undefined) {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpression.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    if (updateExpression.length === 0) return;

    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }));
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function handleFailedLogin(user: User, clientInfo: { ipAddress: string; userAgent: string }): Promise<void> {
  const newAttempts = (user.loginAttempts || 0) + 1;
  const updates: Partial<User> = { loginAttempts: newAttempts };

  if (shouldLockAccount(newAttempts)) {
    updates.lockedUntil = calculateLockoutExpiry();
  }

  await updateUser(user.id, updates);
  await logAuditEvent('FAILED_LOGIN_ATTEMPT', 'security', { 
    userId: user.id, 
    attempts: newAttempts,
    locked: !!updates.lockedUntil 
  }, clientInfo, '', user.id);
}

async function resetLoginAttempts(userId: string): Promise<void> {
  await updateUser(userId, { 
    loginAttempts: 0, 
    lockedUntil: undefined 
  });
}

async function createUserSession(
  user: User, 
  deviceId: string, 
  clientInfo: { ipAddress: string; userAgent: string },
  isAdmin: boolean = false
): Promise<LoginResult> {
  // Create session
  const session = createAuthSession(user.id, deviceId, clientInfo);
  
  // Store session in database
  await docClient.send(new PutCommand({
    TableName: SESSIONS_TABLE,
    Item: session
  }));

  // Create tokens
  const accessToken = createAccessToken(user, session.sessionId, deviceId);
  const refreshToken = createRefreshToken(user.id, session.sessionId);

  // Update last login
  await updateUser(user.id, { lastLogin: new Date().toISOString() });

  return {
    success: true,
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes
      tokenType: 'Bearer'
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      mfaEnabled: user.mfaEnabled
    }
  };
}

async function getSession(sessionId: string): Promise<AuthSession | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId }
    }));

    return result.Item as AuthSession || null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId },
      UpdateExpression: 'SET lastActivity = :lastActivity',
      ExpressionAttributeValues: {
        ':lastActivity': new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
}

async function invalidateSession(sessionId: string): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId },
      UpdateExpression: 'SET isActive = :isActive',
      ExpressionAttributeValues: {
        ':isActive': false
      }
    }));
  } catch (error) {
    console.error('Error invalidating session:', error);
  }
}

async function invalidateAllUserSessions(userId: string): Promise<void> {
  try {
    // Query all active sessions for user
    const result = await docClient.send(new QueryCommand({
      TableName: SESSIONS_TABLE,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':isActive': true
      }
    }));

    // Invalidate each session
    if (result.Items) {
      for (const session of result.Items) {
        await invalidateSession(session.sessionId);
      }
    }
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
  }
}

async function logLoginAttempt(
  email: string, 
  clientInfo: { ipAddress: string; userAgent: string }, 
  success: boolean,
  type: string = 'user'
): Promise<void> {
  try {
    const loginAttempt: LoginAttempt = {
      id: crypto.randomUUID(),
      email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      success,
      timestamp: new Date().toISOString(),
      failureReason: success ? undefined : 'Invalid credentials'
    };

    await docClient.send(new PutCommand({
      TableName: LOGIN_ATTEMPTS_TABLE,
      Item: loginAttempt
    }));
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
}

async function logAuditEvent(
  action: string,
  resource: string,
  details: Record<string, any>,
  clientInfo: { ipAddress: string; userAgent: string },
  requestId: string,
  userId?: string
): Promise<void> {
  try {
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      userId: userId || 'system',
      userEmail: details.email || 'system',
      action,
      resource,
      resourceId: details.resourceId,
      details,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      timestamp: new Date().toISOString(),
      sessionId: details.sessionId || requestId
    };

    await docClient.send(new PutCommand({
      TableName: AUDIT_LOGS_TABLE,
      Item: auditLog
    }));
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}