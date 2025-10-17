# HarborList Marketplace - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed - 2025-10-17
- **BREAKING**: Migrated listing-service authentication to use Cognito token verification
  - Replaced JWT_SECRET-based verification with AWS Cognito JWKS
  - All authentication now consistently uses AWS Cognito dual pools
  - Made token verification functions properly async

### Removed - 2025-10-17
- Removed legacy JWT-based authentication system (auth-legacy.ts) - **583 lines**
- Removed unused API versioning system (versioning.ts) - **351 lines**
- Removed backup files (.backup extensions)
- Removed unused bcryptjs dependency (password hashing now via Cognito)
- Removed JWT_SECRET and JWT_REFRESH_SECRET environment variables
- Consolidated fix documentation into this CHANGELOG

### Summary
**Total code reduction:** ~1,200 lines removed
**Files cleaned:** 11 files deleted/consolidated
**Commits:** 6 cleanup commits with full traceability

---

## Major Implementation Milestones

### Authentication System Refactor - October 2024
- Migrated from custom JWT authentication to AWS Cognito
- Implemented dual User Pool architecture (Customer + Staff)
- Enhanced security with Cognito-managed tokens and MFA support
- See: `roadmaps/auth-refactor/` for detailed migration docs

### Real Data Implementation - Completed
- Replaced all mock data endpoints with actual DynamoDB queries
- Added 3 new tables: Platform Settings, Support Tickets, Announcements
- Implemented graceful error handling for missing tables
- 100% of endpoints now use real data persistence

### Admin Pages Enhancement
- Fixed admin authentication with Cognito integration
- Synchronized customer/admin user management
- Enhanced system health monitoring with real metrics
- Consolidated health check endpoints

### Content Moderation System
- Implemented moderation queue with approval workflow
- Added listing status management
- Enhanced content filtering and review capabilities

### System Health & Monitoring
- Consolidated health check systems
- Real-time metrics from DynamoDB and CloudWatch
- Enhanced API performance monitoring
- Improved error tracking and logging

---

## Historical Fix Summaries

The following documents have been archived as historical references:
- `docs/archive/ADMIN_PAGES_FIX_SUMMARY.md`
- `docs/archive/CONTENT_MODERATION_FIXES.md`
- `docs/archive/CUSTOMER_ADMIN_SYNC_SOLUTION.md`
- `docs/archive/CUSTOMER_REGISTRATION_SYNC.md`
- `docs/archive/REAL_DATA_IMPLEMENTATION_COMPLETE.md`
- `docs/archive/SYSTEM_HEALTH_CONSOLIDATION_SUMMARY.md`
- `docs/archive/SYSTEM_HEALTH_FIXES_SUMMARY.md`
- `docs/archive/ADDITIONAL_FIXES.md`
- `docs/archive/ENHANCED_SYSTEM_MONITORING_SUMMARY.md`

---

## Development Guidelines

### Adding New Entries
When making significant changes:
1. Add entry to `[Unreleased]` section
2. Use categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`
3. Reference issue/PR numbers when applicable
4. Be concise but descriptive

### Version Releases
When cutting a release:
1. Move unreleased changes to new version section
2. Add release date
3. Update version in package.json files
4. Tag git commit with version number
