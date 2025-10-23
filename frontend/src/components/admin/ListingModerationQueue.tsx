import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FlaggedListing, ContentFlag, ModerationWorkflow, AdminUser } from '@harborlist/shared-types';

interface ListingModerationQueueProps {
  listings: FlaggedListing[];
  onSelectListing: (listing: FlaggedListing) => void;
  onQuickAction: (listingId: string, action: 'approve' | 'reject' | 'approve_update' | 'reject_update') => void;
  onBulkAction?: (listingIds: string[], action: 'approve' | 'reject' | 'assign' | 'escalate' | 'priority_change') => void;
  onAssignModerator?: (listingIds: string[], moderatorId: string) => void;
  onEscalate?: (listingIds: string[], reason: string) => void;
  onPriorityChange?: (listingIds: string[], priority: 'low' | 'medium' | 'high' | 'urgent') => void;
  onRefresh?: () => void;
  moderators?: AdminUser[];
  loading?: boolean;
  realTimeEnabled?: boolean;
  notifications?: ModerationNotification[];
  onDismissNotification?: (notificationId: string) => void;
  workflowAutomation?: {
    enabled: boolean;
    rules: AutomationRule[];
  };
}

interface ModerationNotification {
  id: string;
  type: 'new_flagged' | 'assignment' | 'escalation' | 'sla_warning' | 'bulk_action_complete';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  actionRequired?: boolean;
  relatedListingId?: string;
}

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    flagType?: string[];
    severity?: string[];
    reportCount?: number;
    timeInQueue?: number; // hours
  };
  actions: {
    autoAssign?: boolean;
    priorityBoost?: boolean;
    escalate?: boolean;
    notify?: string[]; // moderator IDs
  };
}

const ListingModerationQueue: React.FC<ListingModerationQueueProps> = ({
  listings,
  onSelectListing,
  onQuickAction,
  onBulkAction,
  onAssignModerator,
  onEscalate,
  onPriorityChange,
  onRefresh,
  moderators = [],
  loading = false,
  realTimeEnabled = true,
  notifications = [],
  onDismissNotification,
  workflowAutomation = { enabled: false, rules: [] }
}) => {
  const [sortBy, setSortBy] = useState<'flaggedAt' | 'severity' | 'flagCount' | 'priority'>('flaggedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAssignModerator, setBulkAssignModerator] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(realTimeEnabled);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [bulkEscalationReason, setBulkEscalationReason] = useState('');
  const [bulkPriority, setBulkPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [showAutomationPanel, setShowAutomationPanel] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');

  // Real-time updates and auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !realTimeEnabled) return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      if (onRefresh) {
        onRefresh();
      }
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, realTimeEnabled, refreshInterval, onRefresh]);

  // WebSocket connection simulation for real-time updates
  useEffect(() => {
    if (!realTimeEnabled) return;

    // Simulate WebSocket connection
    const connectWebSocket = () => {
      setConnectionStatus('connected');
      
      // Simulate periodic connection checks
      const healthCheck = setInterval(() => {
        // In a real implementation, this would check WebSocket connection health
        const isHealthy = Math.random() > 0.1; // 90% uptime simulation
        
        if (!isHealthy) {
          setConnectionStatus('reconnecting');
          setTimeout(() => {
            setConnectionStatus('connected');
          }, 2000);
        }
      }, 60000); // Check every minute

      return () => clearInterval(healthCheck);
    };

    const cleanup = connectWebSocket();
    return cleanup;
  }, [realTimeEnabled]);

  // Notification management
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadNotifications(unread);
  }, [notifications]);

  // Workflow automation processing
  const processAutomationRules = useCallback((listing: FlaggedListing) => {
    if (!workflowAutomation.enabled) return;

    workflowAutomation.rules.forEach(rule => {
      if (!rule.enabled) return;

      let conditionsMet = true;

      // Check flag type conditions
      if (rule.conditions.flagType && rule.conditions.flagType.length > 0) {
        const hasMatchingFlag = listing.flags.some(flag => 
          rule.conditions.flagType!.includes(flag.type)
        );
        if (!hasMatchingFlag) conditionsMet = false;
      }

      // Check severity conditions
      if (rule.conditions.severity && rule.conditions.severity.length > 0) {
        const hasMatchingSeverity = listing.flags.some(flag => 
          rule.conditions.severity!.includes(flag.severity)
        );
        if (!hasMatchingSeverity) conditionsMet = false;
      }

      // Check report count conditions
      if (rule.conditions.reportCount && listing.flags.length < rule.conditions.reportCount) {
        conditionsMet = false;
      }

      // Check time in queue conditions
      if (rule.conditions.timeInQueue) {
        const hoursInQueue = (Date.now() - new Date(listing.flaggedAt).getTime()) / (1000 * 60 * 60);
        if (hoursInQueue < rule.conditions.timeInQueue) {
          conditionsMet = false;
        }
      }

      // Execute actions if conditions are met
      if (conditionsMet) {
        console.log(`Automation rule "${rule.name}" triggered for listing ${listing.listingId}`);
        
        if (rule.actions.autoAssign && moderators.length > 0) {
          // Auto-assign to least busy moderator
          const leastBusyModerator = moderators[0]; // Simplified logic
          if (onAssignModerator) {
            onAssignModerator([listing.listingId], leastBusyModerator.id);
          }
        }

        if (rule.actions.priorityBoost && onPriorityChange) {
          onPriorityChange([listing.listingId], 'high');
        }

        if (rule.actions.escalate && onEscalate) {
          onEscalate([listing.listingId], `Automated escalation: ${rule.name}`);
        }
      }
    });
  }, [workflowAutomation, moderators, onAssignModerator, onPriorityChange, onEscalate]);

  // Process automation rules when listings change
  useEffect(() => {
    if (workflowAutomation.enabled) {
      listings.forEach(processAutomationRules);
    }
  }, [listings, processAutomationRules, workflowAutomation.enabled]);

  const getHighestSeverity = (flags: ContentFlag[]) => {
    if (!flags || flags.length === 0) {
      return null;
    }
    const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return flags.reduce((highest, flag) => 
      (severityOrder[flag.severity] || 0) > (severityOrder[highest.severity] || 0) ? flag : highest
    );
  };

  const sortedAndFilteredListings = useMemo(() => {
    let filtered = listings;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(listing => listing.status === filterStatus);
    }

    // Apply severity filter
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(listing => 
        listing.flags.some(flag => flag.severity === filterSeverity)
      );
    }

    // Apply assignee filter
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned') {
        filtered = filtered.filter(listing => !listing.reviewedBy);
      } else {
        filtered = filtered.filter(listing => listing.reviewedBy === filterAssignee);
      }
    }

    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(listing => {
        const highestSeverity = getHighestSeverity(listing.flags);
        return highestSeverity && highestSeverity.severity === filterPriority;
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'flaggedAt':
          aValue = new Date(a.flaggedAt).getTime();
          bValue = new Date(b.flaggedAt).getTime();
          break;
        case 'severity':
          const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = Math.max(...a.flags.map(f => severityOrder[f.severity] || 0), 0);
          bValue = Math.max(...b.flags.map(f => severityOrder[f.severity] || 0), 0);
          break;
        case 'flagCount':
          aValue = a.flags.length;
          bValue = b.flags.length;
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
          const aPriorityFlag = getHighestSeverity(a.flags);
          const bPriorityFlag = getHighestSeverity(b.flags);
          const aPriority = aPriorityFlag?.severity || 'low';
          const bPriority = bPriorityFlag?.severity || 'low';
          aValue = priorityOrder[aPriority] || 0;
          bValue = priorityOrder[bPriority] || 0;
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [listings, sortBy, sortOrder, filterStatus, filterSeverity, filterAssignee, filterPriority]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectListing = (listingId: string, checked: boolean) => {
    const newSelected = new Set(selectedListings);
    if (checked) {
      newSelected.add(listingId);
    } else {
      newSelected.delete(listingId);
    }
    setSelectedListings(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(sortedAndFilteredListings.map(l => l.listingId));
      setSelectedListings(allIds);
      setShowBulkActions(true);
    } else {
      setSelectedListings(new Set());
      setShowBulkActions(false);
    }
  };

  const handleBulkAction = (action: 'approve' | 'reject' | 'assign' | 'escalate' | 'priority_change') => {
    const selectedIds = Array.from(selectedListings);
    
    if (action === 'assign' && bulkAssignModerator && onAssignModerator) {
      onAssignModerator(selectedIds, bulkAssignModerator);
    } else if (action === 'escalate' && bulkEscalationReason && onEscalate) {
      onEscalate(selectedIds, bulkEscalationReason);
    } else if (action === 'priority_change' && onPriorityChange) {
      onPriorityChange(selectedIds, bulkPriority);
    } else if (onBulkAction) {
      onBulkAction(selectedIds, action);
    }
    
    // Clear selections after action
    setSelectedListings(new Set());
    setShowBulkActions(false);
    setBulkAssignModerator('');
    setBulkEscalationReason('');
  };

  const handleNotificationDismiss = (notificationId: string) => {
    if (onDismissNotification) {
      onDismissNotification(notificationId);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      case 'reconnecting': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'reconnecting': return 'Reconnecting...';
      default: return 'Unknown';
    }
  };

  const getPriorityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAssigneeDisplay = (listing: FlaggedListing) => {
    if (!listing.reviewedBy) return 'Unassigned';
    const moderator = moderators.find(m => m.id === listing.reviewedBy);
    return moderator ? moderator.name : 'Unknown Moderator';
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Moderation Queue</h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium text-gray-900">
              Moderation Queue ({sortedAndFilteredListings.length})
            </h2>
            
            {/* Real-time status indicator */}
            {realTimeEnabled && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'reconnecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                <span className={`text-xs ${getConnectionStatusColor()}`}>
                  {getConnectionStatusText()}
                </span>
              </div>
            )}
            
            {/* Auto-refresh toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="auto-refresh" className="text-sm text-gray-600">
                Auto-refresh
              </label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-xs border border-gray-300 rounded px-2 py-1"
                disabled={!autoRefresh}
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
              {autoRefresh && (
                <span className="text-xs text-gray-400">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 19H6a2 2 0 01-2-2V7a2 2 0 012-2h5m5 0v6m0 0l3-3m-3 3l-3-3" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        No notifications
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </h4>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                  notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {notification.priority}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(notification.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleNotificationDismiss(notification.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Workflow automation toggle */}
            {workflowAutomation.enabled && (
              <button
                onClick={() => setShowAutomationPanel(!showAutomationPanel)}
                className={`px-3 py-1 text-xs rounded-md border ${showAutomationPanel ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
              >
                Automation ({workflowAutomation.rules.filter(r => r.enabled).length})
              </button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending_review">Pending Review</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Priority</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Assignee Filter */}
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {moderators.map(moderator => (
                <option key={moderator.id} value={moderator.id}>
                  {moderator.name}
                </option>
              ))}
            </select>

            {/* Sort Options */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="flaggedAt-desc">Newest First</option>
              <option value="flaggedAt-asc">Oldest First</option>
              <option value="priority-desc">High Priority First</option>
              <option value="severity-desc">High Severity First</option>
              <option value="flagCount-desc">Most Flags First</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedListings.size} item{selectedListings.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => {
                    setSelectedListings(new Set());
                    setShowBulkActions(false);
                  }}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                >
                  Clear Selection
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Basic Actions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Basic Actions</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleBulkAction('approve')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleBulkAction('reject')}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {/* Assignment */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Assignment</h4>
                  <div className="flex space-x-2">
                    <select
                      value={bulkAssignModerator}
                      onChange={(e) => setBulkAssignModerator(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm flex-1"
                    >
                      <option value="">Select moderator...</option>
                      {moderators.map(moderator => (
                        <option key={moderator.id} value={moderator.id}>
                          {moderator.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleBulkAction('assign')}
                      disabled={!bulkAssignModerator}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                </div>

                {/* Advanced Actions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Advanced</h4>
                  <div className="flex space-x-2">
                    <select
                      value={bulkPriority}
                      onChange={(e) => setBulkPriority(e.target.value as any)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <button
                      onClick={() => handleBulkAction('priority_change')}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                      Set Priority
                    </button>
                  </div>
                </div>
              </div>

              {/* Escalation */}
              <div className="border-t border-blue-200 pt-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Escalation reason..."
                    value={bulkEscalationReason}
                    onChange={(e) => setBulkEscalationReason(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm flex-1"
                  />
                  <button
                    onClick={() => handleBulkAction('escalate')}
                    disabled={!bulkEscalationReason.trim()}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    Escalate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Automation Panel */}
        {showAutomationPanel && workflowAutomation.enabled && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Workflow Automation</h3>
              <button
                onClick={() => setShowAutomationPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {workflowAutomation.rules.filter(rule => rule.enabled).map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{rule.name}</span>
                    <div className="text-xs text-gray-500">
                      {rule.conditions.flagType ? `Flags: ${rule.conditions.flagType.join(', ')}` : null}
                      {rule.conditions.severity ? ` | Severity: ${rule.conditions.severity.join(', ')}` : null}
                      {rule.conditions.reportCount ? ` | Min Reports: ${rule.conditions.reportCount}` : null}
                      {rule.conditions.timeInQueue ? ` | Queue Time: ${rule.conditions.timeInQueue}h` : null}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {rule.actions.autoAssign && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Auto-assign</span>}
                    {rule.actions.priorityBoost && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Priority boost</span>}
                    {rule.actions.escalate && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Escalate</span>}
                  </div>
                </div>
              ))}
              {workflowAutomation.rules.filter(rule => rule.enabled).length === 0 && (
                <div className="text-sm text-gray-500 text-center py-2">
                  No active automation rules
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={selectedListings.size === sortedAndFilteredListings.length && sortedAndFilteredListings.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Select All</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {sortedAndFilteredListings.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No listings match the current filters.
          </div>
        ) : (
          sortedAndFilteredListings.map((listing) => {
            const highestSeverityFlag = getHighestSeverity(listing.flags);
            const isSelected = selectedListings.has(listing.listingId);
            
            return (
              <div
                key={listing.listingId}
                className={`p-6 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Selection Checkbox */}
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectListing(listing.listingId, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {/* Listing Image */}
                  <div className="flex-shrink-0">
                    {listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Listing Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 
                        className="text-lg font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                        onClick={() => onSelectListing(listing)}
                      >
                        {listing.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                        {listing.status.replace('_', ' ')}
                      </span>
                      
                      {highestSeverityFlag && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(highestSeverityFlag.severity)}`}>
                          {highestSeverityFlag.severity} priority
                        </span>
                      )}
                      
                      {/* SLA Status Indicator */}
                      {(() => {
                        const hoursInQueue = (Date.now() - new Date(listing.flaggedAt).getTime()) / (1000 * 60 * 60);
                        const slaHours = 24; // Default SLA
                        const slaProgress = (hoursInQueue / slaHours) * 100;
                        
                        if (slaProgress > 100) {
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              SLA Breach
                            </span>
                          );
                        } else if (slaProgress > 80) {
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              SLA Warning
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {/* Automation Indicator */}
                      {workflowAutomation.enabled && workflowAutomation.rules.some(rule => {
                        if (!rule.enabled) return false;
                        // Check if this listing would trigger any automation rules
                        let wouldTrigger = true;
                        if (rule.conditions.flagType && rule.conditions.flagType.length > 0) {
                          wouldTrigger = listing.flags.some(flag => rule.conditions.flagType!.includes(flag.type));
                        }
                        if (rule.conditions.severity && rule.conditions.severity.length > 0) {
                          wouldTrigger = wouldTrigger && listing.flags.some(flag => rule.conditions.severity!.includes(flag.severity));
                        }
                        return wouldTrigger;
                      }) && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                          Auto-eligible
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 mb-3">
                      <div className="space-y-1">
                        <div>Owner: <span className="font-medium">{listing.ownerName}</span></div>
                        <div>Price: <span className="font-medium">${listing.price.toLocaleString()}</span></div>
                        <div>Location: <span className="font-medium">{listing.location.city}, {listing.location.state}</span></div>
                      </div>
                      <div className="space-y-1">
                        <div>Submission Type: <span className="font-medium capitalize">{listing.submissionType || 'initial'}</span></div>
                        <div>Flags: <span className="font-medium">{listing.flags.length > 0 ? listing.flags.map(f => f.type).join(', ') : 'None'}</span></div>
                        <div>Assigned: <span className="font-medium">{getAssigneeDisplay(listing)}</span></div>
                      </div>
                    </div>

                    {listing.flags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {listing.flags.slice(0, 4).map((flag, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${getSeverityColor(flag.severity)}`}
                          >
                            {flag.type}: {flag.reason}
                          </span>
                        ))}
                        {listing.flags.length > 4 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 border border-gray-200">
                            +{listing.flags.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-end">
                      {(listing.status === 'pending_review' || (listing as any).hasPendingUpdate) && (
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const action = (listing as any).hasPendingUpdate ? 'approve_update' : 'approve';
                              console.log('[Button Click] Approve button clicked:', { listingId: listing.listingId, action, hasPendingUpdate: (listing as any).hasPendingUpdate });
                              onQuickAction(listing.listingId, action);
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                          >
                            {(listing as any).hasPendingUpdate ? 'Approve Update' : 'Quick Approve'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const action = (listing as any).hasPendingUpdate ? 'reject_update' : 'reject';
                              console.log('[Button Click] Reject button clicked:', { listingId: listing.listingId, action, hasPendingUpdate: (listing as any).hasPendingUpdate });
                              onQuickAction(listing.listingId, action);
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                          >
                            {(listing as any).hasPendingUpdate ? 'Reject Update' : 'Quick Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ListingModerationQueue;