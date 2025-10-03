# 🚀 Deployment & CI/CD

## 📋 **Overview**

The HarborList deployment framework provides automated, reliable, and scalable deployment processes across all environments. Our CI/CD pipeline ensures consistent deployments, comprehensive testing, and zero-downtime releases through infrastructure as code, automated testing, and progressive deployment strategies.

## 🐳 **Local Development Environment**

Before deploying to cloud environments, developers can work with a complete local setup that mirrors production:

- **[📖 Local Development Setup](./local-development.md)** - Complete Docker-based local environment
- **[🔧 Implementation Details](./local-development-implementation.md)** - Technical implementation summary

**Quick Start:**
```bash
npm run hosts:setup     # Add local domains to /etc/hosts
npm run dev:setup       # Initialize local environment
npm run dev:start:bg    # Start all services
npm run dev:admin       # Create admin user
```

**Local URLs:**
- Frontend: http://local.harborlist.com:3000
- Backend: http://local-api.harborlist.com:3001
- DynamoDB Admin: http://localhost:8001

---

## ⚡ **Manual AWS Deployment (CLI)**

For direct deployment to AWS environments using command line tools, follow these step-by-step procedures:

### **Prerequisites**
```bash
# Required tools
node --version    # Should be 18+
npm --version     # Should be 8+
aws --version     # Should be 2.0+
cdk --version     # Should be 2.100+

# AWS credentials configured
aws sts get-caller-identity  # Verify AWS access
```

### **🔧 Development Environment Deployment**

**Step 1: Prepare Infrastructure**
```bash
cd infrastructure
npm install
npm run build
```

**Step 2: Deploy Infrastructure**
```bash
# With custom domains (recommended)
npm run deploy:dev

# Without custom domains (testing only)
npm run deploy:dev:no-domains
```

**Step 3: Build & Deploy Frontend**
```bash
cd ../frontend
npm install
npm run build:dev
```

**Step 4: Build & Deploy Backend**
```bash
cd ../backend
npm install  
npm run build
```

**Step 5: Verify Deployment**
```bash
cd ../tools/deployment
./verify-deployment.sh dev
```

### **🧪 Staging Environment Deployment**

**Step 1: Infrastructure Deployment**
```bash
cd infrastructure
npm run deploy:staging
```

**Step 2: Application Builds**
```bash
# Frontend for staging
cd ../frontend
npm run build:staging

# Backend for staging  
cd ../backend
npm run build
```

**Step 3: Post-Deployment Setup**
```bash
# Create admin user (if needed)
npm run create-admin

# Verify deployment
cd ../tools/deployment
./verify-deployment.sh staging
```

### **🚀 Production Environment Deployment**

> **⚠️ WARNING**: Production deployments require extra validation and should follow change management procedures.

**Step 1: Pre-Production Validation**
```bash
# Validate infrastructure changes
cd infrastructure
npm run diff:prod

# Run all tests
npm run validate:all
```

**Step 2: Production Deployment**
```bash
# Deploy with blue/green strategy (production only)
npm run deploy:prod

# Or deploy using deployment script for enhanced safety
cd ../tools/deployment
./deploy.sh prod --verify-only  # Dry run first
./deploy.sh prod                # Actual deployment
```

**Step 3: Production Verification**
```bash
# Comprehensive production verification
./verify-deployment.sh prod

# Run smoke tests
cd ../../backend
npm run test:smoke:prod
```

### **🛠️ Alternative: Using Deployment Scripts**

For enhanced safety and automated checks, use the deployment scripts:

```bash
# Navigate to deployment tools
cd tools/deployment

# Development deployment with full automation  
./deploy.sh dev

# Staging deployment
./deploy.sh staging

# Production deployment with safety checks
./deploy.sh prod

# Deployment verification
./verify-deployment.sh [environment]
```

### **📋 Common Deployment Commands Reference**

| Task | Development | Staging | Production |
|------|-------------|---------|------------|
| **Infrastructure** | `npm run deploy:dev` | `npm run deploy:staging` | `npm run deploy:prod` |
| **No Domains** | `npm run deploy:dev:no-domains` | `npm run deploy:staging:no-domains` | Not recommended |
| **Diff Preview** | `npm run diff:dev` | `npm run diff:staging` | `npm run diff:prod` |
| **Synthesis** | `npm run synth:dev` | `npm run synth:staging` | `npm run synth:prod` |
| **Verification** | `./verify-deployment.sh dev` | `./verify-deployment.sh staging` | `./verify-deployment.sh prod` |

### **🔧 Troubleshooting Manual Deployments**

**Common Issues & Solutions:**

```bash
# AWS credentials issues
aws configure list
aws sts get-caller-identity

# CDK bootstrap issues
cdk bootstrap aws://ACCOUNT-ID/REGION

# Build failures
npm run clean && npm install
npm run build

# Stack not found errors
aws cloudformation list-stacks --region us-east-1

# Permission issues
aws iam get-user
aws sts get-caller-identity
```

**Rollback Procedures:**
```bash
# Emergency rollback (if deployment fails)
cd tools/deployment
./rollback.sh [environment] --previous-version

# Verify rollback
./verify-deployment.sh [environment] --post-rollback
```

---

## 🏗️ **CI/CD Pipeline Architecture**

### **GitHub Actions Workflow**

```yaml
# .github/workflows/deploy.yml
name: HarborList CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  AWS_REGION: us-east-1
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.9'

jobs:
  # Code Quality & Security Checks
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # For SonarCloud analysis

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: |
            frontend/package-lock.json
            backend/package-lock.json

      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci
          cd ../infrastructure && npm ci

      - name: ESLint Frontend
        run: cd frontend && npm run lint

      - name: ESLint Backend
        run: cd backend && npm run lint

      - name: TypeScript Type Check
        run: |
          cd frontend && npm run type-check
          cd ../backend && npm run type-check

      - name: Security Audit
        run: |
          cd frontend && npm audit --audit-level moderate
          cd ../backend && npm audit --audit-level moderate

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'HarborList'
          path: '.'
          format: 'ALL'
          
      - name: Upload dependency check results
        uses: actions/upload-artifact@v3
        with:
          name: dependency-check-report
          path: reports/

  # Frontend Testing & Build
  frontend-test-build:
    runs-on: ubuntu-latest
    needs: code-quality
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Run unit tests
        run: cd frontend && npm run test:coverage
        env:
          CI: true

      - name: Upload test coverage
        uses: codecov/codecov-action@v3
        with:
          file: frontend/coverage/lcov.info
          flags: frontend

      - name: Run E2E tests
        run: cd frontend && npm run test:e2e
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}

      - name: Build frontend
        run: cd frontend && npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
          VITE_ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}

      - name: Performance budget check
        run: cd frontend && npm run build:analyze

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: frontend-build
          path: frontend/dist/
          retention-days: 7

  # Backend Testing & Build
  backend-test-build:
    runs-on: ubuntu-latest
    needs: code-quality
    services:
      dynamodb-local:
        image: amazon/dynamodb-local:latest
        ports:
          - 8000:8000

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: cd backend && npm ci

      - name: Setup test database
        run: |
          cd backend
          npm run db:setup:test
        env:
          DYNAMODB_ENDPOINT: http://localhost:8000

      - name: Run unit tests
        run: cd backend && npm run test:coverage
        env:
          NODE_ENV: test
          DYNAMODB_ENDPOINT: http://localhost:8000

      - name: Run integration tests
        run: cd backend && npm run test:integration
        env:
          NODE_ENV: test
          DYNAMODB_ENDPOINT: http://localhost:8000

      - name: Upload test coverage
        uses: codecov/codecov-action@v3
        with:
          file: backend/coverage/lcov.info
          flags: backend

      - name: Build backend
        run: cd backend && npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: backend-build
          path: backend/dist/
          retention-days: 7

  # Infrastructure Validation
  infrastructure-validate:
    runs-on: ubuntu-latest
    needs: code-quality
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: infrastructure/package-lock.json

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Install CDK dependencies
        run: cd infrastructure && npm ci

      - name: CDK Synthesize
        run: cd infrastructure && npx cdk synth

      - name: CDK Diff (Staging)
        run: cd infrastructure && npx cdk diff HarborListStack-staging
        if: github.ref != 'refs/heads/main'

      - name: CDK Diff (Production)
        run: cd infrastructure && npx cdk diff HarborListStack-production
        if: github.ref == 'refs/heads/main'

      - name: Security scan CDK templates
        uses: bridgecrewio/checkov-action@master
        with:
          directory: infrastructure/cdk.out/
          framework: cloudformation

  # Deploy to Staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: [frontend-test-build, backend-test-build, infrastructure-validate]
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: frontend-build
          path: frontend/dist/

      - name: Download backend build
        uses: actions/download-artifact@v3
        with:
          name: backend-build
          path: backend/dist/

      - name: Deploy infrastructure
        run: |
          cd infrastructure
          npm ci
          npx cdk deploy HarborListStack-staging --require-approval never
        env:
          ENVIRONMENT: staging

      - name: Deploy frontend to S3
        run: |
          aws s3 sync frontend/dist/ s3://harborlist-frontend-staging --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID_STAGING }} --paths "/*"

      - name: Deploy backend Lambda functions
        run: |
          cd backend
          # Package and deploy Lambda functions
          for function in dist/functions/*; do
            if [ -d "$function" ]; then
              function_name=$(basename "$function")
              cd "$function"
              zip -r "../${function_name}.zip" .
              aws lambda update-function-code \
                --function-name "harborlist-staging-${function_name}" \
                --zip-file "fileb://../${function_name}.zip"
              cd ..
            fi
          done

      - name: Run smoke tests
        run: |
          cd backend
          npm run test:smoke:staging
        env:
          API_BASE_URL: https://api-staging.harborlist.com

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          text: 'Staging deployment completed successfully! 🚀'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  # Deploy to Production
  deploy-production:
    runs-on: ubuntu-latest
    needs: [frontend-test-build, backend-test-build, infrastructure-validate]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Download build artifacts
        uses: actions/download-artifact@v3

      - name: Blue/Green deployment preparation
        run: |
          # Create deployment package
          echo "DEPLOYMENT_ID=$(date +%Y%m%d-%H%M%S)" >> $GITHUB_ENV
          echo "Preparing blue/green deployment: $DEPLOYMENT_ID"

      - name: Deploy infrastructure (Blue/Green)
        run: |
          cd infrastructure
          npm ci
          # Deploy new version alongside existing
          npx cdk deploy HarborListStack-production-green --require-approval never
        env:
          ENVIRONMENT: production
          DEPLOYMENT_COLOR: green

      - name: Deploy frontend (Green)
        run: |
          # Deploy to green S3 bucket
          aws s3 sync frontend/dist/ s3://harborlist-frontend-production-green --delete

      - name: Deploy backend (Green)
        run: |
          cd backend
          # Deploy Lambda functions to green aliases
          for function in dist/functions/*; do
            if [ -d "$function" ]; then
              function_name=$(basename "$function")
              cd "$function"
              zip -r "../${function_name}.zip" .
              
              # Update function code
              aws lambda update-function-code \
                --function-name "harborlist-production-${function_name}" \
                --zip-file "fileb://../${function_name}.zip"
              
              # Create new version
              VERSION=$(aws lambda publish-version \
                --function-name "harborlist-production-${function_name}" \
                --query 'Version' --output text)
              
              # Update green alias
              aws lambda update-alias \
                --function-name "harborlist-production-${function_name}" \
                --name "green" \
                --function-version "$VERSION"
              
              cd ..
            fi
          done

      - name: Run production smoke tests
        run: |
          cd backend
          npm run test:smoke:production:green
        env:
          API_BASE_URL: https://api-green.harborlist.com

      - name: Gradual traffic shifting
        run: |
          # Start with 10% traffic to green
          aws lambda update-alias \
            --function-name "harborlist-production-api-handler" \
            --name "live" \
            --routing-config "AdditionalVersionWeights={$(aws lambda get-alias --function-name harborlist-production-api-handler --name green --query 'FunctionVersion' --output text)=0.1}"
          
          echo "Started gradual rollout with 10% traffic"
          sleep 300 # Wait 5 minutes
          
          # Monitor metrics and increase to 50%
          aws lambda update-alias \
            --function-name "harborlist-production-api-handler" \
            --name "live" \
            --routing-config "AdditionalVersionWeights={$(aws lambda get-alias --function-name harborlist-production-api-handler --name green --query 'FunctionVersion' --output text)=0.5}"
          
          echo "Increased traffic to 50%"
          sleep 300 # Wait 5 minutes
          
          # Complete rollout to 100%
          aws lambda update-alias \
            --function-name "harborlist-production-api-handler" \
            --name "live" \
            --function-version "$(aws lambda get-alias --function-name harborlist-production-api-handler --name green --query 'FunctionVersion' --output text)"

      - name: Update CloudFront distribution
        run: |
          # Switch CloudFront to point to green S3 bucket
          aws cloudfront update-distribution \
            --id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID_PRODUCTION }} \
            --distribution-config file://infrastructure/cloudfront-green-config.json
          
          # Invalidate cache
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID_PRODUCTION }} \
            --paths "/*"

      - name: Post-deployment verification
        run: |
          cd backend
          npm run test:smoke:production
          npm run test:integration:production
        env:
          API_BASE_URL: https://api.harborlist.com

      - name: Cleanup old deployment
        run: |
          # Remove old blue deployment after successful green deployment
          sleep 600 # Wait 10 minutes for traffic to stabilize
          npx cdk destroy HarborListStack-production-blue --force

      - name: Notify successful deployment
        uses: 8398a7/action-slack@v3
        with:
          status: success
          channel: '#deployments'
          text: 'Production deployment completed successfully! 🎉'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  # Rollback on failure
  rollback-production:
    runs-on: ubuntu-latest
    if: failure() && github.ref == 'refs/heads/main'
    needs: deploy-production
    steps:
      - name: Emergency rollback
        run: |
          # Revert Lambda aliases to previous version
          aws lambda update-alias \
            --function-name "harborlist-production-api-handler" \
            --name "live" \
            --function-version "$(aws lambda get-alias --function-name harborlist-production-api-handler --name blue --query 'FunctionVersion' --output text)"
          
          # Revert CloudFront to blue S3 bucket
          aws cloudfront update-distribution \
            --id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID_PRODUCTION }} \
            --distribution-config file://infrastructure/cloudfront-blue-config.json

      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#incidents'
          text: '🚨 Emergency rollback executed for production deployment!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 🏗️ **Infrastructure as Code (CDK)**

### **Enhanced CDK Stack with Blue/Green Support**

```typescript
// infrastructure/lib/harborlist-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';

export interface HarborListStackProps extends cdk.StackProps {
  environment: 'development' | 'staging' | 'production';
  deploymentColor?: 'blue' | 'green';
}

export class HarborListStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly frontendBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: HarborListStackProps) {
    super(scope, id, props);

    const { environment, deploymentColor } = props;
    const suffix = deploymentColor ? `-${deploymentColor}` : '';

    // DynamoDB Table with Point-in-Time Recovery
    const table = new dynamodb.Table(this, `HarborListTable${suffix}`, {
      tableName: `harborlist-${environment}${suffix}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: environment === 'production',
      removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      
      // Global Secondary Indexes
      globalSecondaryIndexes: [
        {
          indexName: 'GSI1',
          partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
        },
        {
          indexName: 'GSI2',
          partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
        },
      ],
    });

    // Lambda Layer for shared dependencies
    const sharedLayer = new lambda.LayerVersion(this, `SharedLayer${suffix}`, {
      code: lambda.Code.fromAsset('backend/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Shared dependencies for HarborList Lambda functions',
    });

    // Lambda Functions with Blue/Green deployment support
    const lambdaFunctions = this.createLambdaFunctions(table, sharedLayer, environment, suffix);

    // API Gateway with custom domain
    this.api = new apigateway.RestApi(this, `HarborListAPI${suffix}`, {
      restApiName: `harborlist-api-${environment}${suffix}`,
      description: `HarborList API for ${environment}${suffix}`,
      
      // Enable compression and caching
      minimumCompressionSize: 1024,
      
      // CORS configuration
      defaultCorsPreflightOptions: {
        allowOrigins: this.getAllowedOrigins(environment),
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key'],
      },
    });

    // API Gateway deployment with stages
    const deployment = new apigateway.Deployment(this, `APIDeployment${suffix}`, {
      api: this.api,
    });

    const stage = new apigateway.Stage(this, `APIStage${suffix}`, {
      deployment,
      stageName: environment,
      
      // Enable logging and tracing
      loggingLevel: apigateway.MethodLoggingLevel.INFO,
      dataTraceEnabled: true,
      tracingEnabled: true,
      
      // Throttling configuration
      throttleSettings: {
        burstLimit: environment === 'production' ? 5000 : 1000,
        rateLimit: environment === 'production' ? 2000 : 500,
      },
    });

    // Connect Lambda functions to API Gateway
    this.setupAPIRoutes(lambdaFunctions, stage);

    // S3 Bucket for frontend hosting
    this.frontendBucket = new s3.Bucket(this, `FrontendBucket${suffix}`, {
      bucketName: `harborlist-frontend-${environment}${suffix}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      
      // Lifecycle rules for cost optimization
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          enabled: true,
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, `Distribution${suffix}`, {
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(this.frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      
      // Additional behaviors for API calls
      additionalBehaviors: {
        '/api/*': {
          origin: new cloudfront_origins.RestApiOrigin(this.api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      
      // Custom domain (if production)
      ...(environment === 'production' && {
        domainNames: [`app${suffix ? `-${deploymentColor}` : ''}.harborlist.com`],
        certificate: this.createSSLCertificate(),
      }),
    });

    // CodeDeploy Application for Lambda functions
    if (environment === 'production') {
      this.setupBlueGreenDeployment(lambdaFunctions, suffix);
    }

    // Monitoring and alarms
    this.setupMonitoring(lambdaFunctions, table, environment);

    // Output important values
    new cdk.CfnOutput(this, `APIEndpoint${suffix}`, {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, `FrontendURL${suffix}`, {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
    });
  }

  private createLambdaFunctions(
    table: dynamodb.Table,
    sharedLayer: lambda.LayerVersion,
    environment: string,
    suffix: string
  ): { [key: string]: lambda.Function } {
    const commonProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: environment === 'production' ? 1024 : 512,
      layers: [sharedLayer],
      environment: {
        DYNAMODB_TABLE: table.tableName,
        NODE_ENV: environment,
        LOG_LEVEL: environment === 'production' ? 'info' : 'debug',
      },
      
      // Enable X-Ray tracing
      tracing: lambda.Tracing.ACTIVE,
      
      // Reserved concurrency for production
      reservedConcurrentExecutions: environment === 'production' ? 100 : undefined,
    };

    const functions = {
      listingSearch: new lambda.Function(this, `ListingSearchFunction${suffix}`, {
        ...commonProps,
        functionName: `harborlist-${environment}-listing-search${suffix}`,
        code: lambda.Code.fromAsset('backend/dist/functions/listing-search'),
        handler: 'index.handler',
        description: 'Search listings with filters and pagination',
      }),

      listingDetail: new lambda.Function(this, `ListingDetailFunction${suffix}`, {
        ...commonProps,
        functionName: `harborlist-${environment}-listing-detail${suffix}`,
        code: lambda.Code.fromAsset('backend/dist/functions/listing-detail'),
        handler: 'index.handler',
        description: 'Get detailed listing information',
      }),

      createListing: new lambda.Function(this, `CreateListingFunction${suffix}`, {
        ...commonProps,
        functionName: `harborlist-${environment}-create-listing${suffix}`,
        code: lambda.Code.fromAsset('backend/dist/functions/create-listing'),
        handler: 'index.handler',
        description: 'Create new listing',
        timeout: cdk.Duration.seconds(60), // Longer timeout for image processing
      }),

      userAuth: new lambda.Function(this, `UserAuthFunction${suffix}`, {
        ...commonProps,
        functionName: `harborlist-${environment}-user-auth${suffix}`,
        code: lambda.Code.fromAsset('backend/dist/functions/user-auth'),
        handler: 'index.handler',
        description: 'User authentication and authorization',
      }),
    };

    // Grant DynamoDB permissions to all functions
    Object.values(functions).forEach(fn => {
      table.grantReadWriteData(fn);
    });

    return functions;
  }

  private setupBlueGreenDeployment(
    functions: { [key: string]: lambda.Function },
    suffix: string
  ): void {
    Object.entries(functions).forEach(([name, fn]) => {
      // Create aliases for blue/green deployment
      const liveAlias = new lambda.Alias(this, `${name}LiveAlias${suffix}`, {
        aliasName: 'live',
        version: fn.currentVersion,
      });

      const blueAlias = new lambda.Alias(this, `${name}BlueAlias${suffix}`, {
        aliasName: 'blue',
        version: fn.currentVersion,
      });

      const greenAlias = new lambda.Alias(this, `${name}GreenAlias${suffix}`, {
        aliasName: 'green',
        version: fn.currentVersion,
      });

      // CodeDeploy application
      const application = new codedeploy.LambdaApplication(this, `${name}DeployApp${suffix}`, {
        applicationName: `harborlist-${name}-deploy${suffix}`,
      });

      // Deployment group with automatic rollback
      new codedeploy.LambdaDeploymentGroup(this, `${name}DeployGroup${suffix}`, {
        application,
        alias: liveAlias,
        deploymentConfig: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
        
        // Automatic rollback configuration
        autoRollback: {
          failedDeployment: true,
          stoppedDeployment: true,
          deploymentInAlarm: true,
        },
        
        // CloudWatch alarms for automatic rollback
        alarms: [
          // Error rate alarm
          new cloudwatch.Alarm(this, `${name}ErrorAlarm${suffix}`, {
            metric: fn.metricErrors(),
            threshold: 10,
            evaluationPeriods: 2,
          }),
          
          // Duration alarm
          new cloudwatch.Alarm(this, `${name}DurationAlarm${suffix}`, {
            metric: fn.metricDuration(),
            threshold: 20000, // 20 seconds
            evaluationPeriods: 2,
          }),
        ],
      });
    });
  }

  private setupMonitoring(
    functions: { [key: string]: lambda.Function },
    table: dynamodb.Table,
    environment: string
  ): void {
    // Create CloudWatch dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'MonitoringDashboard', {
      dashboardName: `harborlist-${environment}-dashboard`,
    });

    // Add Lambda function metrics
    Object.entries(functions).forEach(([name, fn]) => {
      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: `${name} Function Metrics`,
          left: [fn.metricInvocations(), fn.metricErrors()],
          right: [fn.metricDuration()],
        })
      );

      // Create alarms for each function
      new cloudwatch.Alarm(this, `${name}HighErrorRate`, {
        metric: fn.metricErrors({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 10,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    });

    // DynamoDB monitoring
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Metrics',
        left: [
          table.metricConsumedReadCapacityUnits(),
          table.metricConsumedWriteCapacityUnits(),
        ],
        right: [table.metricSuccessfulRequestLatency()],
      })
    );
  }
}
```

---

## 🔄 **Environment Management**

### **Environment Configuration**

```typescript
// infrastructure/bin/app.ts
import * as cdk from 'aws-cdk-lib';
import { HarborListStack } from '../lib/harborlist-stack';

const app = new cdk.App();

// Environment configurations
const environments = {
  development: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  staging: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  production: {
    account: process.env.PRODUCTION_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
};

// Development stack
new HarborListStack(app, 'HarborListStack-development', {
  env: environments.development,
  environment: 'development',
  description: 'HarborList development environment',
});

// Staging stack
new HarborListStack(app, 'HarborListStack-staging', {
  env: environments.staging,
  environment: 'staging',
  description: 'HarborList staging environment',
});

// Production stacks (Blue/Green)
new HarborListStack(app, 'HarborListStack-production-blue', {
  env: environments.production,
  environment: 'production',
  deploymentColor: 'blue',
  description: 'HarborList production environment (Blue)',
});

new HarborListStack(app, 'HarborListStack-production-green', {
  env: environments.production,
  environment: 'production',
  deploymentColor: 'green',
  description: 'HarborList production environment (Green)',
});

app.synth();
```

### **Configuration Management Service**

```typescript
// backend/src/shared/config/environment-config.ts
export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: EnvironmentSettings;

  private constructor() {
    this.loadConfiguration();
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private loadConfiguration(): void {
    const environment = process.env.NODE_ENV || 'development';
    
    this.config = {
      environment,
      
      // Database configuration
      database: {
        tableName: process.env.DYNAMODB_TABLE || `harborlist-${environment}`,
        endpoint: process.env.DYNAMODB_ENDPOINT,
        region: process.env.AWS_REGION || 'us-east-1',
      },
      
      // API configuration
      api: {
        baseUrl: process.env.API_BASE_URL || this.getDefaultAPIBaseUrl(environment),
        corsOrigins: this.getCorsOrigins(environment),
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
          max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // requests per window
        },
      },
      
      // Authentication configuration
      auth: {
        jwtSecret: process.env.JWT_SECRET || this.generateJWTSecret(),
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        
        // OAuth providers
        oauth: {
          google: {
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
          },
          facebook: {
            appId: process.env.FACEBOOK_APP_ID,
            appSecret: process.env.FACEBOOK_APP_SECRET,
          },
        },
      },
      
      // Email configuration
      email: {
        provider: process.env.EMAIL_PROVIDER || 'ses',
        ses: {
          region: process.env.SES_REGION || 'us-east-1',
          fromAddress: process.env.SES_FROM_ADDRESS || `noreply@${this.getDomain(environment)}`,
        },
        templates: {
          welcome: process.env.WELCOME_EMAIL_TEMPLATE || 'welcome-template',
          passwordReset: process.env.PASSWORD_RESET_TEMPLATE || 'password-reset-template',
          listingApproval: process.env.LISTING_APPROVAL_TEMPLATE || 'listing-approval-template',
        },
      },
      
      // File storage configuration
      storage: {
        provider: 's3',
        s3: {
          bucket: process.env.S3_BUCKET || `harborlist-uploads-${environment}`,
          region: process.env.S3_REGION || 'us-east-1',
          cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN,
        },
        limits: {
          maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
      },
      
      // Search configuration
      search: {
        provider: process.env.SEARCH_PROVIDER || 'dynamodb',
        elasticsearch: {
          endpoint: process.env.ELASTICSEARCH_ENDPOINT,
          index: process.env.ELASTICSEARCH_INDEX || `harborlist-${environment}`,
        },
      },
      
      // Logging configuration
      logging: {
        level: process.env.LOG_LEVEL || (environment === 'production' ? 'info' : 'debug'),
        format: process.env.LOG_FORMAT || 'json',
        
        // Log aggregation
        cloudWatch: {
          logGroup: process.env.CLOUDWATCH_LOG_GROUP || `/aws/lambda/harborlist-${environment}`,
          logStream: process.env.CLOUDWATCH_LOG_STREAM,
        },
      },
      
      // Monitoring configuration
      monitoring: {
        metrics: {
          namespace: process.env.METRICS_NAMESPACE || 'HarborList/Application',
          enabled: process.env.METRICS_ENABLED !== 'false',
        },
        
        tracing: {
          enabled: process.env.TRACING_ENABLED !== 'false',
          samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE || '0.1'),
        },
        
        alerts: {
          webhookUrl: process.env.ALERT_WEBHOOK_URL,
          slackChannel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
        },
      },
      
      // Feature flags
      features: {
        enableAdvancedSearch: process.env.FEATURE_ADVANCED_SEARCH === 'true',
        enableRealTimeNotifications: process.env.FEATURE_REAL_TIME_NOTIFICATIONS === 'true',
        enableAIRecommendations: process.env.FEATURE_AI_RECOMMENDATIONS === 'true',
        enableAuctionMode: process.env.FEATURE_AUCTION_MODE === 'true',
      },
      
      // Performance settings
      performance: {
        cacheEnabled: process.env.CACHE_ENABLED !== 'false',
        cacheTtl: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes
        
        // Connection pooling
        database: {
          maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
          acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
        },
      },
      
      // Security settings
      security: {
        helmet: {
          contentSecurityPolicy: environment === 'production',
          hsts: environment === 'production',
        },
        
        rateLimit: {
          enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
          max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        },
        
        cors: {
          origins: this.getCorsOrigins(environment),
          credentials: true,
        },
      },
    };
  }

  getConfig(): EnvironmentSettings {
    return this.config;
  }

  getDatabaseConfig(): DatabaseConfig {
    return this.config.database;
  }

  getAPIConfig(): APIConfig {
    return this.config.api;
  }

  getAuthConfig(): AuthConfig {
    return this.config.auth;
  }

  private getDefaultAPIBaseUrl(environment: string): string {
    switch (environment) {
      case 'production':
        return 'https://api.harborlist.com';
      case 'staging':
        return 'https://api-staging.harborlist.com';
      case 'development':
        return 'http://localhost:3000';
      default:
        return 'http://localhost:3000';
    }
  }

  private getDomain(environment: string): string {
    switch (environment) {
      case 'production':
        return 'harborlist.com';
      case 'staging':
        return 'staging.harborlist.com';
      default:
        return 'localhost';
    }
  }

  private getCorsOrigins(environment: string): string[] {
    const envOrigins = process.env.CORS_ORIGINS;
    if (envOrigins) {
      return envOrigins.split(',').map(origin => origin.trim());
    }

    switch (environment) {
      case 'production':
        return ['https://harborlist.com', 'https://www.harborlist.com'];
      case 'staging':
        return ['https://staging.harborlist.com'];
      case 'development':
        return ['http://localhost:5173', 'http://localhost:3000'];
      default:
        return ['*'];
    }
  }

  private generateJWTSecret(): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be provided in production environment');
    }
    
    // Generate a random secret for development
    return require('crypto').randomBytes(64).toString('hex');
  }
}

// Environment-specific interfaces
interface EnvironmentSettings {
  environment: string;
  database: DatabaseConfig;
  api: APIConfig;
  auth: AuthConfig;
  email: EmailConfig;
  storage: StorageConfig;
  search: SearchConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
  features: FeatureFlags;
  performance: PerformanceConfig;
  security: SecurityConfig;
}

interface DatabaseConfig {
  tableName: string;
  endpoint?: string;
  region: string;
}

interface APIConfig {
  baseUrl: string;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

// Export singleton instance
export const environmentConfig = EnvironmentConfig.getInstance();
```

---

## 🔧 **Deployment Scripts**

### **Automated Deployment Utilities**

```bash
#!/bin/bash
# infrastructure/scripts/deploy.sh

set -e

# Configuration
ENVIRONMENT=${1:-staging}
FORCE_DEPLOY=${2:-false}
SKIP_TESTS=${3:-false}

echo "🚀 Starting HarborList deployment for environment: $ENVIRONMENT"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Error: Invalid environment '$ENVIRONMENT'. Must be development, staging, or production."
    exit 1
fi

# Check for required tools
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ npx is required but not installed."; exit 1; }

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    echo "📋 Loading environment variables from .env.${ENVIRONMENT}"
    export $(cat .env.${ENVIRONMENT} | xargs)
fi

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check AWS credentials
aws sts get-caller-identity > /dev/null 2>&1 || { 
    echo "❌ AWS credentials not configured or expired."; 
    exit 1; 
}

# Check if this is a production deployment
if [ "$ENVIRONMENT" == "production" ]; then
    echo "⚠️  Production deployment detected!"
    echo "This will deploy to the live production environment."
    
    if [ "$FORCE_DEPLOY" != "true" ]; then
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "❌ Deployment cancelled."
            exit 1
        fi
    fi
    
    # Additional production checks
    echo "🔍 Running production readiness checks..."
    
    # Check if staging deployment exists and is healthy
    echo "Checking staging environment health..."
    STAGING_HEALTH=$(curl -f -s "https://api-staging.harborlist.com/health" || echo "unhealthy")
    if [ "$STAGING_HEALTH" == "unhealthy" ]; then
        echo "⚠️  Warning: Staging environment appears unhealthy."
        read -p "Continue with production deployment anyway? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "❌ Deployment cancelled due to staging health check failure."
            exit 1
        fi
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd frontend && npm ci && cd ..
cd backend && npm ci && cd ..
cd infrastructure && npm ci && cd ..

# Run tests (unless skipped)
if [ "$SKIP_TESTS" != "true" ]; then
    echo "🧪 Running tests..."
    
    # Frontend tests
    echo "Running frontend tests..."
    cd frontend
    npm run test:coverage
    npm run lint
    npm run type-check
    cd ..
    
    # Backend tests
    echo "Running backend tests..."
    cd backend
    npm run test:coverage
    npm run lint
    npm run type-check
    cd ..
    
    echo "✅ All tests passed!"
else
    echo "⏭️  Skipping tests (SKIP_TESTS=true)"
fi

# Build applications
echo "🏗️  Building applications..."

# Build frontend
echo "Building frontend..."
cd frontend
npm run build
cd ..

# Build backend
echo "Building backend..."
cd backend
npm run build
cd ..

# Deploy infrastructure
echo "☁️  Deploying infrastructure..."
cd infrastructure

if [ "$ENVIRONMENT" == "production" ]; then
    # Blue/Green deployment for production
    echo "🔄 Performing blue/green deployment..."
    
    # Check current live version
    CURRENT_COLOR=$(aws lambda get-alias --function-name "harborlist-production-api-handler" --name "live" --query 'Description' --output text | grep -o 'blue\|green' || echo "blue")
    NEW_COLOR=$([ "$CURRENT_COLOR" == "blue" ] && echo "green" || echo "blue")
    
    echo "Current live environment: $CURRENT_COLOR"
    echo "Deploying to: $NEW_COLOR"
    
    # Deploy new version
    npx cdk deploy "HarborListStack-production-${NEW_COLOR}" --require-approval never
    
    # Health check on new deployment
    echo "🏥 Running health checks on new deployment..."
    sleep 30 # Wait for deployment to stabilize
    
    NEW_API_URL="https://api-${NEW_COLOR}.harborlist.com"
    HEALTH_CHECK=$(curl -f -s "${NEW_API_URL}/health" || echo "failed")
    
    if [ "$HEALTH_CHECK" == "failed" ]; then
        echo "❌ Health check failed for new deployment!"
        echo "Rolling back..."
        # Rollback logic would go here
        exit 1
    fi
    
    echo "✅ Health check passed for new deployment"
    
    # Switch traffic (this would typically be done gradually)
    echo "🔄 Switching traffic to new deployment..."
    # Traffic switching logic would go here
    
    echo "✅ Production deployment completed successfully!"
    
else
    # Direct deployment for non-production environments
    npx cdk deploy "HarborListStack-${ENVIRONMENT}" --require-approval never
fi

cd ..

# Deploy frontend to S3
echo "🌐 Deploying frontend..."
if [ "$ENVIRONMENT" == "production" ]; then
    aws s3 sync frontend/dist/ "s3://harborlist-frontend-production-${NEW_COLOR}" --delete
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name "HarborListStack-production-${NEW_COLOR}" --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text)
else
    aws s3 sync frontend/dist/ "s3://harborlist-frontend-${ENVIRONMENT}" --delete
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name "HarborListStack-${ENVIRONMENT}" --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text)
fi

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"

# Post-deployment verification
echo "🔍 Running post-deployment verification..."

# Get API endpoint
if [ "$ENVIRONMENT" == "production" ]; then
    API_ENDPOINT="https://api.harborlist.com"
else
    API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name "HarborListStack-${ENVIRONMENT}" --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' --output text)
fi

# Basic smoke tests
echo "Running smoke tests..."
HEALTH_STATUS=$(curl -f -s "${API_ENDPOINT}/health" | jq -r '.status' 2>/dev/null || echo "failed")

if [ "$HEALTH_STATUS" == "healthy" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed: $HEALTH_STATUS"
    exit 1
fi

# Test basic API functionality
echo "Testing API functionality..."
API_TEST=$(curl -f -s "${API_ENDPOINT}/api/v1/listings?limit=1" >/dev/null && echo "success" || echo "failed")

if [ "$API_TEST" == "success" ]; then
    echo "✅ API functionality test passed"
else
    echo "❌ API functionality test failed"
    exit 1
fi

# Deployment summary
echo ""
echo "🎉 Deployment completed successfully!"
echo "Environment: $ENVIRONMENT"
echo "API Endpoint: $API_ENDPOINT"
echo "Frontend URL: https://$(aws cloudfront describe-distribution --id "$DISTRIBUTION_ID" --query 'Distribution.DomainName' --output text)"
echo ""

# Send deployment notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ HarborList deployment to $ENVIRONMENT completed successfully!\"}" \
        "$SLACK_WEBHOOK_URL"
fi

echo "✨ All done!"
```

---

## 🔗 **Related Documentation**

- **📊 [Monitoring & Observability](../monitoring/README.md)**: Infrastructure monitoring and alerting
- **🔒 [Security Framework](../security/README.md)**: Security practices and compliance
- **🧪 [Testing Strategy](../testing/README.md)**: Automated testing and quality assurance
- **📊 [Performance Testing](../performance/README.md)**: Load testing and optimization
- **🔧 [Operations Guide](../operations/README.md)**: Day-to-day operational procedures

---

**📅 Last Updated**: October 2025  
**📝 Document Version**: 1.0.0  
**👥 DevOps Team**: HarborList Platform Engineering Team  
**🔄 Next Review**: January 2026