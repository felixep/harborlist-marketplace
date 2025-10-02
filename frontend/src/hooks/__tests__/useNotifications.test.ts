import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useNotifications } from '../useNotifications';

describe('useNotifications', () => {
  it('starts with empty notifications array', () => {
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.notifications).toEqual([]);
  });

  it('adds notification with generated id', () => {
    const { result } = renderHook(() => useNotifications());
    
    const notification = {
      type: 'success' as const,
      title: 'Success',
      message: 'Operation completed'
    };

    act(() => {
      result.current.addNotification(notification);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject(notification);
    expect(result.current.notifications[0].id).toBeDefined();
    expect(typeof result.current.notifications[0].id).toBe('string');
  });

  it('adds multiple notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Success 1',
        message: 'First success'
      });
      result.current.addNotification({
        type: 'error',
        title: 'Error 1',
        message: 'First error'
      });
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications[0].title).toBe('Success 1');
    expect(result.current.notifications[1].title).toBe('Error 1');
  });

  it('removes notification by id', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Success',
        message: 'Success message'
      });
      result.current.addNotification({
        type: 'error',
        title: 'Error',
        message: 'Error message'
      });
    });

    const firstNotificationId = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(firstNotificationId);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].title).toBe('Error');
  });

  it('does not remove notification with non-existent id', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Success',
        message: 'Success message'
      });
    });

    act(() => {
      result.current.removeNotification('non-existent-id');
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  it('clears all notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Success 1',
        message: 'First success'
      });
      result.current.addNotification({
        type: 'error',
        title: 'Error 1',
        message: 'First error'
      });
      result.current.addNotification({
        type: 'warning',
        title: 'Warning 1',
        message: 'First warning'
      });
    });

    expect(result.current.notifications).toHaveLength(3);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('generates unique ids for notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Info 1',
        message: 'First info'
      });
      result.current.addNotification({
        type: 'info',
        title: 'Info 2',
        message: 'Second info'
      });
    });

    const ids = result.current.notifications.map(n => n.id);
    expect(ids[0]).not.toBe(ids[1]);
    expect(new Set(ids).size).toBe(2); // All ids are unique
  });

  it('preserves notification properties', () => {
    const { result } = renderHook(() => useNotifications());
    
    const notification = {
      type: 'warning' as const,
      title: 'Warning Title',
      message: 'Warning message with details',
      duration: 10000
    };

    act(() => {
      result.current.addNotification(notification);
    });

    const addedNotification = result.current.notifications[0];
    expect(addedNotification.type).toBe(notification.type);
    expect(addedNotification.title).toBe(notification.title);
    expect(addedNotification.message).toBe(notification.message);
    expect(addedNotification.duration).toBe(notification.duration);
  });
});