import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { settlementService } from '../services/settlementService';
import { useAuth } from './useAuth';

export const useSettlementNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch settlement-related notifications
  const fetchSettlementNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get settlement-related notifications
      const settlementNotifications = await notificationService.getUserNotifications(
        user.id,
        { 
          limitCount: 50,
          type: null // Get all notifications, we'll filter client-side
        }
      );

      // Filter for settlement-related notifications
      const filteredNotifications = settlementNotifications.filter(notification => 
        notification.type === 'settlement_completed' ||
        notification.type === 'settlement_reminder' ||
        notification.type === 'ledger_entry_created'
      );

      setNotifications(filteredNotifications);
      
      // Count unread settlement notifications
      const unread = filteredNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error fetching settlement notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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

  // Mark all settlement notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Mark each unread notification as read
      const markPromises = unreadNotifications.map(notification => 
        notificationService.markAsRead(notification.id)
      );
      
      await Promise.all(markPromises);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          read: true, 
          readAt: new Date() 
        }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message);
    }
  }, [notifications]);

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

  // Send settlement reminder notifications
  const sendSettlementReminders = useCallback(async (thresholdAmount = 1000) => {
    try {
      const reminders = await settlementService.sendSettlementReminders(thresholdAmount);
      
      // Refresh notifications to show new reminders
      await fetchSettlementNotifications();
      
      return reminders;
    } catch (err) {
      console.error('Error sending settlement reminders:', err);
      setError(err.message);
      throw err;
    }
  }, [fetchSettlementNotifications]);

  // Subscribe to real-time settlement notifications
  useEffect(() => {
    if (!user?.id) return;

    let unsubscribe;

    const subscribeToNotifications = () => {
      unsubscribe = notificationService.subscribeToUserNotifications(
        user.id,
        (updatedNotifications) => {
          // Filter for settlement-related notifications
          const settlementNotifications = updatedNotifications.filter(notification => 
            notification.type === 'settlement_completed' ||
            notification.type === 'settlement_reminder' ||
            notification.type === 'ledger_entry_created'
          );

          setNotifications(settlementNotifications);
          
          // Update unread count
          const unread = settlementNotifications.filter(n => !n.read).length;
          setUnreadCount(unread);
        },
        { limitCount: 50 }
      );
    };

    subscribeToNotifications();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchSettlementNotifications();
  }, [fetchSettlementNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendSettlementReminders,
    refresh: fetchSettlementNotifications
  };
};

export default useSettlementNotifications;