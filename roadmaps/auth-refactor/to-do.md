Refactor the current project to integrate **AWS Cognito** with a **dual-user architecture (Customer & Staff)**, maintaining clean separation of authentication, authorization, and infrastructure concerns — leveraging **Agentic AI / MCP** for automation, documentation updates, and code generation.

---

### 🏗️ Current Environment

* **Backend:** Node.js + TypeScript
* **Infrastructure:** AWS CDK (multi-env: dev/staging/prod)
* **Local Development:** Docker Compose
* **Current Auth:** Custom authentication/authorization system
* **Admin Interface:** Already implemented (for staff management) — must be reused, **not duplicated**

---

### 👥 User Types & Role Structure

#### **Customers**

* **Individual**
* **Dealer**
* **Premium** (inherits Individual/Dealer base roles, adds premium features & permissions)

#### **Staff**

* **Super Admin**
* **Admin**
* **Manager (by Team)**
* **Team Member**

Staff permissions (unchanged, may be extended):

* `user_management` – manage users, roles, and accounts
* `content_moderation` – moderate listings & user content
* `financial_access` – access financial data & reports
* `system_config` – manage system settings
* `analytics_view` – view analytics & metrics
* `audit_log_view` – review activity logs
* `tier_management` – manage customer tiers & memberships
* `billing_management` – manage billing & subscriptions
* `sales_management` – manage sales operations

---

### 🔐 Refactoring Objectives

1. **Implement Dual Cognito User Pools**

   * **Customer Pool:** for Individuals, Dealers, Premiums
   * **Staff Pool:** for internal users (linked to existing admin UI)
   * Independent password & MFA policies per pool
   * Role mapping via Cognito Groups or custom JWT claims

2. **Authentication & Authorization Design**

   * Distinct login endpoints/routes (`/auth/customer/*` vs `/auth/staff/*`)
   * Separate token issuance and validation flows
   * Reuse existing admin interface for staff auth / RBAC management
   * Premium-customer logic integrated into the customer pool
   * Implement least-privilege RBAC and scoped API access

3. **Infrastructure & Configuration**

   * Define both pools and associated resources in **AWS CDK** (TypeScript) for AWS environment
   * Environment-specific configuration via context variables
   * **LocalStack** support for local auth testing
   * Add custom resource roles and Lambda triggers (e.g., PreSignUp, PostAuth) if required

4. **Security Best Practices**

   * Enforce MFA for staff and optional for customers
   * Use shorter session TTL for staff tokens
   * Role-based JWT claims and API Gateway authorizers
   * Audit logging by user type (CloudWatch / OpenSearch logs)
   * Route-level rate limiting per pool

5. **Documentation & MCP Integration**

   * Automatically update existing project documentation (Markdown + README) with:

     * Auth flow diagrams
     * CDK resource definitions (User Pools, Identity Pools, Groups)
     * Role hierarchies and permissions matrix
     * Environment variable layout and policy references
   * Include in MCP server’s model context for agentic refactors
   * Generate TypeScript interfaces and YAML/JSON policy files for authorization

---

### 🤖 Expected Deliverables (Agentic AI Output)

**1. Architecture Plan**

* Visual diagram of dual Cognito architecture
* Data flow between user types → Cognito → API Gateway → Lambda → DynamoDB

**2. CDK Implementation Snippets**

* Cognito User Pool definitions (for Customer and Staff)
* Cognito Groups / Roles / Policies
* API Gateway Authorizer bindings
* Environment config constructs and LocalStack setup

**3. Updated Auth Flows & Docs**

* Login sequence for customers vs staff
* Token exchange / refresh logic
* MFA and session handling strategy

**4. Role & Permission Mappings**

* JSON/YAML definitions for Agentic validation (`roles.json`, `policies.yaml`)
* Premium customer tier capabilities added

**5. Updated Project Documentation**

* Consolidated existing documentation with new auth architecture section
* Per-environment setup instructions (LocalStack → Dev → Prod)
* Security and policy notes referenced from Cognito console/CDK

---

### 🧩 Agentic AI Behavior Directives

* **Analyze** existing codebase and infrastructure definitions to identify auth-related modules.
* **Refactor** to implement dual Cognito pools and updated authorization logic in TypeScript services.
* **Update** documentation and README automatically upon refactor completion.
* **Generate** modular CDK constructs for both pools with clear naming conventions (e.g., `CustomerAuthStack`, `StaffAuthStack`).
* **Respect** existing environment differentiation to make sure the codebase is good for local docker compose environment or AWS environments. 
* **Preserve** the existing admin UI and integrate new Cognito-based auth logic without duplication.
* **Produce** all outputs as ready-to-commit files (`.ts`, `.md`, `.json`, `.yaml`) for the repository.

--- 

