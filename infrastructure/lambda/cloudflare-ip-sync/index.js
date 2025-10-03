// AWS SDK v3 imports (available in Node.js 18+ Lambda runtime)
const { S3Client, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
const { APIGatewayClient, PutRestApiPolicyCommand } = require('@aws-sdk/client-api-gateway');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const https = require('https');
const url = require('url');

// Initialize AWS SDK v3 clients
const s3Client = new S3Client({});
const apiGatewayClient = new APIGatewayClient({});
const ssmClient = new SSMClient({});

exports.handler = async (event, context) => {
    console.log('Starting Cloudflare IP synchronization...');
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Check if this is a CloudFormation custom resource event
    const isCustomResource = event.RequestType && event.ResponseURL;
    
    try {
        // Fetch current Cloudflare IP ranges
        const cloudflareIps = await fetchCloudflareIps();
        console.log('Fetched Cloudflare IPs:', JSON.stringify(cloudflareIps));
        
        // Get edge secret from SSM
        const edgeSecret = await getEdgeSecret();
        
        // Update S3 bucket policy
        await updateS3BucketPolicy(cloudflareIps, edgeSecret);
        
        // Update API Gateway resource policy (only if API Gateway ID is available)
        // Temporarily disabled - will implement separately
        // if (process.env.API_GATEWAY_REST_API_ID) {
        //     await updateApiGatewayPolicy(cloudflareIps, edgeSecret);
        // }
        
        console.log('Successfully updated policies with latest Cloudflare IPs');
        
        const responseData = {
            message: 'Cloudflare IP synchronization completed successfully',
            ipv4Count: cloudflareIps.ipv4Cidrs.length,
            ipv6Count: cloudflareIps.ipv6Cidrs.length
        };
        
        // Send success response to CloudFormation if this is a custom resource
        if (isCustomResource) {
            await sendResponse(event, context, 'SUCCESS', responseData);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify(responseData)
        };
        
    } catch (error) {
        console.error('Error during IP synchronization:', error);
        
        // Send failure response to CloudFormation if this is a custom resource
        if (isCustomResource) {
            await sendResponse(event, context, 'FAILED', { error: error.message });
        }
        
        throw error;
    }
};

async function fetchCloudflareIps() {
    const [ipv4Response, ipv6Response] = await Promise.all([
        httpsRequest('https://www.cloudflare.com/ips-v4'),
        httpsRequest('https://www.cloudflare.com/ips-v6')
    ]);
    
    return {
        ipv4Cidrs: ipv4Response.split('\n').filter(ip => ip.trim()),
        ipv6Cidrs: ipv6Response.split('\n').filter(ip => ip.trim())
    };
}

function httpsRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function getEdgeSecret() {
    const command = new GetParameterCommand({
        Name: process.env.EDGE_SECRET_PARAMETER,
        WithDecryption: true
    });
    
    const result = await ssmClient.send(command);
    return result.Parameter.Value;
}

async function updateS3BucketPolicy(cloudflareIps, edgeSecret) {
    const bucketName = process.env.FRONTEND_BUCKET_NAME;
    
    const policy = {
        Version: '2012-10-17',
        Statement: [
            {
                Sid: 'CloudflareOriginAccess',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: `arn:aws:s3:::${bucketName}/*`,
                Condition: {
                    IpAddress: {
                        'aws:SourceIp': [...cloudflareIps.ipv4Cidrs, ...cloudflareIps.ipv6Cidrs]
                    },
                    StringEquals: {
                        'aws:Referer': edgeSecret
                    }
                }
            },
            {
                Sid: 'DenyInsecureConnections',
                Effect: 'Deny',
                Principal: '*',
                Action: 's3:*',
                Resource: [
                    `arn:aws:s3:::${bucketName}`,
                    `arn:aws:s3:::${bucketName}/*`
                ],
                Condition: {
                    Bool: {
                        'aws:SecureTransport': 'false'
                    }
                }
            }
        ]
    };
    
    const command = new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policy)
    });
    
    await s3Client.send(command);
    console.log('Updated S3 bucket policy for bucket:', bucketName);
}

async function updateApiGatewayPolicy(cloudflareIps, edgeSecret) {
    const restApiId = process.env.API_GATEWAY_REST_API_ID;
    
    const policy = {
        Version: '2012-10-17',
        Statement: [
            {
                Sid: 'CloudflareOriginAccess',
                Effect: 'Allow',
                Principal: '*',
                Action: 'execute-api:Invoke',
                Resource: `arn:aws:execute-api:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:${restApiId}/*`,
                Condition: {
                    IpAddress: {
                        'aws:SourceIp': [...cloudflareIps.ipv4Cidrs, ...cloudflareIps.ipv6Cidrs]
                    },
                    StringEquals: {
                        'aws:RequestedRegion': process.env.AWS_REGION
                    }
                }
            },
            {
                Sid: 'DenyInsecureConnections',
                Effect: 'Deny',
                Principal: '*',
                Action: 'execute-api:Invoke',
                Resource: `arn:aws:execute-api:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:${restApiId}/*`,
                Condition: {
                    Bool: {
                        'aws:SecureTransport': 'false'
                    }
                }
            }
        ]
    };
    
    const command = new PutRestApiPolicyCommand({
        restApiId: restApiId,
        policy: JSON.stringify(policy)
    });
    
    await apiGatewayClient.send(command);
    console.log('Updated API Gateway resource policy for API:', restApiId);
}

async function sendResponse(event, context, responseStatus, responseData) {
    const responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
        PhysicalResourceId: context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData
    });

    console.log('Response body:', responseBody);

    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'content-type': '',
            'content-length': responseBody.length
        }
    };

    return new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
            console.log('Status code:', response.statusCode);
            console.log('Status message:', response.statusMessage);
            resolve();
        });

        request.on('error', (error) => {
            console.log('send(..) failed executing https.request(..):', error);
            reject(error);
        });

        request.write(responseBody);
        request.end();
    });
}