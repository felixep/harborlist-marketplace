# Changelog

All notable changes to the @harborlist/shared-types package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-11

### Added

#### Multi-Engine Boat Support
- **Engine Interface**: Complete engine specifications with type, horsepower, fuel type, hours, manufacturer, model, condition, and position fields
- **Enhanced BoatDetails**: Extended interface to include engines array, totalHorsepower calculation, and engineConfiguration
- **EnhancedListing Interface**: Extended base Listing with engines, SEO slug, and moderation workflow properties
- **Backward Compatibility**: Legacy single engine format (`engine`, `hours`) maintained alongside new multi-engine support

#### User Tier and Membership Management
- **UserTier Interface**: Comprehensive tier system with features, limits, and pricing structure
- **TierFeature Interface**: Individual feature definitions with limits and enablement status
- **UserLimits Interface**: Feature limits including max listings, images, priority placement, and premium features
- **UserCapability Interface**: Granular feature control with expiration and metadata support
- **EnhancedUser Interface**: Extended User with userType, membershipDetails, capabilities, and billing information
- **SalesUser Interface**: Sales-specific user type with customer assignments, targets, and commission tracking
- **Enhanced UserRole Enum**: Added SALES role for sales team members
- **Enhanced AdminPermission Enum**: Added TIER_MANAGEMENT, CAPABILITY_ASSIGNMENT, BILLING_MANAGEMENT, and SALES_MANAGEMENT permissions

#### Financial Management and Billing
- **BillingAccount Interface**: Complete billing account management with subscription support, payment history, and tax information
- **FinanceCalculation Interface**: Boat loan calculator with payment schedules, sharing capabilities, and lender information
- **PaymentScheduleItem Interface**: Individual payment schedule entries with principal, interest, and balance tracking
- **Enhanced Transaction Interface**: Extended with new transaction types (membership, subscription), metadata, and billing account references
- **DisputeCase Interface**: Complete dispute management extending DisputedTransaction with case tracking, evidence, and resolution
- **DisputeEvidence Interface**: Evidence submission tracking with file support and categorization
- **Enhanced FinancialReport Interface**: Extended with additional report types, JSON format support, filters, and summary statistics

#### Content Moderation Workflow
- **ModerationWorkflow Interface**: Comprehensive listing review process with queue management, priority, and escalation support
- **ModerationNotes Interface**: Detailed reviewer feedback with public/internal notes separation and confidence tracking
- **ModerationQueue Interface**: Queue configuration with filters, auto-assignment, and SLA management
- **Enhanced ModerationStats Interface**: Extended statistics with moderator workload, flag type breakdown, and SLA compliance tracking
- **Enhanced ContentFlag Interface**: Extended with additional flag types (misleading, copyright), status tracking, and resolution support

### Enhanced
- **Transaction Interface**: Added new transaction types (membership, subscription), enhanced status options, and metadata support
- **FinancialReport Interface**: Added subscription and membership report types, JSON format support, and summary statistics
- **ContentFlag Interface**: Added new flag types and status tracking for better moderation workflow

### Testing
- **Comprehensive Test Suite**: 76 test cases covering all new interfaces and enums
- **100% Code Coverage**: Complete validation of all type definitions, constraints, and backward compatibility
- **Type Compatibility Tests**: Ensures all enhanced interfaces properly extend base types without breaking changes

### Documentation
- **Updated Architecture Documentation**: Enhanced shared-types.md with new type categories and examples
- **Test Documentation**: Comprehensive README.md in __tests__ directory documenting all test coverage
- **Migration Guide**: Clear guidance on backward compatibility and new feature adoption

## [1.0.0] - 2024-12-XX

### Added
- Initial release of shared types package
- Core domain types (User, Listing, BoatDetails, Location, Review)
- Authentication types (AuthSession, LoginAttempt, AuditLog)
- API response types (ApiResponse, ErrorResponse)
- Admin and analytics types
- Platform settings and configuration types
- Support ticket management types
- Financial management types (Transaction, FinancialSummary, PaymentProcessor)
- Content moderation types (ContentFlag, FlaggedListing, ModerationDecision)
- NPM workspace integration
- TypeScript compilation with both ESM and CommonJS outputs