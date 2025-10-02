# 🚢 HarborList Marketplace

A comprehensive boat marketplace platform built as a modern, serverless web application. HarborList connects boat buyers and sellers through a robust, scalable platform with separate interfaces for public users and platform administrators.

## 📖 Quick Navigation

| Documentation | Description |
|---------------|-------------|
| **[🏗️ Architecture](./docs/architecture/README.md)** | Complete system architecture with professional diagrams |
| **[🔧 Backend Services](./docs/backend/README.md)** | Microservices documentation and API specifications |
| **[⚛️ Frontend App](./docs/frontend/README.md)** | React application architecture and components |
| **[🔧 Operations](./docs/operations/README.md)** | Infrastructure management and deployment procedures |
| **[🛡️ Security](./docs/security/README.md)** | Security framework and compliance documentation |
| **[🛠️ DevOps Tools](./docs/tools/README.md)** | 25+ automation scripts and operational tools |

> 💡 **New to the project?** Start with the [Architecture Documentation](./docs/architecture/README.md) for a comprehensive overview, then explore the specific areas relevant to your role.

## 🏗️ Architecture Overview

### Three-Tier Architecture
- **Frontend** - React/TypeScript SPA with Vite
- **Backend** - AWS Lambda microservices architecture  
- **Infrastructure** - AWS CDK for Infrastructure as Code

## 🛠️ Technology Stack

### Frontend (`frontend/`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS for responsive design
- **State Management**: TanStack React Query for server state
- **Routing**: React Router DOM v6
- **Testing**: Vitest, Testing Library, Cypress E2E
- **Charts**: Chart.js with React bindings

### Backend (`backend/`)
- **Runtime**: Node.js 18 with TypeScript
- **Architecture**: Microservices using AWS Lambda
- **Services**:
  - `auth-service` - User authentication & JWT management
  - `listing-service` - Boat listing CRUD operations
  - `admin-service` - Administrative functions & dashboard
  - `search` - Search functionality with filters
  - `media` - Image upload and processing
  - `email` - Notification services
  - `stats-service` - Analytics and reporting

### Infrastructure (`infrastructure/`)
- **IaC**: AWS CDK with TypeScript
- **Database**: DynamoDB with GSI indexes
- **Storage**: S3 for media and static hosting
- **API**: API Gateway REST API
- **Monitoring**: CloudWatch dashboards & alarms
- **Security**: IAM roles, Secrets Manager, audit logging
- **CDN**: Cloudflare integration

## 🎯 Key Features

### User-Facing Features
- **Boat Marketplace**: Browse, search, and filter boat listings
- **Listing Management**: Create, edit, and manage boat listings
- **Media Upload**: Multi-image upload with processing
- **Search & Filters**: Advanced filtering by location, price, type
- **User Authentication**: Secure JWT-based auth system

### Admin Features
- **Admin Dashboard**: Comprehensive platform management
- **User Management**: Monitor and manage user accounts  
- **Listing Oversight**: Review and moderate listings
- **Analytics**: Platform statistics and performance metrics
- **Audit Logging**: Complete action tracking for compliance
- **Security Monitoring**: Login attempts and session management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- AWS CLI configured
- AWS CDK CLI installed

> 📚 **Detailed Setup**: For comprehensive setup instructions, see the [Operations Guide](./docs/operations/README.md) and [Deployment Documentation](./docs/deployment/README.md).

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/felixep/harborlist-marketplace.git
   cd harborlist-marketplace
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend && npm install

   # Backend
   cd ../backend && npm install

   # Infrastructure
   cd ../infrastructure && npm install
   ```

3. **Deploy infrastructure**
   ```bash
   cd infrastructure
   npm run deploy:dev
   ```

4. **Start development servers**
   ```bash
   # Frontend (in frontend/)
   npm run dev

   # Backend testing (in backend/)
   npm run test
   ```

> 🛠️ **DevOps Tools**: Explore our [25+ automation scripts](./docs/tools/README.md) for deployment, monitoring, and maintenance tasks.

## 🔧 Development Commands

### Frontend
```bash
npm run dev          # Local development server
npm run build        # Production build
npm run build:dev    # Build for development
npm run build:staging # Build for staging
npm run build:prod  # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # ESLint checking
```

### Backend
```bash
npm run build        # Compile TypeScript and package lambdas
npm run package      # Create deployment packages
npm run test         # Run Jest tests
npm run lint         # ESLint checking
npm run create-admin # Create admin user
npm run clean        # Clean build artifacts
```

### Infrastructure
```bash
# Synthesis
npm run synth        # Generate CloudFormation
npm run synth:dev    # Generate for development
npm run synth:staging # Generate for staging
npm run synth:prod   # Generate for production

# Deployment
npm run deploy       # Deploy to AWS
npm run deploy:dev   # Deploy to development
npm run deploy:staging # Deploy to staging
npm run deploy:prod  # Deploy to production

# Validation
npm run validate     # Run all validation checks
npm run validate:all # Validate all environments
npm run test         # Run infrastructure tests
```

## 🌍 Environment Support

The application supports multiple deployment environments:

- **Development** (`dev`) - Local development with dev AWS resources
- **Staging** (`staging`) - Pre-production testing environment  
- **Production** (`prod`) - Live marketplace platform

### Environment Configuration
Each environment has its own:
- AWS resources with environment-specific naming
- Configuration settings and secrets
- Custom domain support (optional)
- Monitoring and alerting thresholds

## 🛡️ Security & Compliance

### Security Features
- JWT-based authentication with automatic expiration
- IAM roles with least-privilege access
- Audit logging for all admin actions
- Session management with automatic cleanup
- Rate limiting on login attempts
- Encrypted secrets management

### Database Security
- DynamoDB tables with proper access controls
- TTL settings for automatic data cleanup
- GSI indexes for efficient querying
- Backup and recovery strategies

## 📊 Monitoring & Observability

### CloudWatch Integration
- Real-time dashboards for system metrics
- Custom alarms for critical events
- Performance monitoring across all services
- Error tracking and automated alerts
- Cost monitoring and optimization

### Available Dashboards
- Lambda function performance metrics
- DynamoDB table performance metrics
- Security metrics (login attempts, sessions)
- Application performance monitoring

## 🔍 Performance & Testing

### Performance Features
- Cloudflare CDN integration for global performance
- Optimized Lambda cold start times
- Efficient DynamoDB query patterns
- Image optimization and compression
- Caching strategies

### Testing Strategy
- Unit tests for all services (Jest)
- Frontend component testing (Vitest)
- End-to-end testing (Cypress)
- Infrastructure testing (CDK tests)
- Performance testing automation

## 📁 Project Structure

```
harborlist-marketplace/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API services
│   │   ├── hooks/         # Custom React hooks
│   │   └── types/         # TypeScript type definitions
│   ├── cypress/           # E2E tests
│   └── public/            # Static assets
├── backend/               # Lambda microservices
│   ├── src/
│   │   ├── auth-service/  # Authentication service
│   │   ├── listing-service/ # Boat listings service
│   │   ├── admin-service/ # Admin dashboard service
│   │   ├── search/        # Search functionality
│   │   ├── media/         # Media upload service
│   │   ├── email/         # Email notifications
│   │   ├── stats-service/ # Analytics service
│   │   ├── shared/        # Shared utilities
│   │   └── types/         # Shared type definitions
│   └── scripts/           # Backend utility scripts
├── infrastructure/        # AWS CDK infrastructure
│   ├── lib/              # CDK stack definitions
│   ├── bin/              # CDK app entry point
│   ├── reports/          # Infrastructure reports
│   └── test/             # Infrastructure tests
├── tools/                # DevOps and operational tools
│   ├── deployment/       # Deployment scripts
│   ├── monitoring/       # Monitoring and health checks
│   ├── cost-management/  # Cost analysis and billing
│   ├── performance/      # Performance testing
│   ├── cloudflare/      # Cloudflare tunnel management
│   ├── utilities/       # General utilities
│   └── security/        # Security and validation
├── docs/                 # Comprehensive project documentation
│   ├── architecture/     # System architecture and design
│   ├── backend/          # Backend services documentation
│   ├── frontend/         # Frontend application documentation
│   ├── operations/       # Operations and infrastructure guide
│   ├── security/         # Security framework and compliance
│   ├── tools/            # DevOps tools documentation
│   ├── monitoring/       # Monitoring and observability
│   ├── deployment/       # Deployment procedures
│   ├── performance/      # Performance optimization
│   └── troubleshooting/  # Troubleshooting guides
└── certs/               # SSL certificates
```

## 📚 Comprehensive Documentation

This README provides a quick overview. For detailed information, explore our comprehensive documentation:

### 🏗️ **[Architecture Documentation](./docs/architecture/README.md)**
Complete system architecture with professional diagrams covering:
- **System Overview**: Multi-layer architecture with Mermaid diagrams
- **Microservices Design**: Service boundaries and communication patterns
- **Database Architecture**: DynamoDB schema and relationships
- **Security Architecture**: Multi-layer defense-in-depth model
- **Performance Architecture**: Scalability and optimization patterns
- **Data Flow Patterns**: Request lifecycle and authentication flows

### 🔧 **[Backend Services Documentation](./docs/backend/README.md)**
Detailed backend microservices documentation:
- **Service Architecture**: Lambda functions and API structure
- **Authentication System**: JWT, MFA, and session management
- **Database Design**: DynamoDB tables and access patterns
- **API Specifications**: Endpoint documentation and examples
- **Testing Strategy**: Unit tests and integration testing

### ⚛️ **[Frontend Application Documentation](./docs/frontend/README.md)**
Modern React application architecture:
- **Component Architecture**: Reusable UI components and patterns
- **State Management**: TanStack Query and React Context
- **Routing Strategy**: React Router and lazy loading
- **Performance Optimization**: Bundle splitting and caching
- **Testing Approach**: Unit, integration, and E2E testing

### 🔧 **[Operations & Infrastructure Guide](./docs/operations/README.md)**
Complete operational procedures and infrastructure management:
- **AWS Infrastructure**: CDK deployment and resource management
- **Environment Management**: Dev, staging, and production workflows
- **Monitoring Setup**: CloudWatch dashboards and alerting
- **Cost Management**: Budget monitoring and optimization
- **Incident Response**: On-call procedures and troubleshooting

### 🛡️ **[Security Framework Documentation](./docs/security/README.md)**
Comprehensive security implementation:
- **Defense-in-Depth Model**: Multi-layer security architecture
- **Authentication Standards**: JWT, MFA, and session security
- **Authorization Matrix**: Role-based access control (RBAC)
- **Data Protection**: Encryption and compliance standards
- **Security Monitoring**: Threat detection and incident response

### 🛠️ **[DevOps Tools Documentation](./docs/tools/README.md)**
25+ specialized automation scripts and tools:
- **[Deployment Tools](./docs/tools/deployment-scripts.md)**: Infrastructure deployment and verification
- **[Monitoring Tools](./docs/tools/monitoring-scripts.md)**: Health checks and performance tracking
- **[Cost Management Tools](./docs/tools/cost-management-scripts.md)**: Billing analysis and optimization
- **[Performance Tools](./docs/tools/performance-scripts.md)**: Load testing and benchmarking
- **[Cloudflare Tools](./docs/tools/cloudflare-scripts.md)**: CDN and tunnel management
- **[Security Tools](./docs/tools/security-scripts.md)**: Validation and compliance checking

### 📊 **Additional Documentation**
- **[Performance & Monitoring](./docs/performance/README.md)**: Optimization strategies and metrics
- **[Deployment Procedures](./docs/deployment/README.md)**: Step-by-step deployment guides
- **[Troubleshooting Guide](./docs/troubleshooting/README.md)**: Common issues and solutions

## 🚀 Deployment Infrastructure

### Automation Features
- Cloudflare Tunnel for secure connectivity
- Automated cost monitoring with alerts
- Performance testing with comprehensive reports
- Backup and rollback capabilities
- DNS performance optimization
- Multi-region deployment support

### DevOps Tools
The `tools/` directory contains categorized operational scripts:
- **Deployment**: CDK deployment and verification scripts
- **Monitoring**: Health checks, performance monitoring, environment reports
- **Cost Management**: AWS billing monitoring, cost analysis, budget alerts
- **Performance**: Load testing, DNS performance, comprehensive benchmarks
- **Cloudflare**: Tunnel management, cache control, resilience testing
- **Utilities**: General maintenance, validation, and helper scripts
- **Security**: Infrastructure validation, compliance checking

## 📈 Current Status

✅ **Production Ready** - The platform is in an advanced state with:
- Complete infrastructure setup with CDK
- Full admin dashboard implementation  
- Comprehensive monitoring and alerting
- Multi-environment deployment pipeline
- Security and audit logging systems
- Performance testing and validation
- **Professional documentation** with Mermaid diagrams and comprehensive guides

### 📊 Documentation Metrics
- **8 major documentation sections** with detailed guides
- **25+ DevOps automation scripts** with full documentation
- **Professional architecture diagrams** using Mermaid
- **Complete API documentation** and examples
- **Step-by-step operational procedures**

> 📚 **Documentation Quality**: All ASCII diagrams have been replaced with professional Mermaid diagrams for better readability and maintainability.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🆘 Support & Resources

### 📚 Documentation Resources
- **Architecture Questions**: See [Architecture Documentation](./docs/architecture/README.md)
- **Deployment Issues**: Check [Operations Guide](./docs/operations/README.md)
- **Development Setup**: Review [Backend](./docs/backend/README.md) and [Frontend](./docs/frontend/README.md) docs
- **Security Concerns**: Consult [Security Framework](./docs/security/README.md)
- **Operational Tasks**: Use [DevOps Tools](./docs/tools/README.md)

### 🔧 Troubleshooting
1. Check the [Troubleshooting Guide](./docs/troubleshooting/README.md)
2. Review relevant documentation sections
3. Use the automated diagnostic tools in `tools/`
4. Contact the HarborList development team

---

**HarborList Marketplace** - Connecting boat enthusiasts worldwide through a modern, secure, and scalable platform.

> 💡 **Tip**: This README provides an overview. For detailed information on any aspect of the system, explore the comprehensive documentation in the [`docs/`](./docs/) directory.