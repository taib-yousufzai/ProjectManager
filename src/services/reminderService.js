import { paymentService } from './paymentService';
import { notificationService } from './notificationService';

export class ReminderService {
  constructor() {
    this.reminderIntervals = new Map();
  }

  // Start automatic payment reminders
  startPaymentReminders(intervalHours = 24, daysPending = 7) {
    // Clear existing interval if any
    this.stopPaymentReminders();

    const intervalMs = intervalHours * 60 * 60 * 1000; // Convert hours to milliseconds
    
    const intervalId = setInterval(async () => {
      try {
        console.log('Running scheduled payment reminders...');
        const reminderCount = await paymentService.sendPaymentReminders(daysPending);
        console.log(`Sent ${reminderCount} payment reminders`);
      } catch (error) {
        console.error('Error in scheduled payment reminders:', error);
      }
    }, intervalMs);

    this.reminderIntervals.set('paymentReminders', intervalId);
    
    // Also run immediately
    setTimeout(async () => {
      try {
        const reminderCount = await paymentService.sendPaymentReminders(daysPending);
        console.log(`Initial payment reminders sent: ${reminderCount}`);
      } catch (error) {
        console.error('Error in initial payment reminders:', error);
      }
    }, 5000); // Wait 5 seconds after startup

    return intervalId;
  }

  // Stop payment reminders
  stopPaymentReminders() {
    const intervalId = this.reminderIntervals.get('paymentReminders');
    if (intervalId) {
      clearInterval(intervalId);
      this.reminderIntervals.delete('paymentReminders');
    }
  }

  // Start cleanup of expired notifications
  startNotificationCleanup(intervalHours = 24) {
    // Clear existing interval if any
    this.stopNotificationCleanup();

    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    const intervalId = setInterval(async () => {
      try {
        console.log('Running notification cleanup...');
        const cleanedCount = await notificationService.cleanupExpiredNotifications();
        console.log(`Cleaned up ${cleanedCount} expired notifications`);
      } catch (error) {
        console.error('Error in notification cleanup:', error);
      }
    }, intervalMs);

    this.reminderIntervals.set('notificationCleanup', intervalId);
    return intervalId;
  }

  // Stop notification cleanup
  stopNotificationCleanup() {
    const intervalId = this.reminderIntervals.get('notificationCleanup');
    if (intervalId) {
      clearInterval(intervalId);
      this.reminderIntervals.delete('notificationCleanup');
    }
  }

  // Send weekly summary notifications
  async sendWeeklySummary(userIds) {
    try {
      const summaryPromises = userIds.map(async (userId) => {
        try {
          // Get user's payment and project stats
          const [paymentStats, projectStats] = await Promise.all([
            paymentService.getPaymentStats(userId),
            // Assuming we have project service available
            // projectService.getProjectStats(userId)
          ]);

          const message = `Weekly Summary: ${paymentStats.completed} payments completed, ${paymentStats.pending} pending approval. Total revenue: $${paymentStats.completedAmount.toLocaleString()}`;

          await notificationService.createNotification({
            type: 'summary_report',
            userId,
            title: 'Weekly Summary Report',
            message,
            priority: 'medium',
            metadata: {
              paymentStats,
              // projectStats,
              reportType: 'weekly'
            }
          });
        } catch (error) {
          console.error(`Error sending weekly summary to user ${userId}:`, error);
        }
      });

      await Promise.all(summaryPromises);
      return userIds.length;
    } catch (error) {
      console.error('Error sending weekly summaries:', error);
      throw error;
    }
  }

  // Send monthly summary notifications
  async sendMonthlySummary(userIds) {
    try {
      const summaryPromises = userIds.map(async (userId) => {
        try {
          const [paymentStats, monthlyAnalytics] = await Promise.all([
            paymentService.getPaymentStats(userId),
            paymentService.getPaymentAnalytics(userId, 1) // Last month
          ]);

          const currentMonth = monthlyAnalytics[0] || { completedAmount: 0, completedCount: 0 };
          
          const message = `Monthly Summary: $${currentMonth.completedAmount.toLocaleString()} revenue from ${currentMonth.completedCount} payments. ${paymentStats.pending} payments still pending approval.`;

          await notificationService.createNotification({
            type: 'summary_report',
            userId,
            title: 'Monthly Summary Report',
            message,
            priority: 'medium',
            metadata: {
              paymentStats,
              monthlyAnalytics: currentMonth,
              reportType: 'monthly'
            }
          });
        } catch (error) {
          console.error(`Error sending monthly summary to user ${userId}:`, error);
        }
      });

      await Promise.all(summaryPromises);
      return userIds.length;
    } catch (error) {
      console.error('Error sending monthly summaries:', error);
      throw error;
    }
  }

  // Start all reminder services
  startAllReminders(config = {}) {
    const {
      paymentReminderInterval = 24, // hours
      paymentReminderDays = 7, // days pending
      cleanupInterval = 24 // hours
    } = config;
    
    this.startPaymentReminders(paymentReminderInterval, paymentReminderDays);
    this.startNotificationCleanup(cleanupInterval);
  }

  // Stop all reminder services
  stopAllReminders() {
    this.stopPaymentReminders();
    this.stopNotificationCleanup();
  }

  // Get status of all reminder services
  getStatus() {
    return {
      paymentReminders: this.reminderIntervals.has('paymentReminders'),
      notificationCleanup: this.reminderIntervals.has('notificationCleanup'),
      activeIntervals: this.reminderIntervals.size
    };
  }
}

export const reminderService = new ReminderService();