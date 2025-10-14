/**
 * User Behavior Analytics Tracking Hook
 * 
 * Tracks all user interactions and behaviors across the platform:
 * - Listing views, clicks, and engagement (authenticated & anonymous)
 * - Search queries and filter usage
 * - Contact seller actions
 * - Share and favorite actions
 * - Page views and scroll depth
 * - Time spent on pages
 * 
 * Automatically generates session IDs for anonymous users and
 * links events to authenticated users when available.
 * 
 * @example
 * ```tsx
 * const { trackListingView, trackClick, trackSearch } = useTracking();
 * 
 * // Track listing view
 * useEffect(() => {
 *   trackListingView(listingId);
 * }, [listingId]);
 * 
 * // Track button click
 * <button onClick={() => trackContactSeller(listingId)}>
 *   Contact Seller
 * </button>
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';
import { config } from '../config/env';
import { useAuth } from '../components/auth/AuthProvider';

const API_BASE_URL = config.apiUrl;

// Event types matching backend
export enum TrackingEventType {
  // Listing interactions
  LISTING_VIEW = 'LISTING_VIEW',
  LISTING_CARD_CLICK = 'LISTING_CARD_CLICK',
  LISTING_IMAGE_VIEW = 'LISTING_IMAGE_VIEW',
  LISTING_IMAGE_EXPAND = 'LISTING_IMAGE_EXPAND',
  LISTING_CONTACT_CLICK = 'LISTING_CONTACT_CLICK',
  LISTING_PHONE_REVEAL = 'LISTING_PHONE_REVEAL',
  LISTING_EMAIL_CLICK = 'LISTING_EMAIL_CLICK',
  LISTING_SHARE = 'LISTING_SHARE',
  LISTING_FAVORITE = 'LISTING_FAVORITE',
  LISTING_UNFAVORITE = 'LISTING_UNFAVORITE',
  
  // Search & discovery
  SEARCH_QUERY = 'SEARCH_QUERY',
  SEARCH_FILTER_APPLY = 'SEARCH_FILTER_APPLY',
  SEARCH_RESULT_CLICK = 'SEARCH_RESULT_CLICK',
  CATEGORY_BROWSE = 'CATEGORY_BROWSE',
  
  // Page views
  PAGE_VIEW = 'PAGE_VIEW',
  HOME_VIEW = 'HOME_VIEW',
  PROFILE_VIEW = 'PROFILE_VIEW',
  
  // User actions
  USER_REGISTER = 'USER_REGISTER',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  
  // Engagement
  TIME_ON_PAGE = 'TIME_ON_PAGE',
  SCROLL_DEPTH = 'SCROLL_DEPTH',
}

interface TrackEventOptions {
  listingId?: string;
  metadata?: Record<string, any>;
}

/**
 * Get or create a session ID for anonymous tracking
 */
function getSessionId(): string {
  const SESSION_KEY = 'analytics_session_id';
  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  const stored = sessionStorage.getItem(SESSION_KEY);
  const storedTime = sessionStorage.getItem(`${SESSION_KEY}_time`);

  // Check if session is still valid
  if (stored && storedTime) {
    const elapsed = Date.now() - parseInt(storedTime);
    if (elapsed < SESSION_DURATION) {
      // Update timestamp to extend session
      sessionStorage.setItem(`${SESSION_KEY}_time`, Date.now().toString());
      return stored;
    }
  }

  // Create new session ID
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  sessionStorage.setItem(SESSION_KEY, sessionId);
  sessionStorage.setItem(`${SESSION_KEY}_time`, Date.now().toString());
  
  return sessionId;
}

/**
 * Track an analytics event (internal function)
 */
async function trackEvent(
  eventType: TrackingEventType,
  options: TrackEventOptions = {}
): Promise<void> {
  try {
    const sessionId = getSessionId();

    const payload = {
      eventType,
      sessionId,
      ...(options.listingId && { listingId: options.listingId }),
      metadata: {
        ...options.metadata,
        page: window.location.pathname,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
      },
    };

    // Send to analytics service (non-blocking)
    fetch(`${API_BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
      },
      body: JSON.stringify(payload),
      keepalive: true, // Ensure request completes even if page unloads
    }).catch(err => {
      // Silently fail - don't disrupt user experience
      console.debug('Analytics tracking failed:', err);
    });
  } catch (error) {
    console.debug('Analytics error:', error);
  }
}

/**
 * User behavior analytics tracking hook
 */
export function useTracking() {
  const { user } = useAuth();
  const pageLoadTime = useRef<number>(Date.now());
  const scrollDepth = useRef<number>(0);
  const hasTrackedPageView = useRef<boolean>(false);

  /**
   * Track page view (auto-called on mount)
   */
  const trackPageView = useCallback((page?: string) => {
    if (hasTrackedPageView.current) return;
    hasTrackedPageView.current = true;

    trackEvent(TrackingEventType.PAGE_VIEW, {
      metadata: {
        page: page || window.location.pathname,
        title: document.title,
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track listing view
   */
  const trackListingView = useCallback((listingId: string, metadata?: Record<string, any>) => {
    trackEvent(TrackingEventType.LISTING_VIEW, {
      listingId,
      metadata: {
        ...metadata,
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track listing card click (in search results or home page)
   */
  const trackListingClick = useCallback((listingId: string, position?: number) => {
    trackEvent(TrackingEventType.LISTING_CARD_CLICK, {
      listingId,
      metadata: {
        position,
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track search query
   */
  const trackSearch = useCallback((query: string, filters?: Record<string, any>) => {
    trackEvent(TrackingEventType.SEARCH_QUERY, {
      metadata: {
        searchQuery: query,
        filterCriteria: filters,
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track filter application
   */
  const trackFilterApply = useCallback((filters: Record<string, any>) => {
    trackEvent(TrackingEventType.SEARCH_FILTER_APPLY, {
      metadata: {
        filterCriteria: filters,
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track contact seller action
   */
  const trackContactSeller = useCallback((listingId: string) => {
    trackEvent(TrackingEventType.LISTING_CONTACT_CLICK, {
      listingId,
      metadata: {
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track phone number reveal
   */
  const trackPhoneReveal = useCallback((listingId: string) => {
    trackEvent(TrackingEventType.LISTING_PHONE_REVEAL, {
      listingId,
      metadata: {
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track email click
   */
  const trackEmailClick = useCallback((listingId: string) => {
    trackEvent(TrackingEventType.LISTING_EMAIL_CLICK, {
      listingId,
      metadata: {
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track share action
   */
  const trackShare = useCallback((listingId: string, method: string) => {
    trackEvent(TrackingEventType.LISTING_SHARE, {
      listingId,
      metadata: {
        shareMethod: method,
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track favorite/unfavorite
   */
  const trackFavorite = useCallback((listingId: string, action: 'add' | 'remove') => {
    trackEvent(
      action === 'add' ? TrackingEventType.LISTING_FAVORITE : TrackingEventType.LISTING_UNFAVORITE,
      {
        listingId,
        metadata: {
          userId: user?.id,
          authenticated: !!user,
        },
      }
    );
  }, [user]);

  /**
   * Track image view/expand
   */
  const trackImageView = useCallback((listingId: string, imageIndex: number, expanded: boolean = false) => {
    trackEvent(
      expanded ? TrackingEventType.LISTING_IMAGE_EXPAND : TrackingEventType.LISTING_IMAGE_VIEW,
      {
        listingId,
        metadata: {
          imageIndex,
          userId: user?.id,
          authenticated: !!user,
        },
      }
    );
  }, [user]);

  /**
   * Track category browsing
   */
  const trackCategoryBrowse = useCallback((category: string) => {
    trackEvent(TrackingEventType.CATEGORY_BROWSE, {
      metadata: {
        category,
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track search result click
   */
  const trackSearchResultClick = useCallback((listingId: string, position: number, searchQuery?: string) => {
    trackEvent(TrackingEventType.SEARCH_RESULT_CLICK, {
      listingId,
      metadata: {
        position,
        searchQuery,
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  /**
   * Track generic click event
   */
  const trackClick = useCallback((action: string, metadata?: Record<string, any>) => {
    trackEvent(TrackingEventType.PAGE_VIEW, {
      metadata: {
        action,
        ...metadata,
        userId: user?.id,
        authenticated: !!user,
      },
    });
  }, [user]);

  // Track page view on mount
  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  // Track time on page when unmounting
  useEffect(() => {
    return () => {
      const timeSpent = Date.now() - pageLoadTime.current;
      if (timeSpent > 3000) { // Only track if > 3 seconds
        trackEvent(TrackingEventType.TIME_ON_PAGE, {
          metadata: {
            duration: timeSpent,
            page: window.location.pathname,
            userId: user?.id,
            authenticated: !!user,
          },
        });
      }
    };
  }, [user]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollPercentage = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);

      // Track milestones: 25%, 50%, 75%, 90%
      if (scrollPercentage >= 25 && scrollDepth.current < 25) {
        scrollDepth.current = 25;
        trackEvent(TrackingEventType.SCROLL_DEPTH, {
          metadata: { scrollPercentage: 25, userId: user?.id, authenticated: !!user },
        });
      } else if (scrollPercentage >= 50 && scrollDepth.current < 50) {
        scrollDepth.current = 50;
        trackEvent(TrackingEventType.SCROLL_DEPTH, {
          metadata: { scrollPercentage: 50, userId: user?.id, authenticated: !!user },
        });
      } else if (scrollPercentage >= 75 && scrollDepth.current < 75) {
        scrollDepth.current = 75;
        trackEvent(TrackingEventType.SCROLL_DEPTH, {
          metadata: { scrollPercentage: 75, userId: user?.id, authenticated: !!user },
        });
      } else if (scrollPercentage >= 90 && scrollDepth.current < 90) {
        scrollDepth.current = 90;
        trackEvent(TrackingEventType.SCROLL_DEPTH, {
          metadata: { scrollPercentage: 90, userId: user?.id, authenticated: !!user },
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user]);

  return {
    // Page tracking
    trackPageView,
    
    // Listing tracking
    trackListingView,
    trackListingClick,
    trackImageView,
    
    // Search tracking
    trackSearch,
    trackFilterApply,
    trackSearchResultClick,
    trackCategoryBrowse,
    
    // Interaction tracking
    trackContactSeller,
    trackPhoneReveal,
    trackEmailClick,
    trackShare,
    trackFavorite,
    
    // Generic tracking
    trackClick,
  };
}
