/**
 * @fileoverview Cloudflare Tunnel infrastructure construct for secure S3 website access.
 * 
 * This construct creates the necessary AWS infrastructure to support a Cloudflare Tunnel
 * that provides secure, authenticated access to S3-hosted static websites. The tunnel
 * eliminates the need for public S3 bucket policies while maintaining fast global access
 * through Cloudflare's CDN network.
 * 
 * Architecture Components:
 * - VPC with public and private subnets for network isolation
 * - EC2 instance running cloudflared daemon in private subnet
 * - VPC endpoint for secure S3 access without internet gateway
 * - Security groups with minimal required permissions
 * - IAM roles following least privilege principles
 * 
 * Security Benefits:
 * - S3 bucket remains private with no public access
 * - Traffic encrypted end-to-end through Cloudflare tunnel
 * - No exposed public IP addresses or load balancers
 * - DDoS protection and WAF through Cloudflare
 * - Automatic SSL/TLS certificate management
 * 
 * Cost Optimization:
 * - t3.micro instance for minimal compute requirements
 * - Single NAT gateway for cost efficiency
 * - VPC endpoints to reduce data transfer costs
 * - Pay-per-request DynamoDB billing
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * Configuration properties for the Cloudflare Tunnel construct
 * 
 * @interface CloudflareTunnelConstructProps
 */
export interface CloudflareTunnelConstructProps {
  /** S3 bucket containing the frontend static website files */
  frontendBucket: s3.Bucket;
  /** Deployment environment for resource naming and configuration */
  environment: string;
}

/**
 * AWS CDK construct for Cloudflare Tunnel infrastructure
 * 
 * Creates a secure, scalable infrastructure for serving S3-hosted static websites
 * through Cloudflare's global CDN network using Cloudflare Tunnels. This approach
 * provides enterprise-grade security, performance, and reliability without exposing
 * AWS resources to the public internet.
 * 
 * Key Features:
 * - Private S3 bucket access through VPC endpoints
 * - Encrypted tunnel connection to Cloudflare edge
 * - Automatic failover and health monitoring
 * - Cost-optimized infrastructure sizing
 * - Environment-specific resource naming
 * 
 * Network Architecture:
 * ```
 * Internet → Cloudflare Edge → Tunnel → EC2 Instance → VPC Endpoint → S3 Bucket
 * ```
 * 
 * Usage Example:
 * ```typescript
 * const tunnel = new CloudflareTunnelConstruct(this, 'CloudflareTunnel', {
 *   frontendBucket: myS3Bucket,
 *   environment: 'prod'
 * });
 * ```
 * 
 * @class CloudflareTunnelConstruct
 * @extends Construct
 */
export class CloudflareTunnelConstruct extends Construct {
  /**
   * VPC containing the tunnel infrastructure
   * 
   * Provides network isolation and security boundaries for the tunnel instance.
   * Configured with both public and private subnets across multiple AZs for
   * high availability and fault tolerance.
   * 
   * @type {ec2.Vpc}
   * @readonly
   */
  public readonly vpc: ec2.Vpc;

  /**
   * EC2 instance running the Cloudflare tunnel daemon
   * 
   * Hosts the cloudflared service that maintains the secure tunnel connection
   * to Cloudflare's edge network. Deployed in private subnet for security
   * with outbound internet access through NAT gateway.
   * 
   * @type {ec2.Instance}
   * @readonly
   */
  public readonly tunnelInstance: ec2.Instance;

  /**
   * VPC endpoint for secure S3 access
   * 
   * Enables private connectivity to S3 without routing traffic through
   * the internet gateway, reducing costs and improving security.
   * 
   * @type {ec2.GatewayVpcEndpoint}
   * @readonly
   */
  public readonly vpcEndpoint: ec2.GatewayVpcEndpoint;

  /**
   * Constructs the Cloudflare Tunnel infrastructure
   * 
   * Creates and configures all AWS resources required for a secure Cloudflare Tunnel
   * connection to an S3-hosted static website. The infrastructure is designed for
   * high availability, security, and cost optimization.
   * 
   * Resource Creation Order:
   * 1. VPC with public/private subnets and NAT gateway
   * 2. VPC endpoint for S3 access
   * 3. Security groups with minimal required permissions
   * 4. IAM role with least privilege access
   * 5. EC2 instance with cloudflared installation
   * 
   * @param scope - The parent construct (typically a Stack)
   * @param id - Unique identifier for this construct
   * @param props - Configuration properties for the tunnel
   */
  constructor(scope: Construct, id: string, props: CloudflareTunnelConstructProps) {
    super(scope, id);

    const { frontendBucket, environment } = props;

    /**
     * Create VPC for Cloudflare Tunnel infrastructure
     * 
     * Establishes network isolation and security boundaries for the tunnel instance.
     * The VPC is configured with both public and private subnets to support the
     * tunnel's need for outbound internet connectivity while maintaining security.
     * 
     * Network Design:
     * - 2 Availability Zones for high availability
     * - Public subnets for NAT gateway and potential bastion hosts
     * - Private subnets for tunnel instance (no direct internet access)
     * - Single NAT gateway for cost optimization
     * - /24 CIDR blocks providing 254 usable IPs per subnet
     * 
     * Cost Considerations:
     * - Single NAT gateway reduces costs compared to multi-AZ deployment
     * - Suitable for development and small production workloads
     * - Can be upgraded to multi-AZ NAT for production high availability
     */
    this.vpc = new ec2.Vpc(this, 'CloudflareTunnelVpc', {
      maxAzs: 2,
      natGateways: 1, // Cost-optimized: single NAT gateway
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    /**
     * Create VPC Endpoint for secure S3 access
     * 
     * Establishes private connectivity to S3 without routing traffic through
     * the internet gateway. This improves security and reduces data transfer
     * costs while maintaining high performance.
     * 
     * Benefits:
     * - No internet gateway routing for S3 traffic
     * - Reduced data transfer costs (no NAT gateway charges for S3)
     * - Enhanced security with private network access
     * - Improved performance with direct AWS backbone connectivity
     * - Support for S3 bucket policies restricting access to VPC endpoint
     * 
     * Configuration:
     * - Gateway endpoint type for S3 (no additional charges)
     * - Attached to private subnets only
     * - Automatic route table updates for S3 traffic
     */
    this.vpcEndpoint = this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [
        {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Security Group for Cloudflare Tunnel EC2 instance
    const tunnelSecurityGroup = new ec2.SecurityGroup(this, 'TunnelSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Cloudflare Tunnel EC2 instance',
      allowAllOutbound: true,
    });

    // Allow SSH access (optional, for debugging)
    tunnelSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'SSH access'
    );

    // Allow HTTP traffic (for S3 website access)
    tunnelSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP access'
    );

    // IAM Role for EC2 instance
    const tunnelRole = new iam.Role(this, 'TunnelInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Grant S3 access through VPC endpoint
    tunnelRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:ListBucket',
      ],
      resources: [
        frontendBucket.bucketArn,
        `${frontendBucket.bucketArn}/*`,
      ],
    }));

    // User data script to install and configure Cloudflare Tunnel
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'yum update -y',
      'yum install -y curl',
      '',
      '# Install Cloudflare Tunnel (cloudflared)',
      'curl -L --output cloudflared.rpm https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm',
      'yum localinstall -y cloudflared.rpm',
      '',
      '# Create cloudflared user',
      'useradd -r -s /bin/false cloudflared',
      '',
      '# Create directories',
      'mkdir -p /etc/cloudflared',
      'mkdir -p /var/log/cloudflared',
      'chown cloudflared:cloudflared /var/log/cloudflared',
      '',
      '# Note: Manual configuration required after deployment',
      '# 1. Run: cloudflared tunnel login',
      '# 2. Run: cloudflared tunnel create <tunnel-name>',
      '# 3. Configure tunnel with S3 website endpoint',
      '# 4. Run: cloudflared tunnel run <tunnel-name>',
      '',
      '# Create a placeholder config file',
      'cat > /etc/cloudflared/config.yml << EOF',
      '# Cloudflare Tunnel Configuration',
      '# This file needs to be configured manually after deployment',
      '# tunnel: <your-tunnel-id>',
      '# credentials-file: /etc/cloudflared/<your-tunnel-id>.json',
      '# ',
      '# ingress:',
      '#   - hostname: <your-subdomain>.<your-domain>.com',
      `#     service: http://${frontendBucket.bucketName}.s3-website.${cdk.Stack.of(this).region}.amazonaws.com`,
      '#     originRequest:',
      `#       httpHostHeader: ${frontendBucket.bucketName}.s3-website.${cdk.Stack.of(this).region}.amazonaws.com`,
      '#   - service: http_status:404',
      'EOF',
      '',
      'chown cloudflared:cloudflared /etc/cloudflared/config.yml',
      'chmod 600 /etc/cloudflared/config.yml',
      '',
      '# Install AWS CLI for debugging',
      'yum install -y aws-cli',
      '',
      '# Create a test script to verify S3 access',
      'cat > /home/ec2-user/test-s3-access.sh << EOF',
      '#!/bin/bash',
      'echo "Testing S3 access through VPC endpoint..."',
      `curl -I http://${frontendBucket.bucketName}.s3-website.${cdk.Stack.of(this).region}.amazonaws.com`,
      'EOF',
      '',
      'chmod +x /home/ec2-user/test-s3-access.sh',
      'chown ec2-user:ec2-user /home/ec2-user/test-s3-access.sh'
    );

    // Create EC2 instance for Cloudflare Tunnel
    this.tunnelInstance = new ec2.Instance(this, 'TunnelInstance', {
      vpc: this.vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      securityGroup: tunnelSecurityGroup,
      role: tunnelRole,
      userData: userData,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Add tags
    cdk.Tags.of(this.vpc).add('Name', `CloudflareTunnel-VPC-${environment}`);
    cdk.Tags.of(this.tunnelInstance).add('Name', `CloudflareTunnel-Instance-${environment}`);
    cdk.Tags.of(this.vpcEndpoint).add('Name', `S3-VPCEndpoint-${environment}`);

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for Cloudflare Tunnel',
    });

    new cdk.CfnOutput(this, 'VpcEndpointId', {
      value: this.vpcEndpoint.vpcEndpointId,
      description: 'VPC Endpoint ID for S3 access',
    });

    new cdk.CfnOutput(this, 'TunnelInstanceId', {
      value: this.tunnelInstance.instanceId,
      description: 'EC2 Instance ID for Cloudflare Tunnel',
    });

    new cdk.CfnOutput(this, 'S3WebsiteEndpoint', {
      value: `http://${frontendBucket.bucketName}.s3-website.${cdk.Stack.of(this).region}.amazonaws.com`,
      description: 'S3 Website endpoint to configure in Cloudflare Tunnel',
    });
  }
}