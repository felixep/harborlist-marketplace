# Enhanced API Endpoints Documentation

## Overview

This document covers the new and enhanced API endpoints added as part of the boat marketplace enhancements, including multi-engine support, user tier management, billing, finance calculations, and content moderation.

## Authentication

All enhanced endpoints use JWT authentication with role-based access control.

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

## Enhanced Listing Endpoints

### Multi-Engine Listing Creation

**POST** `/listings`

Creates a new boat listing with multi-engine support.

#### Request Body
```json
{
  "title": "2024 Sea Ray Sundancer 350",
  "description": "Beautiful twin-engine cruiser with premium amenities",
  "price": 275000,
  "location": {
    "city": "Miami",
    "state": "FL",
    "zipCode": "33101"
  },
  "boatDetails": {
    "year": 2024,
    "make": "Sea Ray",
    "model": "Sundancer 350",
    "length": 35,
    "beam": 11.5,
    "draft": 3.2
  },
  "engines": [
    {
      "type": "outboard",
      "manufacturer": "Yamaha",
      "model": "F300",
      "horsepower": 300,
      "fuelType": "gasoline",
      "hours": 150,
      "year": 2024,
      "condition": "excellent",
      "position": 1
    },
    {
      "type": "outboard", 
      "manufacturer": "Yamaha",
      "model": "F300",
      "horsepower": 300,
      "fuelType": "gasoline",
      "hours": 150,
      "year": 2024,
      "condition": "excellent",
      "position": 2
    }
  ],
  "features": ["GPS", "Radar", "Autopilot"],
  "images": ["image1.jpg", "image2.jpg"]
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "listingId": "listing_123",
    "slug": "2024-sea-ray-sundancer-350-twin-yamaha-f300",
    "status": "pending_review",
    "totalHorsepower": 600,
    "engineConfiguration": "twin",
    "moderationStatus": {
      "status": "pending_review",
      "queuePosition": 5,
      "estimatedReviewTime": "2-4 hours"
    },
    "createdAt": 1698765432000
  }
}
```

### SEO-Friendly Listing Retrieval

**GET** `/listings/{slug}`

Retrieves a listing by its SEO-friendly slug.

#### Response
```json
{
  "success": true,
  "data": {
    "listingId": "listing_123",
    "slug": "2024-sea-ray-sundancer-350-twin-yamaha-f300",
    "title": "2024 Sea Ray Sundancer 350",
    "engines": [
      {
        "engineId": "engine_456",
        "type": "outboard",
        "manufacturer": "Yamaha",
        "model": "F300",
        "horsepower": 300,
        "position": 1
      }
    ],
    "totalHorsepower": 600,
    "engineConfiguration": "twin",
    "status": "active",
    "views": 1250
  }
}
```

## User Tier Management Endpoints

### Get User Profile with Tier Information

**GET** `/users/profile`

Retrieves the current user's profile including tier and capability information.

#### Response
```json
{
  "success": true,
  "data": {
    "userId": "user_789",
    "email": "john@example.com",
    "name": "John Smith",
    "userType": "premium_individual",
    "membershipDetails": {
      "plan": "Premium Individual",
      "features": ["priority_placement", "enhanced_analytics", "extended_photos"],
      "limits": {
        "maxListings": 10,
        "maxImages": 20,
        "featuredListings": 2
      },
      "expiresAt": 1701357432000,
      "autoRenew": true
    },
    "capabilities": [
      {
        "feature": "priority_placement",
        "enabled": true,
        "expiresAt": 1701357432000
      }
    ]
  }
}
```

### Premium Membership Upgrade

**POST** `/users/upgrade`

Upgrades a user to premium membership.

#### Request Body
```json
{
  "plan": "premium_individual",
  "billingCycle": "monthly",
  "paymentMethodId": "pm_123456789"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_987654321",
    "plan": "premium_individual",
    "status": "active",
    "nextBillingDate": 1701357432000,
    "features": ["priority_placement", "enhanced_analytics"],
    "activatedAt": 1698765432000
  }
}
```

## Finance Calculator Endpoints

### Calculate Loan Payments

**POST** `/finance/calculate`

Calculates loan payments for a boat purchase.

#### Request Body
```json
{
  "boatPrice": 275000,
  "downPayment": 55000,
  "interestRate": 6.5,
  "termMonths": 180
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "calculationId": "calc_456789",
    "boatPrice": 275000,
    "downPayment": 55000,
    "loanAmount": 220000,
    "interestRate": 6.5,
    "termMonths": 180,
    "monthlyPayment": 1923.45,
    "totalInterest": 126221.00,
    "totalCost": 401221.00,
    "paymentSchedule": [
      {
        "month": 1,
        "payment": 1923.45,
        "principal": 730.12,
        "interest": 1193.33,
        "balance": 219269.88
      }
    ]
  }
}
```

### Save Calculation

**POST** `/finance/save`

Saves a finance calculation for future reference.

#### Request Body
```json
{
  "calculationId": "calc_456789",
  "name": "Sea Ray Sundancer Financing",
  "listingId": "listing_123"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "savedCalculationId": "saved_calc_789",
    "name": "Sea Ray Sundancer Financing",
    "saved": true,
    "savedAt": 1698765432000
  }
}
```

### Share Calculation

**POST** `/finance/share`

Creates a shareable link for a finance calculation.

#### Request Body
```json
{
  "calculationId": "calc_456789",
  "shareType": "public"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "shareId": "share_abc123",
    "shareUrl": "https://harborlist.com/shared/calculations/share_abc123",
    "expiresAt": 1701357432000,
    "shareType": "public"
  }
}
```

## Billing Management Endpoints

### Get Billing Account

**GET** `/billing/account`

Retrieves the user's billing account information.

#### Response
```json
{
  "success": true,
  "data": {
    "billingId": "billing_123",
    "userId": "user_789",
    "paymentMethods": [
      {
        "id": "pm_123456789",
        "type": "card",
        "last4": "4242",
        "brand": "visa",
        "expiryMonth": 12,
        "expiryYear": 2025,
        "isDefault": true
      }
    ],
    "subscriptions": [
      {
        "id": "sub_987654321",
        "plan": "premium_individual",
        "status": "active",
        "amount": 1999,
        "currency": "usd",
        "nextBillingDate": 1701357432000
      }
    ],
    "balance": 0
  }
}
```

### Process Payment

**POST** `/billing/payment-method`

Adds a new payment method to the user's account.

#### Request Body
```json
{
  "paymentMethodId": "pm_new123456",
  "setAsDefault": true
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "paymentMethodId": "pm_new123456",
    "added": true,
    "isDefault": true,
    "addedAt": 1698765432000
  }
}
```

## Admin Endpoints

### User Tier Management

**PUT** `/admin/users/{userId}/tier`

Updates a user's tier and capabilities (Admin only).

#### Request Body
```json
{
  "userType": "premium_dealer",
  "capabilities": [
    {
      "feature": "bulk_operations",
      "enabled": true,
      "limits": {
        "maxBulkSize": 50
      }
    }
  ],
  "reason": "Customer upgrade request"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "userId": "user_789",
    "previousType": "individual",
    "newType": "premium_dealer",
    "capabilitiesUpdated": 3,
    "effectiveAt": 1698765432000,
    "auditLogId": "audit_456"
  }
}
```

### Content Moderation Queue

**GET** `/admin/moderation/queue`

Retrieves the content moderation queue (Moderator+ only).

#### Query Parameters
- `status`: pending, in_review, approved, rejected
- `priority`: high, medium, low
- `assignedTo`: moderator user ID
- `limit`: number of results (default: 20)
- `offset`: pagination offset

#### Response
```json
{
  "success": true,
  "data": {
    "queue": [
      {
        "queueId": "queue_123",
        "listingId": "listing_456",
        "submittedBy": "user_789",
        "assignedTo": "moderator_101",
        "priority": "medium",
        "status": "pending",
        "flags": ["new_listing"],
        "submittedAt": 1698765432000,
        "listing": {
          "title": "2024 Sea Ray Sundancer 350",
          "engines": [
            {
              "type": "outboard",
              "horsepower": 300,
              "manufacturer": "Yamaha"
            }
          ],
          "totalHorsepower": 600
        }
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### Moderation Decision

**POST** `/admin/moderation/decision`

Makes a moderation decision on a listing (Moderator+ only).

#### Request Body
```json
{
  "queueId": "queue_123",
  "decision": "approve",
  "notes": "Listing meets all quality standards. Engines properly documented.",
  "publicNotes": "Your listing has been approved and is now live."
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "queueId": "queue_123",
    "listingId": "listing_456",
    "decision": "approve",
    "moderatedBy": "moderator_101",
    "moderatedAt": 1698765432000,
    "listingStatus": "active",
    "notificationSent": true
  }
}
```

## Sales Role Endpoints

### Get Assigned Customers

**GET** `/sales/customers`

Retrieves customers assigned to the sales representative.

#### Response
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "userId": "user_789",
        "name": "John Smith",
        "email": "john@example.com",
        "userType": "individual",
        "assignedAt": 1698765432000,
        "lastContact": 1698851832000,
        "accountValue": 1999,
        "nextRenewal": 1701357432000,
        "opportunities": ["premium_upgrade"]
      }
    ],
    "summary": {
      "totalCustomers": 25,
      "totalValue": 49975,
      "upcomingRenewals": 8,
      "opportunities": 12
    }
  }
}
```

### Update Customer Plan

**PUT** `/sales/customers/{userId}/plan`

Updates a customer's plan configuration (Sales role only).

#### Request Body
```json
{
  "plan": "premium_dealer",
  "billingCycle": "annual",
  "discount": 10,
  "reason": "Annual plan discount promotion"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "userId": "user_789",
    "previousPlan": "individual",
    "newPlan": "premium_dealer",
    "discountApplied": 10,
    "effectiveAt": 1698765432000,
    "nextBillingDate": 1730301432000
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid engine configuration",
    "details": {
      "field": "engines[0].horsepower",
      "reason": "Horsepower must be a positive number"
    },
    "requestId": "req_123456789"
  }
}
```

### Enhanced Error Codes
- `MULTI_ENGINE_VALIDATION_ERROR`: Engine configuration issues
- `TIER_LIMIT_EXCEEDED`: User tier limits exceeded
- `PREMIUM_MEMBERSHIP_REQUIRED`: Feature requires premium membership
- `MODERATION_QUEUE_FULL`: Too many pending listings
- `BILLING_ACCOUNT_SUSPENDED`: Payment issues
- `CALCULATION_SAVE_FAILED`: Finance calculation save error
- `INSUFFICIENT_SALES_PERMISSIONS`: Sales role permission denied

## Rate Limiting

Enhanced rate limiting based on user tiers:

- **Individual Users**: 100 requests/minute
- **Premium Users**: 200 requests/minute
- **Dealers**: 300 requests/minute
- **Premium Dealers**: 500 requests/minute
- **Admin Users**: 1000 requests/minute

## Webhooks

### Moderation Status Updates
```json
{
  "event": "listing.moderation.approved",
  "data": {
    "listingId": "listing_123",
    "slug": "2024-sea-ray-sundancer-350",
    "status": "active",
    "moderatedAt": 1698765432000
  }
}
```

### Billing Events
```json
{
  "event": "subscription.renewed",
  "data": {
    "userId": "user_789",
    "subscriptionId": "sub_987654321",
    "plan": "premium_individual",
    "amount": 1999,
    "nextBillingDate": 1701357432000
  }
}
```

For more detailed API documentation and examples, refer to the interactive API documentation at `/docs/api/interactive`.