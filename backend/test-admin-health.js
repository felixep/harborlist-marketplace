/**
 * Simple test script to verify admin service system health functionality
 */

const { handler } = require('./dist/admin-service/index.js');

// Mock event for system health endpoint
const mockEvent = {
  path: '/api/admin/system/health',
  httpMethod: 'GET',
  headers: {
    'Authorization': 'Bearer mock-token'
  },
  queryStringParameters: null,
  pathParameters: null,
  requestContext: {
    requestId: 'test-request-123'
  }
};

// Mock context
const mockContext = {};

async function testSystemHealth() {
  try {
    console.log('Testing admin service system health endpoint...');
    
    const result = await handler(mockEvent, mockContext);
    
    console.log('Response status:', result.statusCode);
    console.log('Response body:', JSON.parse(result.body));
    
    if (result.statusCode === 200) {
      console.log('✅ System health endpoint is working!');
    } else {
      console.log('❌ System health endpoint returned error:', result.statusCode);
    }
    
  } catch (error) {
    console.error('❌ Error testing system health:', error.message);
  }
}

// Test simple health check (no auth required)
async function testSimpleHealth() {
  try {
    console.log('Testing simple health check endpoint...');
    
    const simpleEvent = {
      ...mockEvent,
      path: '/health'
    };
    
    const result = await handler(simpleEvent, mockContext);
    
    console.log('Simple health response:', JSON.parse(result.body));
    
    if (result.statusCode === 200) {
      console.log('✅ Simple health check is working!');
    } else {
      console.log('❌ Simple health check failed:', result.statusCode);
    }
    
  } catch (error) {
    console.error('❌ Error testing simple health:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting admin service tests...\n');
  
  await testSimpleHealth();
  console.log('');
  await testSystemHealth();
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error);