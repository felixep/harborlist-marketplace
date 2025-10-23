/**
 * Notification Bell Component
 * 
 * Displays a bell icon with unread notification count badge.
 * Shows a dropdown with recent notifications when clicked.
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  getUserNotifications, 
  getUnreadCount, 
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification 
} from '../../services/notificationApi';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount and every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  async function fetchUnreadCount() {
    try {
      const count = await getUnreadCount();
      console.log('[NotificationBell] Unread count:', count);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      // Don't show error to user, just fail silently for unread count
      // The notification system is a nice-to-have feature
    }
  }

  async function fetchNotifications() {
    try {
      setLoading(true);
      const response = await getUserNotifications(10); // Get last 10 notifications
      console.log('[NotificationBell] Fetched notifications:', response);
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(notification: Notification) {
    if (notification.status === 'read') return;

    try {
      await markNotificationAsRead(notification.notificationId, notification.createdAt);
      
      // Update local state
      setNotifications(notifications.map(n =>
        n.notificationId === notification.notificationId
          ? { ...n, status: 'read' as const }
          : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, status: 'read' as const })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'listing_approved':
        return '✅';
      case 'listing_rejected':
        return '❌';
      case 'listing_changes_requested':
        return '📝';
      case 'listing_inquiry':
        return '💬';
      case 'system_announcement':
        return '📢';
      default:
        return '🔔';
    }
  }

  function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-150"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-[500px] overflow-hidden flex flex-col"
          style={{ boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-sm text-slate-500 text-center">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.notificationId}
                    className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                      notification.status === 'unread' ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => handleMarkAsRead(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-slate-900">
                            {notification.title}
                          </p>
                          <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.actionUrl && (
                          <Link
                            to={notification.actionUrl}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1 inline-block"
                            onClick={() => setIsOpen(false)}
                          >
                            View details →
                          </Link>
                        )}
                      </div>
                      {notification.status === 'unread' && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200">
              <Link
                to="/notifications"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium block text-center"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
