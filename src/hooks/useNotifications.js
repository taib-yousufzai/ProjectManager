import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { useAuth } from './useAuth';

export const useNotifications = (options = {}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    limitCount = 20,
    autoRefresh = true,
    unreadOnly = false
  } = options;

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const [notificationsData, unreadCountData] = await Promise.all([
        notificationService.getUserNotifications(user.id, { limitCount, unreadOnly }),
        notificationService.getUnreadCount(user.id)
      ]);

      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, limitCount, unreadOnly]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true, readAt: new Date() }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err.message);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const markedCount = await notificationService.markAllAsRead(user.id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          read: true, 
          readAt: new Date() 
        }))
      );
      
      setUnreadCount(0);
      return markedCount;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message);
    }
  }, [user?.id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if deleted notification was unread
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err.message);
    }
  }, [notifications]);

  // Refresh notifications
  const refresh = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id || !autoRefresh) return;

    const unsubscribe = notificationService.subscribeToUserNotifications(
      user.id,
      (newNotifications) => {
        setNotifications(newNotifications);
        
        // Update unread count
        const unreadCount = newNotifications.filter(n => !n.read).length;
        setUnreadCount(unreadCount);
        
        setIsLoading(false);
      },
      { limitCount }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id, autoRefresh, limitCount]);

  // Load initial data if not using real-time updates
  useEffect(() => {
    if (!autoRefresh) {
      loadNotifications();
    }
  }, [loadNotifications, autoRefresh]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh
  };
};