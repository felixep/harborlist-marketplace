# Content Moderation Enhancement Proposal

**Status:** Draft  
**Created:** October 20, 2025  
**Last Updated:** October 20, 2025  
**Owner:** Engineering Team  
**Priority:** Medium-High  

---

## Executive Summary

This document outlines proposed enhancements to HarborList's automated content moderation system. The current implementation provides basic dictionary-based filtering. This proposal presents a phased roadmap for evolving the system into a sophisticated, AI-powered moderation platform that balances automation with human oversight.

**Current State:** Dictionary-based word filtering with manual moderator review  
**Proposed State:** Multi-layered AI-assisted moderation with intelligent automation  
**Timeline:** 6-12 months (3 phases)  
**Estimated Cost:** $15,000 - $30,000 (development + infrastructure)  

---

## Table of Contents

1. [Current System Analysis](#current-system-analysis)
2. [Proposed Enhancements](#proposed-enhancements)
3. [Phase 1: Enhanced Dictionary & Rules](#phase-1-enhanced-dictionary--rules)
4. [Phase 2: AI Integration](#phase-2-ai-integration)
5. [Phase 3: Advanced Features](#phase-3-advanced-features)
6. [Technical Architecture](#technical-architecture)
7. [Cost Analysis](#cost-analysis)
8. [Success Metrics](#success-metrics)
9. [Risk Assessment](#risk-assessment)
10. [Implementation Timeline](#implementation-timeline)

---

## Current System Analysis

### Strengths ✅
- **Fast**: < 10ms processing time
- **Free**: No API costs
- **Private**: Data stays on server
- **Predictable**: Known behavior
- **Simple**: Easy to maintain

### Limitations ❌
- **No context awareness**: Can't distinguish "This boat is sick!" (good) from actual illness
- **Manual maintenance**: Requires updating word lists
- **Limited scope**: Only catches exact matches
- **No learning**: Doesn't improve from moderator decisions
- **Language barrier**: English-only
- **False positives**: Legitimate uses of flagged words get caught

### Current Metrics (Baseline)
- **Scan time**: ~5-10ms per listing
- **False positive rate**: Unknown (needs tracking)
- **Coverage**: ~200 terms across 6 categories
- **Languages supported**: 1 (English)
- **Moderator burden**: 100% manual review of flags

---

## Proposed Enhancements

### Vision Statement
*"Create an intelligent, adaptive content moderation system that reduces moderator burden by 70% while improving detection accuracy by 50%, maintaining user privacy and platform safety."*

### Key Objectives
1. **Reduce false positives** by 60% through context-aware analysis
2. **Automate routine decisions** for 70% of clean listings
3. **Detect sophisticated scams** that evade dictionary filters
4. **Support multiple languages** for international expansion
5. **Learn from moderator feedback** to improve over time
6. **Maintain sub-100ms response times** for user experience

---

## Phase 1: Enhanced Dictionary & Rules Engine

**Timeline:** Months 1-2  
**Cost:** $5,000  
**Risk:** Low  

### 1.1 Enhanced Word Lists

**Boat-Specific Scam Patterns**
```typescript
boatScams: {
  high: [
    'boat located overseas',
    'escrow not needed',
    'pay with gift cards',
    'send deposit before viewing',
    'shipping from [nigeria|ghana|ukraine]',
    'bank transfer to foreign account',
    'documented but no paperwork',
    'coast guard documentation pending',
    'price too good to be true'
  ]
}
```

**Context-Aware Rules**
```typescript
contextRules: {
  allowList: [
    { word: 'sick', context: /sick (paint|color|design)/ }, // "sick paint job" = OK
    { word: 'killer', context: /killer (price|deal|whale watching)/ }, // "killer price" = OK
    { word: 'hell', context: /hell of a (boat|deal)/ } // "hell of a boat" = OK
  ]
}
```

**Pricing Anomaly Detection**
```typescript
suspiciousPricing: {
  // 2021 boat listed at $5,000? Flag for review
  yearPriceRatio: (year, price, boatType) => {
    const expectedPrice = getMarketValue(year, boatType);
    if (price < expectedPrice * 0.3) return 'high'; // 70% below market
    if (price > expectedPrice * 3) return 'medium'; // 3x market value
    return null;
  }
}
```

### 1.2 Pattern Detection

**Contact Info Scraping Prevention**
```typescript
patterns: {
  phoneNumbers: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  websites: /\b(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}\b/,
  socialMedia: /@[a-zA-Z0-9_]+/ // Instagram/Twitter handles
}
```

**Duplicate Detection**
```typescript
duplicateDetection: {
  // Check if listing text matches existing listings
  // Flag potential content theft or spam
  similarityThreshold: 0.85 // 85% similar = flag
}
```

### 1.3 Moderator Dashboard Enhancements

**Features:**
- Word list management UI
- Add/remove terms without code changes
- Category management
- Severity adjustment
- Whitelist management
- False positive tracking

**Mockup:**
```
┌─────────────────────────────────────────┐
│ Content Filter Management               │
├─────────────────────────────────────────┤
│ Category: [Profanity ▼]                │
│ Severity: [High ▼]                     │
│                                         │
│ Current Terms (24):                    │
│ ┌────────────────────────────────────┐ │
│ │ fuck        [Edit] [Remove]        │ │
│ │ shit        [Edit] [Remove]        │ │
│ │ ...                                │ │
│ └────────────────────────────────────┘ │
│                                         │
│ [+ Add New Term]                       │
│                                         │
│ Whitelist Contexts:                    │
│ ┌────────────────────────────────────┐ │
│ │ "sick paint job" - Allowed         │ │
│ │ [+ Add Context Exception]          │ │
│ └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 1.4 Analytics & Reporting

**Metrics Dashboard:**
- Total scans performed
- Violations by category
- False positive rate
- Top flagged terms
- Moderator approval/rejection rates
- Average review time

---

## Phase 2: AI Integration

**Timeline:** Months 3-6  
**Cost:** $12,000  
**Risk:** Medium  

### 2.1 AWS Comprehend Integration

**Toxicity Detection**
```typescript
import { ComprehendClient, DetectToxicContentCommand } from "@aws-sdk/client-comprehend";

async function analyzeWithAI(text: string) {
  const response = await comprehend.send(new DetectToxicContentCommand({
    TextSegments: [{ Text: text }],
    LanguageCode: 'en'
  }));
  
  return {
    toxicity: response.ResultList[0].Toxicity,
    categories: response.ResultList[0].Labels
  };
}
```

**Cost:** ~$0.0001 per request (~$10/month for 100k listings)

**Benefits:**
- Detects context and intent
- Identifies harassment, hate speech
- Multi-language support
- Sentiment analysis

### 2.2 Image Moderation

**AWS Rekognition Integration**
```typescript
async function moderateImages(imageUrls: string[]) {
  const results = await Promise.all(
    imageUrls.map(url => rekognition.detectModerationLabels({
      Image: { S3Object: { Bucket: 'harborlist-media', Key: url }}
    }))
  );
  
  return results.filter(r => 
    r.ModerationLabels.some(l => l.Confidence > 80)
  );
}
```

**Detects:**
- Explicit/suggestive content
- Violence/weapons
- Offensive gestures
- Inappropriate text in images
- Drugs/alcohol misuse

**Cost:** ~$0.001 per image (~$100/month for 100k images)

### 2.3 Scam Detection ML Model

**Custom Model Training**
```typescript
// Train on historical scam listings
const scamIndicators = {
  urgencyWords: ['act now', 'limited time', 'must sell today'],
  paymentRedFlags: ['wire transfer', 'western union', 'gift cards'],
  priceAnomalies: detectPriceOutliers(),
  contactPatterns: detectSuspiciousContact(),
  locationMismatches: detectLocationScams()
};

function calculateScamScore(listing: Listing): number {
  // Returns 0-100 scam probability score
  // 80+ = auto-flag for review
  // 95+ = auto-reject with appeal option
}
```

### 2.4 Intelligent Auto-Approval

**Safe to Auto-Approve if:**
```typescript
function canAutoApprove(listing: Listing, filterResult: FilterResult): boolean {
  return (
    filterResult.isClean &&
    listing.ownerReputation > 4.5 &&
    listing.ownerAccountAge > 90 && // 90 days
    listing.price < $500000 && // Not high-value
    !hasSuspiciousPatterns(listing) &&
    imagesPassModeration(listing.images)
  );
}
```

**Expected Impact:** Auto-approve 60-70% of clean listings

---

## Phase 3: Advanced Features

**Timeline:** Months 7-12  
**Cost:** $13,000  
**Risk:** Medium-High  

### 3.1 User Reputation System

**Trust Score Calculation**
```typescript
interface UserTrustScore {
  score: number; // 0-100
  factors: {
    accountAge: number;
    verifiedEmail: boolean;
    verifiedPhone: boolean;
    successfulTransactions: number;
    flaggedListings: number;
    reportedByUsers: number;
    responseRate: number;
    averageRating: number;
  }
}

function calculateTrustScore(userId: string): UserTrustScore {
  // Higher score = less moderation needed
  // < 30 = Enhanced scrutiny
  // 70+ = Fast-track approval
}
```

**Benefits:**
- Reduce moderation for trusted users
- Flag risky new accounts
- Identify serial scammers

### 3.2 Community Reporting

**User Flagging System**
```typescript
interface UserReport {
  reporterId: string;
  listingId: string;
  reason: 'scam' | 'inappropriate' | 'fake' | 'duplicate' | 'spam';
  description: string;
  evidence?: string[]; // Screenshot URLs
  timestamp: number;
}

// Auto-escalate if:
// - 3+ reports from different users
// - Report from verified high-trust user
// - Report includes evidence
```

**Anti-Abuse Measures:**
- Rate limit reports (5 per day)
- Track report accuracy
- Penalize false reporting
- Reward accurate reports

### 3.3 Real-Time Monitoring

**Live Listing Feed**
```typescript
// WebSocket-based moderator dashboard
interface LiveModerationFeed {
  newListings: Listing[];
  highPriorityFlags: Flag[];
  aiConfidenceScores: Map<string, number>;
  recommendedActions: ModerationAction[];
}

// Push notifications for:
// - High-risk listings (scam score > 90)
// - Multiple user reports
// - Repeated violators
```

### 3.4 Multi-Language Support

**Language Detection & Translation**
```typescript
import { TranslateClient } from "@aws-sdk/client-translate";

async function moderateMultiLanguage(listing: Listing) {
  // 1. Detect language
  const language = await detectLanguage(listing.description);
  
  // 2. Translate to English for moderation
  if (language !== 'en') {
    const translated = await translate(listing.description, language, 'en');
    
    // 3. Run moderation on translation
    const result = await filterContent(listing.title, translated);
    
    // 4. Store original + moderation results
  }
}
```

**Supported Languages:** EN, ES, FR, IT, DE, PT, NL

**Cost:** ~$0.000015 per character (~$50/month for translations)

### 3.5 Appeal System

**User Self-Service Appeals**
```typescript
interface ModerationAppeal {
  appealId: string;
  listingId: string;
  userId: string;
  reason: string;
  explanation: string;
  evidence?: string[];
  status: 'pending' | 'under_review' | 'approved' | 'denied';
  reviewedBy?: string;
  reviewedAt?: number;
  resolution?: string;
}

// Auto-grant appeals if:
// - User has high trust score
// - First offense
// - Minor violation (severity: low)

// Escalate to human if:
// - Repeat offender
// - High-severity violation
// - Disputed AI decision
```

---

## Technical Architecture

### Current Architecture
```
User creates listing
       ↓
Dictionary filter (sync)
       ↓
Add flags if violations
       ↓
Save to DynamoDB
       ↓
Manual moderator review
```

### Proposed Architecture (Phase 3)
```
User creates listing
       ↓
┌──────────────────────────────────────┐
│ Layer 1: Fast Dictionary Filter     │ (5ms)
│ - Basic profanity                    │
│ - Known scam patterns                │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ Layer 2: Pattern Analysis            │ (10ms)
│ - Pricing anomalies                  │
│ - Contact info extraction            │
│ - Duplicate detection                │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ Layer 3: AI Analysis (Async)         │ (100-500ms)
│ - AWS Comprehend (toxicity)          │
│ - Image moderation                   │
│ - ML scam detection                  │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ Layer 4: Risk Scoring                │ (5ms)
│ - User trust score                   │
│ - Content confidence                 │
│ - Combined risk assessment           │
└──────────────────────────────────────┘
       ↓
Decision Engine
       ↓
    ┌─────┴─────┐
    │           │
Auto-Approve  Queue for Review  Auto-Reject
  (70%)         (25%)              (5%)
```

### Infrastructure Requirements

**Additional Services:**
- AWS Comprehend (text analysis)
- AWS Rekognition (image moderation)
- AWS Translate (multi-language)
- AWS SageMaker (custom ML models)
- Lambda functions (async processing)
- SQS queues (job processing)
- EventBridge (workflow orchestration)

**Database Schema Additions:**
```typescript
// New tables
- moderation_analytics
- user_trust_scores
- moderation_appeals
- filter_whitelist
- community_reports

// New indexes
- listings_by_trust_score
- flagged_by_severity
- pending_appeals
```

---

## Cost Analysis

### Phase 1: Enhanced Dictionary
| Item | Cost |
|------|------|
| Development (2 weeks) | $4,000 |
| UI Development | $800 |
| Testing & QA | $200 |
| **Total** | **$5,000** |

**Ongoing Costs:** $0/month (no new infrastructure)

### Phase 2: AI Integration
| Item | Cost |
|------|------|
| Development (6 weeks) | $10,000 |
| AWS Comprehend | $10/month |
| AWS Rekognition | $100/month |
| Testing & QA | $2,000 |
| **Total** | **$12,000 + $110/month** |

### Phase 3: Advanced Features
| Item | Cost |
|------|------|
| Development (8 weeks) | $12,000 |
| AWS Translate | $50/month |
| SageMaker (ML) | $200/month |
| Additional Lambda | $50/month |
| Testing & QA | $1,000 |
| **Total** | **$13,000 + $300/month** |

### Total Investment
- **One-time:** $30,000
- **Monthly (Full System):** ~$410/month
- **Per-listing cost:** ~$0.004 (at 100k listings/month)

### ROI Analysis
**Assumptions:**
- Average moderator salary: $50,000/year ($4,167/month)
- Current moderation time: 5 min/listing
- Listings per month: 1,000
- Total moderation hours: 83 hours/month

**With Automation (70% auto-approved):**
- Listings needing review: 300/month
- Moderation hours: 25 hours/month
- **Savings: 58 hours/month = ~$1,350/month**

**Payback Period:** 22 months  
**3-Year ROI:** $17,640  

---

## Success Metrics

### Primary KPIs
| Metric | Current | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|--------|---------|----------------|----------------|----------------|
| Auto-approval rate | 0% | 10% | 50% | 70% |
| False positive rate | Unknown | < 15% | < 10% | < 5% |
| Avg moderation time | Unknown | -20% | -50% | -70% |
| User satisfaction | Baseline | +5% | +10% | +15% |
| Scam detection rate | Unknown | +20% | +50% | +75% |

### Secondary Metrics
- Time to first review: < 2 hours
- Appeal resolution time: < 24 hours
- Moderator satisfaction score: > 4/5
- False negative rate: < 2%
- System uptime: > 99.9%

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI false positives | High | Medium | Gradual rollout, human override |
| API downtime | Low | High | Fallback to dictionary, queue processing |
| Cost overruns | Medium | Medium | Usage caps, monitoring, optimization |
| Performance degradation | Low | High | Async processing, caching |
| Data privacy concerns | Low | Critical | On-premises ML option, data encryption |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User backlash (over-moderation) | Medium | High | Transparent appeals, clear guidelines |
| Moderator job concerns | Low | Medium | Redeploy to complex cases, training |
| Legal liability | Low | Critical | Consult legal, clear TOS, audit trails |
| Competitive pressure | Medium | Medium | Faster implementation timeline |

---

## Implementation Timeline

### Phase 1: Months 1-2
```
Week 1-2:  Enhanced word lists & patterns
Week 3-4:  Context-aware rules engine
Week 5-6:  Moderator management UI
Week 7-8:  Testing & deployment
```

### Phase 2: Months 3-6
```
Week 1-4:  AWS Comprehend integration
Week 5-8:  AWS Rekognition integration
Week 9-12: ML scam detection model
Week 13-16: Auto-approval logic
Week 17-20: Testing & gradual rollout
Week 21-24: Optimization & monitoring
```

### Phase 3: Months 7-12
```
Week 1-6:  User reputation system
Week 7-10: Community reporting
Week 11-14: Real-time monitoring
Week 15-18: Multi-language support
Week 19-22: Appeal system
Week 23-24: Integration testing & launch
```

---

## Recommendations

### Immediate Actions (Next 30 Days)
1. ✅ **Approve Phase 1 budget** ($5,000)
2. ✅ **Track baseline metrics** (false positives, moderation time)
3. ✅ **Survey moderators** on current pain points
4. ✅ **Analyze historical violations** to expand word lists

### Short-term (Months 2-6)
1. **Pilot AI integration** with 10% of listings
2. **Establish feedback loop** with moderators
3. **Monitor cost per listing** closely
4. **A/B test auto-approval** criteria

### Long-term (Months 6-12)
1. **Evaluate custom ML models** vs. AWS services
2. **Consider hybrid approach** (on-prem + cloud)
3. **Explore white-label opportunities** (sell moderation tech)
4. **International expansion** readiness

---

## Alternatives Considered

### Alternative 1: Full Manual Moderation
- **Cost:** $4,167/month (1 FTE)
- **Pros:** Human judgment, no false positives
- **Cons:** Slow, expensive, doesn't scale
- **Verdict:** ❌ Not scalable

### Alternative 2: Third-Party Service (Besedo, TaskUs)
- **Cost:** $0.50 - $2.00 per item
- **Pros:** Fast deployment, proven
- **Cons:** Expensive at scale, data privacy
- **Verdict:** ⚠️ Good for pilot, not long-term

### Alternative 3: Open-Source Solutions
- **Options:** Perspective API, Detoxify, Profanity-Check
- **Pros:** Free, community-maintained
- **Cons:** Limited features, maintenance burden
- **Verdict:** ✅ Good for Phase 1, supplement in Phase 2

### Alternative 4: Do Nothing (Current State)
- **Cost:** Moderator time only
- **Pros:** No investment needed
- **Cons:** Doesn't scale, quality issues
- **Verdict:** ❌ Not viable for growth

---

## Conclusion

The proposed three-phase approach to content moderation represents a **strategic investment** in platform quality, user safety, and operational efficiency. By starting with low-risk enhancements (Phase 1) and gradually introducing AI capabilities (Phases 2-3), we can:

1. **Reduce moderator burden by 70%**
2. **Improve detection accuracy by 50%**
3. **Scale to 10x listing volume** without proportional cost increase
4. **Enhance user trust** through faster, fairer moderation
5. **Generate ROI within 2 years**

### Recommended Path Forward

**✅ Approve:** Phase 1 immediately (low risk, high value)  
**🔄 Pilot:** Phase 2 AI features with 10% of traffic  
**📋 Plan:** Phase 3 for Year 2 based on Phase 2 results  

**Total Investment:** $30,000 one-time + $410/month  
**Expected Savings:** $1,350/month after full deployment  
**Strategic Value:** Platform differentiation + international readiness  

---

## Appendices

### Appendix A: Competitor Analysis
- **eBay Motors:** Uses Perspective API + manual review
- **Craigslist:** Minimal automation, heavy user flagging
- **Facebook Marketplace:** Proprietary AI, aggressive auto-removal
- **Boat Trader:** Rule-based + third-party moderation service

### Appendix B: Regulatory Considerations
- CDA Section 230 protections
- GDPR compliance for image scanning
- CCPA data privacy requirements
- Platform liability best practices

### Appendix C: Technical Deep Dives
- AWS Comprehend API documentation
- Rekognition confidence scores
- SageMaker model training guide
- DynamoDB schema optimization

### Appendix D: User Research
- Moderator pain point survey results
- User satisfaction with moderation times
- Appeal request frequency analysis
- Competitor moderation quality comparison

---

**Document Version:** 1.0  
**Next Review:** 30 days after Phase 1 completion  
**Stakeholders:** Engineering, Product, Operations, Legal, Finance  
**Approval Required:** CTO, CFO, VP Product  
