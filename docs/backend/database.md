# 🗄️ Database Design & Architecture

## 📋 **Overview**

HarborList uses Amazon DynamoDB as the primary database, designed for high performance and scalability with a single-table design pattern optimized for serverless applications.

---

## 🏗️ **Database Schema**

### **DynamoDB Tables Structure**

#### **Users Table (boat-users)**
```typescript
interface User {
  userId: string;          // Primary Key
  email: string;           // GSI: email-index
  name: string;
  role: 'user' | 'admin';  // GSI: role-index
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  mfaSecret?: string;      // For admin MFA
  mfaEnabled: boolean;
}
```

**Global Secondary Indexes:**
- `email-index`: PK: email (for login lookups)
- `role-index`: PK: role, SK: createdAt (for admin filtering)

#### **Listings Table (harborlist-listings)**
```typescript
interface Listing {
  listingId: string;       // Primary Key
  ownerId: string;         // GSI: owner-index
  title: string;
  description: string;
  price: number;           // GSI: price-index
  status: 'active' | 'sold' | 'draft'; // GSI: status-index
  boatType: string;
  year: number;
  location: {
    state: string;         // GSI: location-index
    city: string;
    coordinates?: [number, number];
  };
  images: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Global Secondary Indexes:**
- `owner-index`: PK: ownerId, SK: createdAt
- `status-index`: PK: status, SK: updatedAt  
- `location-index`: PK: state, SK: city
- `price-index`: PK: priceRange, SK: price

#### **Audit Logs Table (boat-audit-logs)**
```typescript
interface AuditLog {
  logId: string;           // Primary Key
  userId: string;          // GSI: user-index
  action: string;          // GSI: action-index
  resource: string;        // GSI: resource-index
  resourceId?: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}
```

#### **Admin Sessions Table (boat-admin-sessions)**
```typescript
interface AdminSession {
  sessionId: string;       // Primary Key
  userId: string;          // GSI: user-index
  createdAt: string;
  lastActivity: string;
  expiresAt: number;       // TTL attribute
  ipAddress: string;
  userAgent: string;
}
```

---

## 🚀 **Performance Optimization**

### **Access Patterns**
1. **User Authentication**: Query by email (email-index)
2. **User Listings**: Query by ownerId (owner-index)
3. **Public Listings**: Query by status='active' (status-index)
4. **Location Search**: Query by state/city (location-index)
5. **Price Filtering**: Query by price range (price-index)

### **Query Optimization Strategies**
- **Single Table Design**: Minimize cross-table joins
- **Composite Keys**: Enable range queries and sorting
- **Sparse Indexes**: Reduce storage costs for optional attributes
- **Batch Operations**: Use BatchGetItem/BatchWriteItem for multiple records

### **Capacity Planning**
- **On-Demand Billing**: Automatic scaling based on traffic
- **Read/Write Patterns**: Optimized for read-heavy workloads
- **Hot Partition Avoidance**: Distributed key patterns

---

## 🔒 **Data Security & Compliance**

### **Encryption**
- **Encryption at Rest**: DynamoDB encryption using AWS KMS
- **Encryption in Transit**: All API calls use HTTPS/TLS 1.2
- **Field-level Encryption**: Sensitive data encrypted before storage

### **Access Control**
- **IAM Roles**: Least privilege access for Lambda functions
- **Resource Policies**: Fine-grained table access control
- **Audit Logging**: All data access logged for compliance

### **Data Privacy**
- **PII Protection**: Personal data encrypted and access logged
- **Data Retention**: Automated cleanup of expired sessions and logs
- **GDPR Compliance**: User data deletion and export capabilities

---

## 💾 **Backup & Recovery**

### **Backup Strategy**
- **Point-in-Time Recovery**: 35-day recovery window
- **On-Demand Backups**: Manual backups before major deployments
- **Cross-Region Backups**: Disaster recovery preparation

### **Recovery Procedures**
1. **Table Restoration**: Restore from point-in-time or backup
2. **Data Validation**: Verify data integrity post-recovery
3. **Application Testing**: Ensure functionality after restoration

---

## 📊 **Monitoring & Metrics**

### **CloudWatch Metrics**
- **ConsumedReadCapacityUnits**: Monitor read usage
- **ConsumedWriteCapacityUnits**: Monitor write usage
- **ThrottledRequests**: Track capacity limit hits
- **SuccessfulRequestLatency**: Monitor performance

### **Custom Metrics**
- **Query Performance**: Track slow queries (>100ms)
- **Hot Partitions**: Monitor for uneven access patterns
- **Error Rates**: Track failed database operations

---

## 🔄 **Migration & Scaling**

### **Data Migration Strategy**
- **Blue-Green Deployments**: Safe schema changes
- **Gradual Migration**: Incremental data transformation
- **Rollback Procedures**: Quick reversion capability

### **Scaling Considerations**
- **Auto Scaling**: Automatic capacity adjustment
- **Global Tables**: Multi-region replication for global users
- **Read Replicas**: Enhanced read performance for reporting

---

**📅 Last Updated**: October 2025  
**📝 Version**: 1.0.0  
**👥 Maintained By**: HarborList Development Team