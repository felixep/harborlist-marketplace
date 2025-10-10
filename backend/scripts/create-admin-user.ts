#!/usr/bin/env ts-node

/**
 * Admin User Creation Script
 * 
 * This script creates an admin user in the HarborList system.
 * It can be run locally or in production to set up the initial admin account.
 * 
 * Usage:
 *   npm run create-admin -- --email admin@example.com --name "Admin User" --role super_admin
 *   
 * Environment Variables Required:
 *   - USERS_TABLE: DynamoDB users table name
 *   - AWS_REGION: AWS region (default: us-east-1)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { hashPassword, createAdminUser } from '../src/shared/auth';
import { User, UserRole, AdminPermission } from '../src/types/common';
import crypto from 'crypto';

// Configuration
const USERS_TABLE = process.env.USERS_TABLE || 'harborlist-users';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize DynamoDB client with local endpoint support
const client = new DynamoDBClient({ 
  region: AWS_REGION,
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
});
const docClient = DynamoDBDocumentClient.from(client);

interface CreateAdminOptions {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  permissions?: AdminPermission[];
  resetPassword?: boolean;
}

async function checkUserExists(email: string): Promise<boolean> {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    }));

    return !!(result.Items && result.Items.length > 0);
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
}

async function createAdminUserInDB(options: CreateAdminOptions): Promise<User> {
  const { email, name, role, password, permissions, resetPassword } = options;

  // Check if user already exists
  const userExists = await checkUserExists(email);
  if (userExists) {
    if (!resetPassword) {
      console.log(`✅ User with email ${email} already exists. Use --reset-password to reset their password.`);
      return null as any; // Exit gracefully without error
    }
    console.log(`🔄 User exists. Resetting password for ${email}...`);
  }

  // Generate a secure password if not provided
  const userPassword = password || generateSecurePassword();
  const hashedPassword = await hashPassword(userPassword);

  // Determine permissions based on role
  let userPermissions: AdminPermission[];
  if (permissions) {
    userPermissions = permissions;
  } else {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        userPermissions = Object.values(AdminPermission);
        break;
      case UserRole.ADMIN:
        userPermissions = [
          AdminPermission.USER_MANAGEMENT,
          AdminPermission.CONTENT_MODERATION,
          AdminPermission.ANALYTICS_VIEW,
          AdminPermission.AUDIT_LOG_VIEW
        ];
        break;
      case UserRole.MODERATOR:
        userPermissions = [
          AdminPermission.CONTENT_MODERATION,
          AdminPermission.AUDIT_LOG_VIEW
        ];
        break;
      case UserRole.SUPPORT:
        userPermissions = [
          AdminPermission.AUDIT_LOG_VIEW
        ];
        break;
      default:
        throw new Error(`Invalid admin role: ${role}`);
    }
  }

  let user: User;

  if (userExists && resetPassword) {
    // Update existing user's password
    const result = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    }));

    const existingUser = result.Items![0] as User;
    
    // Update the user with new password
    user = {
      ...existingUser,
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
      loginAttempts: 0, // Reset login attempts
      lockedUntil: undefined,
      passwordResetToken: undefined,
      passwordResetExpires: undefined
    };

    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: user
    }));

  } else {
    // Create admin user object
    const adminUserData = createAdminUser({
      email,
      name,
      role,
      permissions: userPermissions
    });

    // Add password and other required fields
    user = {
      ...adminUserData,
      password: hashedPassword,
      // MFA is optional for admin accounts
      mfaEnabled: false,
      sessionTimeout: role === UserRole.SUPER_ADMIN ? 30 : 60 // minutes
    } as User;

    // Save to database
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: user,
      ConditionExpression: 'attribute_not_exists(id)' // Prevent overwriting
    }));
  }

  if (userExists && resetPassword) {
    console.log(`✅ Password reset successfully for existing user!`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${user.name}`);
    console.log(`🔐 New Password: ${userPassword}`);
    console.log(`⚠️  IMPORTANT: Save this new password securely!`);
  } else {
    console.log(`✅ Admin user created successfully!`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🔑 Role: ${role}`);
    console.log(`🛡️  Permissions: ${userPermissions.join(', ')}`);
    
    if (!password) {
      console.log(`🔐 Generated Password: ${userPassword}`);
      console.log(`⚠️  IMPORTANT: Save this password securely! It won't be shown again.`);
    }
  }
  
  console.log(`\n📋 Next Steps:`);
  console.log(`1. Log in to the admin panel at: /admin/login`);
  console.log(`2. Optionally set up MFA for enhanced security`);
  console.log(`3. Change the password after first login`);

  return user;
}

function generateSecurePassword(): string {
  // Generate a secure 16-character password with mixed case, numbers, and symbols
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < 16; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function parseArguments(): CreateAdminOptions {
  const args = process.argv.slice(2);
  const options: Partial<CreateAdminOptions> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--email':
        options.email = value;
        break;
      case '--name':
        options.name = value;
        break;
      case '--role':
        if (!Object.values(UserRole).includes(value as UserRole)) {
          throw new Error(`Invalid role: ${value}. Valid roles: ${Object.values(UserRole).join(', ')}`);
        }
        options.role = value as UserRole;
        break;
      case '--password':
        options.password = value;
        break;
      case '--permissions':
        const perms = value.split(',').map(p => p.trim());
        const validPerms = perms.filter(p => Object.values(AdminPermission).includes(p as AdminPermission));
        if (validPerms.length !== perms.length) {
          throw new Error(`Invalid permissions. Valid permissions: ${Object.values(AdminPermission).join(', ')}`);
        }
        options.permissions = validPerms as AdminPermission[];
        break;
      case '--reset-password':
        options.resetPassword = true;
        i--; // No value needed for this flag
        break;
      default:
        if (key.startsWith('--')) {
          throw new Error(`Unknown option: ${key}`);
        }
    }
  }

  // Set default email if not provided
  if (!options.email) {
    options.email = 'admin@harborlist.com';
    console.log('📧 Using default email: admin@harborlist.com');
  }
  if (!options.name) {
    options.name = 'HarborList Admin';
    console.log('👤 Using default name: HarborList Admin');
  }
  if (!options.role) {
    options.role = UserRole.SUPER_ADMIN;
    console.log('🔑 Using default role: super_admin');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(options.email)) {
    throw new Error('Invalid email format.');
  }

  return options as CreateAdminOptions;
}

function printUsage() {
  console.log(`
🚀 HarborList Admin User Creation Script

Usage:
  npm run create-admin [options]

Optional Arguments:
  --email <email>     Admin user email address (default: admin@harborlist.com)
  --name <name>       Admin user full name (default: HarborList Admin)
  --role <role>       Admin role (default: super_admin)
  --password <pass>   Custom password (if not provided, one will be generated)
  --reset-password    Reset password if user already exists
  --permissions <p>   Comma-separated list of permissions (overrides role defaults)

Examples:
  # Create default admin (admin@harborlist.com, super_admin role)
  npm run create-admin

  # Create admin with custom email
  npm run create-admin -- --email admin@company.com

  # Reset password for existing admin
  npm run create-admin -- --reset-password

  # Create a moderator with custom password  
  npm run create-admin -- --email mod@harborlist.com --name "Content Moderator" --role moderator --password MySecurePass123!

  # Create admin with specific permissions
  npm run create-admin -- --email support@harborlist.com --name "Support User" --role support --permissions user_management,audit_log_viewAvailable Roles:
  - super_admin: Full system access
  - admin: User management, content moderation, analytics
  - moderator: Content moderation only
  - support: Limited support access

Available Permissions:
  ${Object.values(AdminPermission).map(p => `- ${p}`).join('\n  ')}

Environment Variables:
  USERS_TABLE: DynamoDB users table name (default: boat-users)
  AWS_REGION: AWS region (default: us-east-1)
`);
}

async function main() {
  try {
    // Check for help flag
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      printUsage();
      process.exit(0);
    }

    console.log('🚀 HarborList Admin User Creation Script\n');

    // Parse command line arguments
    const options = parseArguments();

    // Confirm creation
    console.log('📋 Creating admin user with the following details:');
    console.log(`   Email: ${options.email}`);
    console.log(`   Name: ${options.name}`);
    console.log(`   Role: ${options.role}`);
    console.log(`   Table: ${USERS_TABLE}`);
    console.log(`   Region: ${AWS_REGION}\n`);

    // Create the admin user
    await createAdminUserInDB(options);

  } catch (error) {
    console.error('❌ Error creating admin user:', error instanceof Error ? error.message : error);
    console.log('\nFor usage information, run: npm run create-admin -- --help');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { createAdminUserInDB, generateSecurePassword };