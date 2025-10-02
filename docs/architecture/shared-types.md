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
export enum UserStatus { ACTIVE = 'active', PENDING = 'pending' }

// Listings
export interface Listing { /* ... */ }  
export enum ListingStatus { ACTIVE = 'active', SOLD = 'sold' }

// Reviews
export interface Review { /* ... */ }
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

## 🔗 Related Documentation

- [NPM Workspaces Documentation](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Local Development Guide](../deployment/local-development.md)
- [Backend Architecture](../backend/README.md)
- [Frontend Architecture](../frontend/README.md)