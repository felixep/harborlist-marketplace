docker exec -it harborlist-marketplace-backend-1 node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://dynamodb-local:8000',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'harborlist-users'
    }));
    
    console.log('📊 Total Users in DynamoDB:', result.Items.length);
    console.log('');
    
    const customers = result.Items.filter(u => u.role === 'user' || u.userType === 'customer');
    const staff = result.Items.filter(u => ['admin', 'super_admin', 'moderator', 'support'].includes(u.role));
    
    console.log('👥 Customers:', customers.length);
    customers.forEach(user => {
      console.log('   -', user.email, '(', user.customerType || user.tier, ')');
    });
    
    console.log('');
    console.log('👔 Staff:', staff.length);
    staff.forEach(user => {
      console.log('   -', user.email, '(', user.role, ')');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
"