#!/bin/bash

# Sync existing Cognito staff users to DynamoDB
# This is a one-time migration script for staff users created before the sync feature was implemented
# Usage: ./sync-staff-users.sh

set -e

echo "🔄 Syncing Cognito staff users to DynamoDB..."
echo ""

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "❌ Error: .env.local file not found"
    exit 1
fi

# Check if STAFF_USER_POOL_ID is set
if [ -z "$STAFF_USER_POOL_ID" ]; then
    echo "❌ Error: STAFF_USER_POOL_ID not found in .env.local"
    exit 1
fi

echo "📋 Staff User Pool ID: $STAFF_USER_POOL_ID"
echo ""

# Get all users from Cognito Staff Pool
echo "🔍 Fetching staff users from Cognito..."
USERS_JSON=$(docker exec harborlist-marketplace-localstack-1 \
    awslocal cognito-idp list-users \
    --user-pool-id "$STAFF_USER_POOL_ID" \
    --output json)

# Count users
USER_COUNT=$(echo "$USERS_JSON" | grep -o '"Username"' | wc -l | tr -d ' ')
echo "✅ Found $USER_COUNT staff users in Cognito"
echo ""

if [ "$USER_COUNT" -eq 0 ]; then
    echo "ℹ️  No staff users to sync"
    exit 0
fi

# Parse and sync each user
echo "$USERS_JSON" | docker exec -i harborlist-marketplace-backend-1 node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  try {
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
    const users = data.Users || [];
    
    console.log('📊 Processing', users.length, 'staff users...');
    console.log('');
    
    let synced = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const user of users) {
      const username = user.Username;
      const attributes = {};
      
      // Parse user attributes
      user.Attributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
      });
      
      const email = attributes.email;
      const emailVerified = attributes.email_verified === 'true';
      const name = attributes.name || email.split('@')[0];
      const customRole = attributes['custom:role'];
      
      // Determine role from custom attribute or default to admin
      let role = 'admin';
      if (customRole) {
        role = customRole;
      } else {
        // Try to determine from email
        if (email.includes('super') || email.includes('admin@')) {
          role = 'super_admin';
        } else if (email.includes('moderator')) {
          role = 'moderator';
        } else if (email.includes('support')) {
          role = 'support';
        }
      }
      
      // Check if user already exists in DynamoDB
      try {
        const queryResult = await docClient.send(new QueryCommand({
          TableName: 'harborlist-users',
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': email
          }
        }));
        
        if (queryResult.Items && queryResult.Items.length > 0) {
          console.log('⏭️  Skipping', email, '- already exists in DynamoDB');
          skipped++;
          continue;
        }
      } catch (queryError) {
        // Index might not exist, continue anyway
      }
      
      // Create staff user record in DynamoDB
      const userRecord = {
        id: username,
        email: email,
        name: name,
        role: role,
        status: user.UserStatus === 'CONFIRMED' ? 'active' : 'pending_verification',
        userType: 'staff',
        emailVerified: emailVerified,
        cognitoUsername: username,
        mfaEnabled: false,
        createdAt: user.UserCreateDate ? new Date(user.UserCreateDate * 1000).toISOString() : new Date().toISOString(),
        updatedAt: user.UserLastModifiedDate ? new Date(user.UserLastModifiedDate * 1000).toISOString() : new Date().toISOString(),
        lastLoginAt: null,
        loginCount: 0,
        permissions: [],
        metadata: {
          syncedFrom: 'cognito',
          syncedAt: new Date().toISOString(),
          source: 'migration-script'
        }
      };
      
      try {
        await docClient.send(new PutCommand({
          TableName: 'harborlist-users',
          Item: userRecord
        }));
        
        console.log('✅ Synced', email, '- Role:', role, '- Status:', user.UserStatus);
        synced++;
      } catch (error) {
        console.error('❌ Error syncing', email, ':', error.message);
        errors++;
      }
    }
    
    console.log('');
    console.log('📊 Staff Sync Summary:');
    console.log('  ✅ Synced:', synced);
    console.log('  ⏭️  Skipped:', skipped);
    console.log('  ❌ Errors:', errors);
    console.log('  📋 Total:', users.length);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
})();
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Staff sync completed successfully!"
    echo ""
    echo "💡 Staff users should now appear in the admin panel at:"
    echo "   https://local.harborlist.com/admin/users (Staff tab)"
else
    echo ""
    echo "❌ Staff sync failed"
    exit 1
fi
