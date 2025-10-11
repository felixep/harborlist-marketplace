import { 
  ContentFlag, 
  ModerationWorkflow, 
  ModerationNotes, 
  ModerationQueue, 
  ModerationStats,
  FlaggedListing,
  ModerationDecision
} from '../common';

describe('Content Moderation Types', () => {
  describe('ContentFlag Interface', () => {
    it('should validate ContentFlag structure', () => {
      const contentFlag: ContentFlag = {
        id: 'flag-123',
        flagId: 'flag-123', // Alternative ID
        type: 'inappropriate',
        reason: 'Contains offensive language',
        reportedBy: 'user-456',
        reportedAt: '2023-10-01T10:00:00Z',
        severity: 'medium',
        status: 'pending',
        metadata: {
          listingId: 'listing-789',
          category: 'language',
          autoDetected: false
        }
      };

      expect(contentFlag.id).toBe('flag-123');
      expect(contentFlag.flagId).toBe('flag-123');
      expect(contentFlag.type).toBe('inappropriate');
      expect(contentFlag.severity).toBe('medium');
      expect(contentFlag.status).toBe('pending');
      expect(contentFlag.metadata?.listingId).toBe('listing-789');
    });

    it('should validate ContentFlag type enum values', () => {
      const validTypes: ContentFlag['type'][] = [
        'inappropriate',
        'spam',
        'fraud',
        'duplicate',
        'misleading',
        'copyright',
        'other'
      ];

      validTypes.forEach(type => {
        const flag: ContentFlag = {
          id: 'test',
          type,
          reason: 'Test reason',
          reportedBy: 'user-123',
          reportedAt: '2023-10-01T10:00:00Z',
          severity: 'low',
          status: 'pending'
        };
        expect(flag.type).toBe(type);
      });
    });

    it('should validate ContentFlag severity enum values', () => {
      const validSeverities: ContentFlag['severity'][] = [
        'low',
        'medium',
        'high',
        'critical'
      ];

      validSeverities.forEach(severity => {
        const flag: ContentFlag = {
          id: 'test',
          type: 'spam',
          reason: 'Test reason',
          reportedBy: 'user-123',
          reportedAt: '2023-10-01T10:00:00Z',
          severity,
          status: 'pending'
        };
        expect(flag.severity).toBe(severity);
      });
    });

    it('should validate ContentFlag status enum values', () => {
      const validStatuses: ContentFlag['status'][] = [
        'pending',
        'reviewed',
        'resolved',
        'dismissed'
      ];

      validStatuses.forEach(status => {
        const flag: ContentFlag = {
          id: 'test',
          type: 'spam',
          reason: 'Test reason',
          reportedBy: 'user-123',
          reportedAt: '2023-10-01T10:00:00Z',
          severity: 'low',
          status
        };
        expect(flag.status).toBe(status);
      });
    });

    it('should support reviewed flags with resolution', () => {
      const reviewedFlag: ContentFlag = {
        id: 'flag-456',
        type: 'fraud',
        reason: 'Suspicious pricing',
        reportedBy: 'user-789',
        reportedAt: '2023-10-01T10:00:00Z',
        severity: 'high',
        status: 'resolved',
        reviewedBy: 'moderator-123',
        reviewedAt: '2023-10-01T12:00:00Z',
        resolution: 'Listing removed and user warned'
      };

      expect(reviewedFlag.status).toBe('resolved');
      expect(reviewedFlag.reviewedBy).toBe('moderator-123');
      expect(reviewedFlag.resolution).toBe('Listing removed and user warned');
    });
  });

  describe('ModerationNotes Interface', () => {
    it('should validate ModerationNotes structure', () => {
      const moderationNotes: ModerationNotes = {
        reviewerId: 'moderator-123',
        reviewerName: 'John Moderator',
        decision: 'request_changes',
        reason: 'Missing required information',
        publicNotes: 'Please add more detailed boat specifications',
        internalNotes: 'User seems legitimate, just needs guidance',
        requiredChanges: [
          'Add engine specifications',
          'Include more photos',
          'Update condition description'
        ],
        reviewDuration: 15,
        confidence: 'high'
      };

      expect(moderationNotes.reviewerId).toBe('moderator-123');
      expect(moderationNotes.decision).toBe('request_changes');
      expect(moderationNotes.requiredChanges).toHaveLength(3);
      expect(moderationNotes.reviewDuration).toBe(15);
      expect(moderationNotes.confidence).toBe('high');
    });

    it('should validate ModerationNotes decision enum values', () => {
      const validDecisions: ModerationNotes['decision'][] = [
        'approve',
        'reject',
        'request_changes'
      ];

      validDecisions.forEach(decision => {
        const notes: ModerationNotes = {
          reviewerId: 'moderator-123',
          reviewerName: 'Test Moderator',
          decision,
          reason: 'Test reason',
          confidence: 'medium'
        };
        expect(notes.decision).toBe(decision);
      });
    });

    it('should validate ModerationNotes confidence enum values', () => {
      const validConfidences: ModerationNotes['confidence'][] = [
        'low',
        'medium',
        'high'
      ];

      validConfidences.forEach(confidence => {
        const notes: ModerationNotes = {
          reviewerId: 'moderator-123',
          reviewerName: 'Test Moderator',
          decision: 'approve',
          reason: 'Test reason',
          confidence
        };
        expect(notes.confidence).toBe(confidence);
      });
    });
  });

  describe('ModerationWorkflow Interface', () => {
    it('should validate ModerationWorkflow structure', () => {
      const workflow: ModerationWorkflow = {
        queueId: 'queue-123',
        listingId: 'listing-456',
        submittedBy: 'user-789',
        assignedTo: 'moderator-123',
        priority: 'medium',
        flags: [
          {
            id: 'flag-1',
            type: 'inappropriate',
            reason: 'Test flag',
            reportedBy: 'user-reporter',
            reportedAt: '2023-10-01T10:00:00Z',
            severity: 'medium',
            status: 'pending'
          }
        ],
        status: 'in_review',
        moderationNotes: {
          reviewerId: 'moderator-123',
          reviewerName: 'John Moderator',
          decision: 'approve',
          reason: 'Listing meets guidelines',
          confidence: 'high'
        },
        submittedAt: Date.now() - 3600000, // 1 hour ago
        reviewedAt: Date.now(),
        dueDate: Date.now() + 86400000, // 24 hours from now
        escalated: false
      };

      expect(workflow.queueId).toBe('queue-123');
      expect(workflow.listingId).toBe('listing-456');
      expect(workflow.priority).toBe('medium');
      expect(workflow.status).toBe('in_review');
      expect(workflow.flags).toHaveLength(1);
      expect(workflow.escalated).toBe(false);
    });

    it('should validate ModerationWorkflow priority enum values', () => {
      const validPriorities: ModerationWorkflow['priority'][] = [
        'low',
        'medium',
        'high',
        'urgent'
      ];

      validPriorities.forEach(priority => {
        const workflow: ModerationWorkflow = {
          queueId: 'queue-test',
          listingId: 'listing-test',
          submittedBy: 'user-test',
          priority,
          flags: [],
          status: 'pending',
          submittedAt: Date.now(),
          escalated: false
        };
        expect(workflow.priority).toBe(priority);
      });
    });

    it('should validate ModerationWorkflow status enum values', () => {
      const validStatuses: ModerationWorkflow['status'][] = [
        'pending',
        'in_review',
        'approved',
        'rejected',
        'changes_requested'
      ];

      validStatuses.forEach(status => {
        const workflow: ModerationWorkflow = {
          queueId: 'queue-test',
          listingId: 'listing-test',
          submittedBy: 'user-test',
          priority: 'medium',
          flags: [],
          status,
          submittedAt: Date.now(),
          escalated: false
        };
        expect(workflow.status).toBe(status);
      });
    });

    it('should support escalated workflows', () => {
      const escalatedWorkflow: ModerationWorkflow = {
        queueId: 'queue-456',
        listingId: 'listing-789',
        submittedBy: 'user-123',
        priority: 'urgent',
        flags: [],
        status: 'in_review',
        submittedAt: Date.now() - 7200000, // 2 hours ago
        escalated: true,
        escalatedAt: Date.now() - 3600000, // 1 hour ago
        escalatedBy: 'moderator-456',
        escalationReason: 'Complex case requiring senior review'
      };

      expect(escalatedWorkflow.escalated).toBe(true);
      expect(escalatedWorkflow.escalatedBy).toBe('moderator-456');
      expect(escalatedWorkflow.escalationReason).toBe('Complex case requiring senior review');
    });
  });

  describe('ModerationQueue Interface', () => {
    it('should validate ModerationQueue structure', () => {
      const queue: ModerationQueue = {
        queueId: 'queue-main',
        name: 'Main Moderation Queue',
        description: 'Primary queue for all listing reviews',
        filters: {
          priority: ['high', 'urgent'],
          listingTypes: ['Sport Fishing', 'Yacht'],
          flagTypes: ['inappropriate', 'fraud'],
          assignedModerators: ['moderator-1', 'moderator-2']
        },
        autoAssignment: true,
        maxItemsPerModerator: 10,
        slaHours: 24,
        active: true,
        createdAt: Date.now() - 86400000, // 1 day ago
        updatedAt: Date.now()
      };

      expect(queue.name).toBe('Main Moderation Queue');
      expect(queue.autoAssignment).toBe(true);
      expect(queue.maxItemsPerModerator).toBe(10);
      expect(queue.slaHours).toBe(24);
      expect(queue.filters.priority).toContain('high');
    });
  });

  describe('ModerationStats Interface', () => {
    it('should validate ModerationStats structure', () => {
      const stats: ModerationStats = {
        totalFlagged: 150,
        pendingReview: 25,
        approvedToday: 45,
        rejectedToday: 8,
        averageReviewTime: 18.5,
        queueBacklog: 32,
        moderatorWorkload: [
          {
            moderatorId: 'mod-1',
            moderatorName: 'John Moderator',
            assignedItems: 8,
            completedToday: 12,
            averageReviewTime: 15.2
          },
          {
            moderatorId: 'mod-2',
            moderatorName: 'Jane Moderator',
            assignedItems: 6,
            completedToday: 18,
            averageReviewTime: 22.1
          }
        ],
        flagTypeBreakdown: [
          { type: 'inappropriate', count: 45, percentage: 30 },
          { type: 'spam', count: 38, percentage: 25.3 },
          { type: 'fraud', count: 22, percentage: 14.7 }
        ],
        slaCompliance: 87.5
      };

      expect(stats.totalFlagged).toBe(150);
      expect(stats.moderatorWorkload).toHaveLength(2);
      expect(stats.flagTypeBreakdown).toHaveLength(3);
      expect(stats.slaCompliance).toBe(87.5);
    });
  });

  describe('FlaggedListing Interface', () => {
    it('should validate FlaggedListing structure', () => {
      const flaggedListing: FlaggedListing = {
        listingId: 'listing-123',
        title: 'Suspicious Boat Listing',
        ownerId: 'user-456',
        ownerName: 'John Seller',
        ownerEmail: 'john@example.com',
        price: 50000,
        location: {
          city: 'Miami',
          state: 'FL'
        },
        images: ['image1.jpg', 'image2.jpg'],
        status: 'under_review',
        flags: [
          {
            id: 'flag-1',
            type: 'fraud',
            reason: 'Price too low for boat type',
            reportedBy: 'user-reporter',
            reportedAt: '2023-10-01T10:00:00Z',
            severity: 'high',
            status: 'pending'
          }
        ],
        flaggedAt: '2023-10-01T10:00:00Z',
        reviewedAt: '2023-10-01T12:00:00Z',
        reviewedBy: 'moderator-123',
        moderationNotes: 'Investigating pricing discrepancy'
      };

      expect(flaggedListing.listingId).toBe('listing-123');
      expect(flaggedListing.status).toBe('under_review');
      expect(flaggedListing.flags).toHaveLength(1);
      expect(flaggedListing.location.city).toBe('Miami');
    });

    it('should validate FlaggedListing status enum values', () => {
      const validStatuses: FlaggedListing['status'][] = [
        'pending',
        'under_review',
        'approved',
        'rejected'
      ];

      validStatuses.forEach(status => {
        const listing: FlaggedListing = {
          listingId: 'test',
          title: 'Test Listing',
          ownerId: 'user-test',
          ownerName: 'Test User',
          ownerEmail: 'test@example.com',
          price: 10000,
          location: { city: 'Test', state: 'TX' },
          images: [],
          status,
          flags: [],
          flaggedAt: '2023-10-01T10:00:00Z'
        };
        expect(listing.status).toBe(status);
      });
    });
  });

  describe('ModerationDecision Interface', () => {
    it('should validate ModerationDecision structure', () => {
      const decision: ModerationDecision = {
        action: 'request_changes',
        reason: 'Missing required information',
        notes: 'Please add engine specifications and more photos',
        notifyUser: true
      };

      expect(decision.action).toBe('request_changes');
      expect(decision.reason).toBe('Missing required information');
      expect(decision.notifyUser).toBe(true);
    });

    it('should validate ModerationDecision action enum values', () => {
      const validActions: ModerationDecision['action'][] = [
        'approve',
        'reject',
        'request_changes'
      ];

      validActions.forEach(action => {
        const decision: ModerationDecision = {
          action,
          reason: 'Test reason',
          notifyUser: false
        };
        expect(decision.action).toBe(action);
      });
    });
  });
});