# 🏗️ Shared Types Architecture

HarborList uses **NPM workspaces** with a centralized shared types package to ensure type safety and consistency across all services.

## 📦 Package Structure

```
harborlist-marketplace/
├── package.json                          # Root workspace configuration
├── frontend/                             # React application
│   ├── package.json                      # Depends on @harborlist/shared-types
│   └── src/
│       └── services/api.ts              # Uses shared types for API calls
├── backend/                              # Node.js Lambda services
│   ├── package.json                      # Depends on @harborlist/shared-types
│   └── src/
│       ├── auth-service/index.ts        # Uses shared User, UserStatus types
│       ├── listing/index.ts             # Uses shared Listing types
│       └── stats-service/index.ts       # Uses shared API response types
└── packages/
    └── shared-types/                     # Centralized type definitions
        ├── package.json                  # @harborlist/shared-types package
        ├── src/
        │   ├── index.ts                  # Main export file
        │   └── common.ts                 # Domain types and enums
        ├── dist/                         # Compiled JavaScript (runtime enums)
        └── types/                        # TypeScript declarations
```

## 🎯 Design Principles

### 1. **Single Source of Truth**
All TypeScript interfaces, enums, and API response types are defined once in `packages/shared-types/src/common.ts`.

### 2. **Runtime & Compile-time Support**
```typescript
// Runtime enum usage (JavaScript)
import { UserStatus } from '@harborlist/shared-types';
const status = UserStatus.ACTIVE; // 'active'

// Type-safe interfaces (TypeScript)
import type { User, APIResponse } from '@harborlist/shared-types';
const user: User = { id: '123', name: 'John', status: UserStatus.ACTIVE };
```

### 3. **Workspace Integration**
NPM workspaces automatically link dependencies during development:
```json
{
  "workspaces": [
    "frontend",
    "backend", 
    "packages/*"
  ]
}
```

## 🔧 Development Workflow

### Adding New Types

1. **Define types in shared package**:
   ```typescript
   // packages/shared-types/src/common.ts
   export enum BoatType {
     SAILBOAT = 'sailboat',
     MOTORBOAT = 'motorboat',
     YACHT = 'yacht'
   }

   export interface Boat {
     id: string;
     type: BoatType;
     name: string;
     year: number;
   }
   ```

2. **Build shared types**:
   ```bash
   cd packages/shared-types
   npm run build
   ```

3. **Use in frontend**:
   ```typescript
   // frontend/src/components/BoatCard.tsx
   import type { Boat, BoatType } from '@harborlist/shared-types';
   
   interface Props {
     boat: Boat;
   }
   ```

4. **Use in backend**:
   ```typescript
   // backend/src/listing/index.ts
   import { Boat, BoatType } from '@harborlist/shared-types';
   
   const createBoat = (data: Partial<Boat>): Boat => {
     return {
       id: generateId(),
       type: BoatType.SAILBOAT,
       ...data
     };
   };
   ```

### Hot Reload Support

The workspace configuration enables **hot reload across packages**:

- ✅ Change shared types → Frontend rebuilds automatically
- ✅ Change shared types → Backend restarts with new types  
- ✅ TypeScript errors surface immediately in both services

## 📋 Type Categories

### Core Domain Types
```typescript
// User management
export interface User { /* ... */ }
export interface EnhancedUser extends User { /* Enhanced with tiers and capabilities */ }
export interface SalesUser extends EnhancedUser { /* Sales-specific properties */ }
export enum UserStatus { ACTIVE = 'active', PENDING = 'pending' }
export enum UserRole { USER = 'user', ADMIN = 'admin', SALES = 'sales' }

// Listings with Multi-Engine Support
export interface Listing { /* ... */ }
export interface EnhancedListing extends Listing { /* Multi-engine and SEO support */ }
export interface Engine { /* Multi-engine boat specifications */ }
export interface BoatDetails { /* Enhanced with engines array */ }

// Reviews
export interface Review { /* ... */ }
```

### Enhanced Feature Types (v1.1.0)

#### Multi-Engine Boat Support
```typescript
export interface Engine {
  engineId: string;
  type: 'outboard' | 'inboard' | 'sterndrive' | 'jet' | 'electric' | 'hybrid';
  manufacturer?: string;
  model?: string;
  horsepower: number;
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  hours?: number;
  condition: 'excellent' | 'good' | 'fair' | 'needs_work';
  position: number; // 1, 2, 3 for multiple engines
}

export interface EnhancedListing extends Listing {
  slug: string; // SEO-friendly URL slug
  engines: Engine[]; // Multi-engine support
  totalHorsepower: number; // Calculated total horsepower
  engineConfiguration: 'single' | 'twin' | 'triple' | 'quad';
}
```

#### User Tier and Membership Management
```typescript
export interface UserTier {
  tierId: string;
  name: string;
  type: 'individual' | 'dealer';
  isPremium: boolean;
  features: TierFeature[];
  limits: UserLimits;
  pricing: { monthly?: number; yearly?: number; currency: string; };
}

export interface EnhancedUser extends User {
  userType: 'individual' | 'dealer' | 'premium_individual' | 'premium_dealer';
  membershipDetails: {
    plan?: string;
    tierId?: string;
    features: string[];
    limits: UserLimits;
    expiresAt?: number;
    autoRenew: boolean;
  };
  capabilities: UserCapability[];
  premiumActive: boolean;
}
```

#### Financial Management and Billing
```typescript
export interface BillingAccount {
  billingId: string;
  userId: string;
  customerId?: string; // Payment processor customer ID
  plan: string;
  amount: number;
  status: 'active' | 'past_due' | 'canceled' | 'suspended' | 'trialing';
  nextBillingDate?: number;
  paymentHistory: Transaction[];
}

export interface FinanceCalculation {
  calculationId: string;
  listingId: string;
  boatPrice: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  paymentSchedule?: PaymentScheduleItem[];
}
```

#### Content Moderation Workflow
```typescript
export interface ModerationWorkflow {
  queueId: string;
  listingId: string;
  submittedBy: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  flags: ContentFlag[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested';
  moderationNotes?: ModerationNotes;
  escalated: boolean;
}

export interface ModerationNotes {
  reviewerId: string;
  reviewerName: string;
  decision: 'approve' | 'reject' | 'request_changes';
  reason: string;
  publicNotes?: string; // Notes visible to listing owner
  internalNotes?: string; // Notes only visible to moderators
  confidence: 'low' | 'medium' | 'high'; // Moderator confidence in decision
}
```

### API Response Types
```typescript
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}
```

### Authentication Types
```typescript
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginResult {
  user: User;
  tokens: AuthTokens;
  session: AuthSession;
}
```

## 🚀 Production Benefits

### Type Safety Across Services
- **Compile-time validation**: TypeScript catches type mismatches
- **Runtime validation**: Shared enums prevent string literal errors
- **API consistency**: Request/response types match between frontend and backend

### Development Efficiency  
- **IntelliSense support**: Full autocomplete across all services
- **Refactoring safety**: Rename types updates all usages automatically
- **Single package updates**: Change types once, affects all consumers

### Build Optimization
```json
{
  "scripts": {
    "build": "tsc && npm run build:cjs",
    "build:cjs": "tsc --module commonjs --outDir dist/cjs"
  }
}
```

Generates both ESM and CommonJS outputs for maximum compatibility.

## 🔄 Migration Guide

### From Copied Types to Shared Package

**Before** (Type duplication):
```
frontend/src/types/user.ts     # Duplicate User interface
backend/src/types/user.ts      # Duplicate User interface  
```

**After** (Shared package):
```
packages/shared-types/src/common.ts    # Single User interface
frontend/package.json                  # Depends on @harborlist/shared-types
backend/package.json                   # Depends on @harborlist/shared-types
```

### Update Process:
1. Move all common types to `packages/shared-types/src/common.ts`
2. Add workspace dependency: `"@harborlist/shared-types": "*"`
3. Update imports: `import type { User } from '@harborlist/shared-types'`
4. Build shared types: `npm run build`
5. Test all services for type compatibility

## 📊 Monitoring & Maintenance

### Build Health Checks
```bash
# Verify workspace linking
npm ls @harborlist/shared-types

# Check type compilation
cd packages/shared-types && npm run build

# Validate cross-service usage
npm run type-check --workspaces
```

### Version Management
The shared types package uses workspace versioning:
- Development: `"@harborlist/shared-types": "*"` (always latest local)
- Production: `"@harborlist/shared-types": "^1.0.0"` (semantic versioning)

## 🆕 Recent Enhancements (v1.1.0)

### Multi-Engine Boat Support
- **Engine Interface**: Complete engine specifications with type, horsepower, fuel type, and position
- **Enhanced BoatDetails**: Backward-compatible extension supporting both legacy single engine and new multi-engine formats
- **EnhancedListing**: SEO-friendly listings with multi-engine support and moderation workflow integration

### User Tier Management
- **UserTier System**: Comprehensive tier management with features, limits, and pricing
- **EnhancedUser**: Extended user profiles with membership details, capabilities, and billing information
- **SalesUser**: Sales team specific user type with customer assignments and targets

### Financial Management
- **BillingAccount**: Complete billing account management with subscription support
- **FinanceCalculation**: Boat loan calculator with payment schedules and sharing capabilities
- **Enhanced Transaction**: Extended transaction types including membership and subscription payments
- **Dispute Management**: Complete dispute case management with evidence tracking

### Content Moderation
- **ModerationWorkflow**: Comprehensive listing review process with queue management
- **ModerationNotes**: Detailed reviewer feedback with public/internal notes separation
- **Enhanced ContentFlag**: Extended flag types with status tracking and resolution

### Testing Coverage
- **76 Test Cases**: Complete test coverage for all new type definitions
- **100% Code Coverage**: Comprehensive validation of interfaces, enums, and constraints
- **Backward Compatibility**: All existing types remain fully compatible

### Migration Notes
All enhancements maintain **backward compatibility**:
- Legacy `BoatDetails.engine` field still supported alongside new `engines` array
- Existing `User` interface works with new `EnhancedUser` extensions
- Original `Listing` interface compatible with `EnhancedListing` features

## 🔗 Related Documentation

- [NPM Workspaces Documentation](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Local Development Guide](../deployment/local-development.md)
- [Backend Architecture](../backend/README.md)
- [Frontend Architecture](../frontend/README.md)
- [Boat Marketplace Enhancements Spec](../../.kiro/specs/boat-marketplace-enhancements/)