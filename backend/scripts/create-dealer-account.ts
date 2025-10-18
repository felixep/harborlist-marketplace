#!/usr/bin/env ts-node

/**
 * Dealer Account Creation Script
 * 
 * This script creates dealer accounts and their sub-accounts in the HarborList system.
 * It works with both LocalStack (local development) and AWS (production).
 * 
 * Usage:
 *   # Create dealer account
 *   npm run create-dealer -- --email dealer@example.com --name "Dealer Name" --tier dealer
 *   
 *   # Create sub-account for existing dealer
 *   npm run create-dealer -- --parent-id dealer-123 --email manager@dealer.com --name "Manager Name" --role manager
 *   
 * Environment Variables Required:
 *   - CUSTOMER_USER_POOL_ID: Cognito Customer User Pool ID
 *   - AWS_REGION: AWS region (default: us-east-1)
 *   - COGNITO_ENDPOINT: LocalStack endpoint (for local development)
 *   - IS_LOCALSTACK: Set to 'true' for local development
 */

import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

// Configuration from environment
const CUSTOMER_USER_POOL_ID = process.env.CUSTOMER_USER_POOL_ID;
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

// Valid customer tiers
type CustomerTier = 'individual' | 'dealer' | 'premium' | 'premium_dealer';

// Valid dealer sub-account roles
type DealerSubAccountRole = 'admin' | 'manager' | 'staff';

interface CreateDealerOptions {
  email: string;
  name: string;
  tier: CustomerTier;
  password?: string;
}

interface CreateSubAccountOptions {
  parentDealerId: string;
  email: string;
  name: string;
  role: DealerSubAccountRole;
  password?: string;
  accessScope?: {
    listings: 'all' | string[];
    leads: boolean;
    analytics: boolean;
    inventory: boolean;
    pricing: boolean;
    communications: boolean;
  };
  delegatedPermissions?: string[];
}

// Check if user exists in Cognito
async function checkUserExists(email: string): Promise<boolean> {
  try {
    await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: CUSTOMER_USER_POOL_ID,
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

// Verify parent dealer exists and is a dealer
async function verifyParentDealer(parentDealerId: string): Promise<boolean> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: parentDealerId }
    }));

    if (!result.Item) {
      console.error(`❌ Parent dealer not found: ${parentDealerId}`);
      return false;
    }

    const customerTier = result.Item.customerTier;
    if (customerTier !== 'dealer' && customerTier !== 'premium_dealer') {
      console.error(`❌ User ${parentDealerId} is not a dealer (tier: ${customerTier})`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('Error verifying parent dealer:', error.message);
    return false;
  }
}

// Create dealer user in Cognito and DynamoDB
async function createDealerUser(options: CreateDealerOptions): Promise<void> {
  const { email, name, tier, password } = options;

  if (!CUSTOMER_USER_POOL_ID) {
    throw new Error('CUSTOMER_USER_POOL_ID environment variable is required');
  }

  // Check if user already exists
  const userExists = await checkUserExists(email);
  if (userExists) {
    console.log(`✅ User with email ${email} already exists.`);
    return;
  }

  // Generate a secure password if not provided
  const userPassword = password || generateSecurePassword();

  try {
    // Create user in Cognito Customer Pool
    console.log(`🔐 Creating dealer user in Cognito...`);
    await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: CUSTOMER_USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
        { Name: 'custom:customer_type', Value: tier }
      ],
      TemporaryPassword: 'TempPass123!',
      MessageAction: 'SUPPRESS' // Don't send welcome email
    }));

    // Set permanent password
    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: CUSTOMER_USER_POOL_ID,
      Username: email,
      Password: userPassword,
      Permanent: true
    }));

    console.log(`✅ Dealer user created successfully in Cognito!`);

    // Get the Cognito user ID (sub)
    const cognitoUser = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: CUSTOMER_USER_POOL_ID,
      Username: email
    }));
    
    const cognitoUserId = cognitoUser.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
    
    if (!cognitoUserId) {
      throw new Error('Could not retrieve Cognito user ID');
    }

    // Create user record in DynamoDB
    console.log(`📊 Creating dealer record in DynamoDB...`);
    const now = new Date().toISOString();
    
    const userRecord = {
      id: cognitoUserId,
      email: email,
      name: name,
      userType: 'customer',
      role: 'user',
      customerTier: tier,
      status: 'active',
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: now,
      updatedAt: now,
      // Dealer-specific fields
      canCreateSubAccounts: true,
      maxSubAccounts: tier === 'premium_dealer' ? 50 : 10,
    };

    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: userRecord
    }));

    console.log(`✅ Dealer record synced to DynamoDB (${USERS_TABLE})`);
    console.log(`\n📋 Dealer Account Details:`);
    console.log(`   📧 Email: ${email}`);
    console.log(`   👤 Name: ${name}`);
    console.log(`   🎫 Tier: ${tier}`);
    console.log(`   🆔 ID: ${cognitoUserId}`);
    console.log(`   🔐 Password: ${userPassword}`);
    console.log(`   ⚠️  IMPORTANT: Save this password securely!`);
    console.log(`\n📋 Next Steps:`);
    console.log(`   1. Log in to the marketplace using customer login`);
    console.log(`   2. Create sub-accounts using: npm run create-dealer -- --parent-id ${cognitoUserId} --email sub@dealer.com --name "Sub Name" --role manager`);

  } catch (error: any) {
    console.error('❌ Error creating dealer user:', error.message);
    throw error;
  }
}

// Create dealer sub-account
async function createSubAccount(options: CreateSubAccountOptions): Promise<void> {
  const { parentDealerId, email, name, role, password, accessScope, delegatedPermissions } = options;

  if (!CUSTOMER_USER_POOL_ID) {
    throw new Error('CUSTOMER_USER_POOL_ID environment variable is required');
  }

  // Verify parent dealer exists
  console.log(`🔍 Verifying parent dealer ${parentDealerId}...`);
  const isValidDealer = await verifyParentDealer(parentDealerId);
  if (!isValidDealer) {
    throw new Error('Invalid parent dealer');
  }

  // Check if sub-account already exists
  const userExists = await checkUserExists(email);
  if (userExists) {
    console.log(`✅ Sub-account with email ${email} already exists.`);
    return;
  }

  // Generate a secure password if not provided
  const userPassword = password || generateSecurePassword();

  try {
    // Create user in Cognito
    console.log(`🔐 Creating sub-account in Cognito...`);
    await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: CUSTOMER_USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
        { Name: 'custom:customer_type', Value: 'dealer' } // Sub-accounts inherit dealer type
      ],
      TemporaryPassword: 'TempPass123!',
      MessageAction: 'SUPPRESS'
    }));

    // Set permanent password
    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: CUSTOMER_USER_POOL_ID,
      Username: email,
      Password: userPassword,
      Permanent: true
    }));

    console.log(`✅ Sub-account created successfully in Cognito!`);

    // Get the Cognito user ID (sub)
    const cognitoUser = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: CUSTOMER_USER_POOL_ID,
      Username: email
    }));
    
    const cognitoUserId = cognitoUser.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
    
    if (!cognitoUserId) {
      throw new Error('Could not retrieve Cognito user ID');
    }

    // Default access scope based on role
    const defaultAccessScope = {
      listings: 'all' as const,
      leads: role === 'staff' ? false : true,
      analytics: role !== 'staff',
      inventory: role !== 'staff',
      pricing: role === 'admin',
      communications: true,
    };

    // Default permissions based on role
    const defaultPermissions = {
      admin: ['manage_listings', 'create_listings', 'edit_listings', 'delete_listings', 
              'view_analytics', 'respond_to_leads', 'manage_inventory', 'update_pricing', 
              'manage_communications', 'manage_sub_accounts'],
      manager: ['manage_listings', 'create_listings', 'edit_listings', 'view_analytics', 
                'respond_to_leads', 'manage_inventory', 'update_pricing', 'manage_communications'],
      staff: ['edit_listings', 'respond_to_leads', 'manage_communications'],
    };

    // Create user record in DynamoDB
    console.log(`📊 Creating sub-account record in DynamoDB...`);
    const now = new Date().toISOString();
    
    const userRecord = {
      id: cognitoUserId,
      email: email,
      name: name,
      userType: 'customer',
      role: 'user',
      customerTier: 'dealer',
      status: 'active',
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      loginAttempts: 0,
      createdAt: now,
      updatedAt: now,
      // Sub-account specific fields
      isDealerSubAccount: true,
      parentDealerId: parentDealerId,
      dealerAccountRole: role,
      accessScope: accessScope || defaultAccessScope,
      delegatedPermissions: delegatedPermissions || defaultPermissions[role],
      createdBy: parentDealerId,
    };

    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: userRecord
    }));

    console.log(`✅ Sub-account record synced to DynamoDB (${USERS_TABLE})`);
    console.log(`\n📋 Sub-Account Details:`);
    console.log(`   📧 Email: ${email}`);
    console.log(`   👤 Name: ${name}`);
    console.log(`   🔑 Role: ${role}`);
    console.log(`   👥 Parent Dealer: ${parentDealerId}`);
    console.log(`   🆔 ID: ${cognitoUserId}`);
    console.log(`   🔐 Password: ${userPassword}`);
    console.log(`   ⚠️  IMPORTANT: Save this password securely!`);
    console.log(`\n🎯 Permissions: ${(delegatedPermissions || defaultPermissions[role]).join(', ')}`);
    console.log(`\n📋 Access Scope:`);
    console.log(`   📝 Listings: ${(accessScope || defaultAccessScope).listings}`);
    console.log(`   📧 Leads: ${(accessScope || defaultAccessScope).leads}`);
    console.log(`   📊 Analytics: ${(accessScope || defaultAccessScope).analytics}`);

  } catch (error: any) {
    console.error('❌ Error creating sub-account:', error.message);
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
function parseArguments(): CreateDealerOptions | CreateSubAccountOptions {
  const args = process.argv.slice(2);
  const options: any = {};

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
      case '--tier':
        const validTiers: CustomerTier[] = ['individual', 'dealer', 'premium', 'premium_dealer'];
        if (!validTiers.includes(value as CustomerTier)) {
          throw new Error(`Invalid tier: ${value}. Valid tiers: ${validTiers.join(', ')}`);
        }
        options.tier = value as CustomerTier;
        break;
      case '--parent-id':
        options.parentDealerId = value;
        break;
      case '--role':
        const validRoles: DealerSubAccountRole[] = ['admin', 'manager', 'staff'];
        if (!validRoles.includes(value as DealerSubAccountRole)) {
          throw new Error(`Invalid role: ${value}. Valid roles: ${validRoles.join(', ')}`);
        }
        options.role = value as DealerSubAccountRole;
        break;
      case '--password':
        options.password = value;
        break;
      default:
        if (key.startsWith('--')) {
          throw new Error(`Unknown option: ${key}`);
        }
    }
  }

  // Validate required fields
  if (!options.email) {
    throw new Error('--email is required');
  }
  if (!options.name) {
    throw new Error('--name is required');
  }

  // Determine if this is a dealer or sub-account creation
  if (options.parentDealerId) {
    // Sub-account creation
    if (!options.role) {
      throw new Error('--role is required for sub-account creation');
    }
    return options as CreateSubAccountOptions;
  } else {
    // Dealer creation
    if (!options.tier) {
      options.tier = 'dealer';
      console.log('📋 Using default tier: dealer');
    }
    return options as CreateDealerOptions;
  }
}

// Print usage information
function printUsage() {
  console.log(`
🚀 HarborList Dealer Account Creation Script

USAGE:
  Create Dealer Account:
    npm run create-dealer -- --email dealer@example.com --name "Dealer Name" [--tier dealer|premium_dealer] [--password MyPass123!]

  Create Sub-Account:
    npm run create-dealer -- --parent-id dealer-id --email sub@dealer.com --name "Sub Name" --role admin|manager|staff [--password MyPass123!]

OPTIONS:
  --email <email>          Email address (required)
  --name <name>            Full name (required)
  --tier <tier>            Customer tier: individual, dealer, premium, premium_dealer (default: dealer)
  --parent-id <id>         Parent dealer ID (for sub-account creation)
  --role <role>            Sub-account role: admin, manager, staff (required for sub-accounts)
  --password <password>    Password (optional, will generate if not provided)

EXAMPLES:
  # Create a dealer account
  npm run create-dealer -- --email dealer@example.com --name "John's Boats" --tier dealer

  # Create a premium dealer account
  npm run create-dealer -- --email premium@example.com --name "Premium Dealer" --tier premium_dealer

  # Create a manager sub-account
  npm run create-dealer -- --parent-id abc-123 --email manager@dealer.com --name "Manager Name" --role manager

  # Create a staff sub-account
  npm run create-dealer -- --parent-id abc-123 --email staff@dealer.com --name "Staff Name" --role staff

DEALER ROLES:
  admin    - Full access to all dealer features including sub-account management
  manager  - Can manage listings, inventory, pricing, leads, and analytics
  staff    - Limited access to listing editing and customer communications

TIER COMPARISON:
  dealer          - 10 sub-accounts, standard features
  premium_dealer  - 50 sub-accounts, premium features

ENVIRONMENT:
  Requires: CUSTOMER_USER_POOL_ID, AWS_REGION
  Optional: IS_LOCALSTACK=true, COGNITO_ENDPOINT, DYNAMODB_ENDPOINT
`);
}

// Main execution
async function main() {
  try {
    // Check for help flag
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      printUsage();
      process.exit(0);
    }

    console.log('🚀 HarborList Dealer Account Creation Script\n');

    // Parse arguments
    const options = parseArguments();

    // Determine operation type
    if ('parentDealerId' in options) {
      // Create sub-account
      console.log('📝 Creating dealer sub-account...\n');
      await createSubAccount(options);
    } else {
      // Create dealer
      console.log('📝 Creating dealer account...\n');
      await createDealerUser(options);
    }

    console.log('\n✅ Operation completed successfully!');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Run with --help for usage information');
    process.exit(1);
  }
}

// Run main function
main();
