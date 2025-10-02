# 🚢 HarborList Marketplace

A comprehensive boat marketplace platform built as a modern, serverless web application. HarborList connects boat buyers and sellers through a robust, scalable platform with separate interfaces for public users and platform administrators.

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
│   └── scripts/           # Utility scripts
├── infrastructure/        # AWS CDK infrastructure
│   ├── lib/              # CDK stack definitions
│   ├── bin/              # CDK app entry point
│   ├── scripts/          # Deployment scripts
│   ├── reports/          # Infrastructure reports
│   └── test/             # Infrastructure tests
└── certs/                # SSL certificates
```

## 🚀 Deployment Infrastructure

### Automation Features
- Cloudflare Tunnel for secure connectivity
- Automated cost monitoring with alerts
- Performance testing with comprehensive reports
- Backup and rollback capabilities
- DNS performance optimization
- Multi-region deployment support

### Monitoring Scripts
The `infrastructure/scripts/` directory contains various automation scripts:
- Cost analysis and monitoring
- Performance testing
- Cloudflare tunnel management
- AWS billing monitoring
- Development environment validation

## 📈 Current Status

✅ **Production Ready** - The platform is in an advanced state with:
- Complete infrastructure setup with CDK
- Full admin dashboard implementation  
- Comprehensive monitoring and alerting
- Multi-environment deployment pipeline
- Security and audit logging systems
- Performance testing and validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For support and questions, please contact the HarborList development team.

---

**HarborList Marketplace** - Connecting boat enthusiasts worldwide through a modern, secure, and scalable platform.