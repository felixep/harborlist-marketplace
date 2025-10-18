#!/usr/bin/env ts-node

/**
 * Cognito Admin User Creation Script
 * 
 * This script creates an admin user in the Cognito Staff User Pool for the HarborList system.
 * It works with both LocalStack (local development) and AWS Cognito (production).
 * 
 * Usage:
 *   npm run create-admin -- --email admin@example.com --name "Admin User" --role super_admin
 *   
 * Environment Variables Required:
 *   - STAFF_USER_POOL_ID: Cognito Staff User Pool ID
 *   - AWS_REGION: AWS region (default: us-east-1)
 *   - COGNITO_ENDPOINT: LocalStack endpoint (for local development)
 *   - IS_LOCALSTACK: Set to 'true' for local development
 */

import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  ListUsersCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Configuration from environment
const STAFF_USER_POOL_ID = process.env.STAFF_USER_POOL_ID;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const IS_LOCALSTACK = process.env.IS_LOCALSTACK === 'true';
const COGNITO_ENDPOINT = process.env.COGNITO_ENDPOINT;
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;
const USERS_TABLE = process.env.USERS_TABLE || 'harborlist-users';

// Initialize Cognito client
const cognitoConfig: any = {
  region: AWS_REGION,
};

// Add LocalStack endpoint if running locally
if (IS_LOCALSTACK && COGNITO_ENDPOINT) {
  cognitoConfig.endpoint = COGNITO_ENDPOINT;
  cognitoConfig.credentials = {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  };
}

const cognitoClient = new CognitoIdentityProviderClient(cognitoConfig);

// Initialize DynamoDB client
const dynamoConfig: any = {
  region: AWS_REGION,
};

if (IS_LOCALSTACK && DYNAMODB_ENDPOINT) {
  dynamoConfig.endpoint = DYNAMODB_ENDPOINT;
  dynamoConfig.credentials = {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  };
}

const dynamoClient = new DynamoDBClient(dynamoConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Valid admin roles for Cognito groups
type AdminRole = 'super_admin' | 'admin' | 'manager' | 'team_member';

interface CreateAdminOptions {
  email: string;
  name: string;
  role: AdminRole;
  password?: string;
  resetPassword?: boolean;
  updateRole?: boolean;
}

// Check if user exists in Cognito Staff User Pool
async function checkUserExists(email: string): Promise<boolean> {
  try {
    await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: STAFF_USER_POOL_ID,
      Username: email
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'UserNotFoundException') {
      return false;
    }
    console.error('Error checking if user exists:', error);
    throw error;
  }
}

// Add user to group with retry logic and verification
async function addUserToGroupWithRetry(email: string, groupName: string, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add user to group
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: STAFF_USER_POOL_ID,
        Username: email,
        GroupName: groupName
      }));

      // Verify the user was added by listing their groups
      const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
        UserPoolId: STAFF_USER_POOL_ID,
        Username: email
      }));

      const userGroups = groupsResponse.Groups?.map(g => g.GroupName) || [];
      if (userGroups.includes(groupName)) {
        console.log(`   ✅ User successfully added to group '${groupName}' (verified)`);
        return;
      } else {
        console.log(`   ⚠️  Attempt ${attempt}: User not in group after addition, retrying...`);
        // Wait a bit before retrying (LocalStack timing issue)
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      if (attempt === maxRetries) {
        console.error(`   ❌ Failed to add user to group '${groupName}' after ${maxRetries} attempts:`, error.message);
        throw error;
      }
      console.log(`   ⚠️  Attempt ${attempt} failed, retrying... (${error.message})`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  throw new Error(`Failed to add user to group '${groupName}' after ${maxRetries} attempts`);
}

// Create or update user record in DynamoDB
async function syncUserToDynamoDB(cognitoUserId: string, email: string, name: string, role: AdminRole): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Check if user already exists in DynamoDB
    const existingUser = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: cognitoUserId }
    }));

    if (existingUser.Item) {
      console.log(`   ℹ️  User record already exists in DynamoDB, skipping creation`);
      return;
    }

    // Create new user record for STAFF user
    const userRecord = {
      id: cognitoUserId,
      email: email,
      name: name,
      userType: 'staff', // CRITICAL: Mark as staff user to differentiate from customers
      role: role, // Store the role (super_admin, admin, manager, team_member)
      status: 'active',
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: now,
      updatedAt: now,
      // Admin-specific fields
      permissions: role === 'super_admin' ? ['all'] : [],
      sessionTimeout: 480 // 8 hours in minutes
    };

    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: userRecord
    }));

    console.log(`   ✅ User record synced to DynamoDB (${USERS_TABLE}) with userType='staff'`);
  } catch (error: any) {
    console.error('   ❌ Error syncing user to DynamoDB:', error.message);
    throw error;
  }
}

// Create admin user in Cognito Staff User Pool
async function createAdminUserInCognito(options: CreateAdminOptions): Promise<void> {
  const { email, name, role, password, resetPassword, updateRole } = options;

  if (!STAFF_USER_POOL_ID) {
    throw new Error('STAFF_USER_POOL_ID environment variable is required');
  }

  // Check if user already exists
  const userExists = await checkUserExists(email);
  if (userExists) {
    if (!resetPassword && !updateRole) {
      console.log(`✅ User with email ${email} already exists. Use --reset-password to reset their password or --update-role to update their role.`);
      return;
    }
    if (resetPassword) {
      console.log(`🔄 User exists. Resetting password for ${email}...`);
    }
    if (updateRole) {
      console.log(`🔄 User exists. Updating role to ${role} for ${email}...`);
    }
  }

  // Generate a secure password if not provided
  const userPassword = password || generateSecurePassword();

  try {
    if (userExists) {
      // Update existing user
      if (resetPassword) {
        await cognitoClient.send(new AdminSetUserPasswordCommand({
          UserPoolId: STAFF_USER_POOL_ID,
          Username: email,
          Password: userPassword,
          Permanent: true
        }));
      }

      if (updateRole) {
        // Update user attributes (name)
        await cognitoClient.send(new AdminUpdateUserAttributesCommand({
          UserPoolId: STAFF_USER_POOL_ID,
          Username: email,
          UserAttributes: [
            { Name: 'name', Value: name }
          ]
        }));

        // Add to new group (Cognito allows multiple groups, so this is additive)
        await cognitoClient.send(new AdminAddUserToGroupCommand({
          UserPoolId: STAFF_USER_POOL_ID,
          Username: email,
          GroupName: role
        }));
      }

      console.log(`✅ User ${email} updated successfully!`);
      if (resetPassword) {
        console.log(`🔐 New Password: ${userPassword}`);
        console.log(`⚠️  IMPORTANT: Save this password securely!`);
      }
    } else {
      // Create new user
      await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: STAFF_USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: name }
        ],
        TemporaryPassword: 'TempPass123!',
        MessageAction: 'SUPPRESS' // Don't send welcome email
      }));

      // Set permanent password
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: STAFF_USER_POOL_ID,
        Username: email,
        Password: userPassword,
        Permanent: true
      }));

      // Add user to appropriate group with retry and verification
      console.log(`🔐 Adding user to '${role}' group...`);
      await addUserToGroupWithRetry(email, role);

      console.log(`✅ Admin user created successfully in Cognito Staff User Pool!`);
      console.log(`📧 Email: ${email}`);
      console.log(`👤 Name: ${name}`);
      console.log(`🔑 Role: ${role}`);
      console.log(`🔐 Password: ${userPassword}`);
      console.log(`⚠️  IMPORTANT: Save this password securely!`);
      
      // Get the Cognito user ID (sub) and sync to DynamoDB
      console.log(`\n📊 Syncing user to DynamoDB...`);
      const cognitoUser = await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: STAFF_USER_POOL_ID,
        Username: email
      }));
      
      const cognitoUserId = cognitoUser.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
      if (cognitoUserId) {
        await syncUserToDynamoDB(cognitoUserId, email, name, role);
      } else {
        console.log(`   ⚠️  Could not retrieve Cognito user ID, skipping DynamoDB sync`);
      }
    }

    console.log(`\n📋 Next Steps:`);
    console.log(`1. Log in to the admin panel using the staff login endpoint`);
    console.log(`2. Change the password after first login (recommended)`);
    console.log(`3. Set up MFA for enhanced security (if available)`);

  } catch (error: any) {
    console.error('❌ Error creating/updating admin user:', error.message);
    throw error;
  }
}

// Generate a secure password
function generateSecurePassword(): string {
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

// Parse command line arguments
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
        const validRoles: AdminRole[] = ['super_admin', 'admin', 'manager', 'team_member'];
        if (!validRoles.includes(value as AdminRole)) {
          throw new Error(`Invalid role: ${value}. Valid roles: ${validRoles.join(', ')}`);
        }
        options.role = value as AdminRole;
        break;
      case '--password':
        options.password = value;
        break;
      case '--reset-password':
        options.resetPassword = true;
        i--; // No value needed for this flag
        break;
      case '--update-role':
        options.updateRole = true;
        i--; // No value needed for this flag
        break;
      default:
        if (key.startsWith('--')) {
          throw new Error(`Unknown option: ${key}`);
        }
    }
  }

  // Set defaults
  if (!options.email) {
    options.email = 'admin@harborlist.local';
    console.log('📧 Using default email: admin@harborlist.local');
  }
  if (!options.name) {
    options.name = 'HarborList Admin';
    console.log('👤 Using default name: HarborList Admin');
  }
  if (!options.role) {
    options.role = 'super_admin';
    console.log('🔑 Using default role: super_admin');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(options.email)) {
    throw new Error('Invalid email format.');
  }

  return options as CreateAdminOptions;
}

// Print usage information
function printUsage() {
  console.log(`
🚀 HarborList Cognito Admin User Creation Script

Usage:
  npm run create-admin [options]

Optional Arguments:
  --email <email>     Admin user email address (default: admin@harborlist.local)
  --name <name>       Admin user full name (default: HarborList Admin)
  --role <role>       Admin role (default: super_admin)
  --password <pass>   Custom password (if not provided, one will be generated)
  --reset-password    Reset password if user already exists
  --update-role       Update role for existing user

Available Roles:
  - super_admin: Full system access
  - admin: Management access
  - manager: Team oversight
  - team_member: Basic staff access

Examples:
  # Create default admin (admin@harborlist.local, super_admin role)
  npm run create-admin

  # Create admin with custom email
  npm run create-admin -- --email admin@company.com

  # Reset password for existing admin
  npm run create-admin -- --reset-password

  # Create a manager with custom password  
  npm run create-admin -- --email manager@harborlist.local --name "Team Manager" --role manager --password MySecurePass123!

Environment Variables:
  STAFF_USER_POOL_ID: Cognito Staff User Pool ID (required)
  AWS_REGION: AWS region (default: us-east-1)
  COGNITO_ENDPOINT: LocalStack endpoint for local development
  IS_LOCALSTACK: Set to 'true' for local development
`);
}

// Main function
async function main() {
  try {
    // Check for help flag
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      printUsage();
      process.exit(0);
    }

    console.log('🚀 HarborList Cognito Admin User Creation Script\n');

    // Parse command line arguments
    const options = parseArguments();

    // Confirm creation
    console.log('📋 Creating admin user with the following details:');
    console.log(`   Email: ${options.email}`);
    console.log(`   Name: ${options.name}`);
    console.log(`   Role: ${options.role}`);
    console.log(`   User Pool: ${STAFF_USER_POOL_ID}`);
    console.log(`   Region: ${AWS_REGION}\n`);

    // Create the admin user
    await createAdminUserInCognito(options);

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

export { createAdminUserInCognito, generateSecurePassword };