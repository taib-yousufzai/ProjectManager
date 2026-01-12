import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from '../notificationService';
import { reminderService } from '../reminderService';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
}));

describe('Notification System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NotificationService', () => {
    it('should create notification service instance', () => {
      expect(notificationService).toBeDefined();
      expect(notificationService.collectionName).toBe('notifications');
    });

    it('should have all required methods', () => {
      expect(typeof notificationService.createNotification).toBe('function');
      expect(typeof notificationService.getUserNotifications).toBe('function');
      expect(typeof notificationService.markAsRead).toBe('function');
      expect(typeof notificationService.markAllAsRead).toBe('function');
      expect(typeof notificationService.deleteNotification).toBe('function');
      expect(typeof notificationService.getUnreadCount).toBe('function');
      expect(typeof notificationService.subscribeToUserNotifications).toBe('function');
      expect(typeof notificationService.cleanupExpiredNotifications).toBe('function');
    });

    it('should have notification helper methods', () => {
      expect(typeof notificationService.notifyPaymentAdded).toBe('function');
      expect(typeof notificationService.notifyProofUploaded).toBe('function');
      expect(typeof notificationService.notifyPaymentVerified).toBe('function');
      expect(typeof notificationService.notifyPaymentReminder).toBe('function');
      expect(typeof notificationService.notifyProjectCreated).toBe('function');
      expect(typeof notificationService.notifySystemAlert).toBe('function');
    });
  });

  describe('ReminderService', () => {
    it('should create reminder service instance', () => {
      expect(reminderService).toBeDefined();
      expect(reminderService.reminderIntervals).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof reminderService.startPaymentReminders).toBe('function');
      expect(typeof reminderService.stopPaymentReminders).toBe('function');
      expect(typeof reminderService.startNotificationCleanup).toBe('function');
      expect(typeof reminderService.stopNotificationCleanup).toBe('function');
      expect(typeof reminderService.sendWeeklySummary).toBe('function');
      expect(typeof reminderService.sendMonthlySummary).toBe('function');
      expect(typeof reminderService.startAllReminders).toBe('function');
      expect(typeof reminderService.stopAllReminders).toBe('function');
      expect(typeof reminderService.getStatus).toBe('function');
    });

    it('should track reminder intervals', () => {
      const status = reminderService.getStatus();
      expect(status).toHaveProperty('paymentReminders');
      expect(status).toHaveProperty('notificationCleanup');
      expect(status).toHaveProperty('activeIntervals');
    });
  });

  describe('Integration', () => {
    it('should start and stop all reminders', () => {
      // Start reminders
      reminderService.startAllReminders({
        paymentReminderInterval: 1, // 1 hour for testing
        paymentReminderDays: 1,
        cleanupInterval: 1
      });

      let status = reminderService.getStatus();
      expect(status.paymentReminders).toBe(true);
      expect(status.notificationCleanup).toBe(true);
      expect(status.activeIntervals).toBe(2);

      // Stop reminders
      reminderService.stopAllReminders();

      status = reminderService.getStatus();
      expect(status.paymentReminders).toBe(false);
      expect(status.notificationCleanup).toBe(false);
      expect(status.activeIntervals).toBe(0);
    });
  });
});