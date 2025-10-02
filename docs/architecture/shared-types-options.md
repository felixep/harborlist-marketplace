# Shared Types Package Structure
shared-types/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Re-export all types
│   ├── common.ts         # Common types
│   ├── api.ts           # API-specific types
│   └── admin.ts         # Admin-specific types
└── dist/                # Compiled output

# Benefits:
✅ Single source of truth
✅ Versioned releases
✅ Type safety across projects
✅ Can be published to npm registry
✅ Clear dependency management

### **Option 2: Monorepo Structure**

```
harborlist-marketplace/
├── packages/
│   ├── shared-types/     # Shared TypeScript definitions
│   ├── frontend/         # React frontend
│   ├── backend/          # Node.js backend
│   └── infrastructure/   # AWS CDK
├── package.json          # Root workspace config
└── tsconfig.json        # Root TypeScript config
```

Benefits:
✅ All code in one repository
✅ Shared dependencies
✅ Cross-package imports
✅ Unified build process
✅ Easy local development

### **Option 3: Build-Time Type Generation**

Generate TypeScript definitions from backend at build time:

```bash
# Extract types from backend
npm run extract-types  # → generates shared-types.d.ts
# Copy to frontend during build
npm run build:frontend
```

Benefits:
✅ Always in sync
✅ Automated process
✅ No manual copying
✅ Backend is source of truth