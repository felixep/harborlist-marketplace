/**
 * Notification API Service
 * 
 * Provides methods to interact with the notifications API endpoints.
 * Handles fetching, marking as read, and deleting user notifications.
 */

import { config } from '../config/env';

const API_BASE_URL = config.apiUrl.replace('/api', ''); // Remove /api suffix if present

console.log('[notificationApi] config.apiUrl:', config.apiUrl);
console.log('[notificationApi] API_BASE_URL:', API_BASE_URL);

export interface Notification {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: number;
  readAt?: number;
  data?: Record<string, any>;
  actionUrl?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  lastKey?: any;
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  limit: number = 20,
  lastKey?: any,
  status?: 'unread' | 'read'
): Promise<NotificationsResponse> {
  let url = `${API_BASE_URL}/api/notifications?limit=${limit}`;

  if (lastKey) {
    url += `&lastKey=${encodeURIComponent(JSON.stringify(lastKey))}`;
  }

  if (status) {
    url += `&status=${status}`;
  }

  const token = localStorage.getItem('authToken');
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  return response.json();
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }

  const data = await response.json();
  return data.count;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  createdAt: number
): Promise<void> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ createdAt }),
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<number> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }

  const data = await response.json();
  return data.count;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  createdAt: number
): Promise<void> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ createdAt }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete notification');
  }
}
