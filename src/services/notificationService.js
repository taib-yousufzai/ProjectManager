import { collection, addDoc, query, where, orderBy, limit, onSnapshot, updateDoc, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../models';

export class NotificationService {
  constructor() {
    this.collectionName = 'notifications';
    this.collectionRef = collection(db, this.collectionName);
  }

  // Create a new notification
  async createNotification(notificationData) {
    try {
      const notification = createNotification({
        ...notificationData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const docRef = await addDoc(this.collectionRef, notification);
      return { id: docRef.id, ...notification };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for a specific user
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        limitCount = 50,
        unreadOnly = false,
        type = null
      } = options;

      let q = query(
        this.collectionRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (unreadOnly) {
        q = query(
          this.collectionRef,
          where('userId', '==', userId),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      if (type) {
        q = query(
          this.collectionRef,
          where('userId', '==', userId),
          where('type', '==', type),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: new Date(),
        updatedAt: new Date()
      });
      return notificationId;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const q = query(
        this.collectionRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          read: true,
          readAt: new Date(),
          updatedAt: new Date()
        })
      );

      await Promise.all(updatePromises);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete a notification
  async deleteNotification(notificationId) {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await deleteDoc(notificationRef);
      return notificationId;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Get unread count for a user
  async getUnreadCount(userId) {
    try {
      const q = query(
        this.collectionRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Subscribe to real-time notifications for a user
  subscribeToUserNotifications(userId, callback, options = {}) {
    try {
      const {
        limitCount = 20,
        unreadOnly = false
      } = options;

      let q = query(
        this.collectionRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (unreadOnly) {
        q = query(
          this.collectionRef,
          where('userId', '==', userId),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(notifications);
      });
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      throw error;
    }
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications() {
    try {
      const now = new Date();
      const q = query(
        this.collectionRef,
        where('expiresAt', '<=', now)
      );

      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  // Notification creation helpers for common scenarios

  // Payment added notification
  async notifyPaymentAdded(paymentData, projectData, createdBy) {
    const teamMembers = projectData.teamMembers || [];
    const notifications = [];

    for (const userId of teamMembers) {
      if (userId !== createdBy) { // Don't notify the creator
        const notification = await this.createNotification({
          type: NOTIFICATION_TYPES.PAYMENT_ADDED,
          userId,
          title: 'New Payment Added',
          message: `A new payment of $${paymentData.amount} was added to project "${projectData.name}"`,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          metadata: {
            projectId: projectData.id,
            paymentId: paymentData.id,
            amount: paymentData.amount
          },
          actionUrl: `/projects/${projectData.id}?tab=payments`,
          createdBy
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }

  // Proof uploaded notification
  async notifyProofUploaded(paymentData, projectData, uploadedBy) {
    const teamMembers = projectData.teamMembers || [];
    const notifications = [];

    for (const userId of teamMembers) {
      if (userId !== uploadedBy && !paymentData.approvedBy.includes(userId)) {
        const notification = await this.createNotification({
          type: NOTIFICATION_TYPES.PROOF_UPLOADED,
          userId,
          title: 'Payment Proof Uploaded',
          message: `Payment proof uploaded for $${paymentData.amount} in "${projectData.name}". Please review and approve.`,
          priority: NOTIFICATION_PRIORITIES.HIGH,
          metadata: {
            projectId: projectData.id,
            paymentId: paymentData.id,
            amount: paymentData.amount
          },
          actionUrl: `/projects/${projectData.id}?tab=payments&payment=${paymentData.id}`,
          createdBy: uploadedBy
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }

  // Payment verified notification
  async notifyPaymentVerified(paymentData, projectData) {
    const teamMembers = projectData.teamMembers || [];
    const notifications = [];

    for (const userId of teamMembers) {
      const notification = await this.createNotification({
        type: NOTIFICATION_TYPES.PAYMENT_VERIFIED,
        userId,
        title: 'Payment Verified',
        message: `Payment of $${paymentData.amount} in "${projectData.name}" has been verified by the team.`,
        priority: NOTIFICATION_PRIORITIES.MEDIUM,
        metadata: {
          projectId: projectData.id,
          paymentId: paymentData.id,
          amount: paymentData.amount
        },
        actionUrl: `/projects/${projectData.id}?tab=payments`,
        createdBy: null
      });
      notifications.push(notification);
    }

    return notifications;
  }

  // Payment reminder notification
  async notifyPaymentReminder(paymentData, projectData, daysPending) {
    const teamMembers = projectData.teamMembers || [];
    const notifications = [];

    for (const userId of teamMembers) {
      if (!paymentData.approvedBy.includes(userId)) {
        const notification = await this.createNotification({
          type: NOTIFICATION_TYPES.PAYMENT_REMINDER,
          userId,
          title: 'Payment Approval Reminder',
          message: `Payment of $${paymentData.amount} in "${projectData.name}" has been pending approval for ${daysPending} days.`,
          priority: NOTIFICATION_PRIORITIES.HIGH,
          metadata: {
            projectId: projectData.id,
            paymentId: paymentData.id,
            amount: paymentData.amount,
            daysPending
          },
          actionUrl: `/projects/${projectData.id}?tab=payments&payment=${paymentData.id}`,
          createdBy: null
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }

  // Project created notification
  async notifyProjectCreated(projectData, createdBy) {
    const teamMembers = projectData.teamMembers || [];
    const notifications = [];

    for (const userId of teamMembers) {
      if (userId !== createdBy) {
        const notification = await this.createNotification({
          type: NOTIFICATION_TYPES.PROJECT_CREATED,
          userId,
          title: 'Added to New Project',
          message: `You've been added to the project "${projectData.name}"`,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          metadata: {
            projectId: projectData.id
          },
          actionUrl: `/projects/${projectData.id}`,
          createdBy
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }

  // System alert notification
  async notifySystemAlert(userIds, title, message, priority = NOTIFICATION_PRIORITIES.MEDIUM) {
    const notifications = [];

    for (const userId of userIds) {
      const notification = await this.createNotification({
        type: NOTIFICATION_TYPES.SYSTEM_ALERT,
        userId,
        title,
        message,
        priority,
        metadata: {},
        createdBy: null
      });
      notifications.push(notification);
    }

    return notifications;
  }

  // Revenue rule created notification
  async notifyRevenueRuleCreated(ruleData, createdBy) {
    // For now, we'll notify all admin users about revenue rule changes
    // This can be extended to get actual admin users from the database
    const adminUserIds = []; // TODO: Get admin user IDs from user service
    const notifications = [];

    for (const userId of adminUserIds) {
      if (userId !== createdBy) {
        const notification = await this.createNotification({
          type: NOTIFICATION_TYPES.REVENUE_RULE_CREATED,
          userId,
          title: 'New Revenue Rule Created',
          message: `A new revenue rule "${ruleData.ruleName}" has been created.`,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          metadata: {
            ruleId: ruleData.id,
            ruleName: ruleData.ruleName
          },
          actionUrl: '/revenue-rules',
          createdBy
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }

  // Revenue rule modified notification
  async notifyRevenueRuleModified(ruleData, modifiedBy) {
    // For now, we'll notify all admin users about revenue rule changes
    // This can be extended to get actual admin users from the database
    const adminUserIds = []; // TODO: Get admin user IDs from user service
    const notifications = [];

    for (const userId of adminUserIds) {
      if (userId !== modifiedBy) {
        const notification = await this.createNotification({
          type: NOTIFICATION_TYPES.REVENUE_RULE_MODIFIED,
          userId,
          title: 'Revenue Rule Modified',
          message: `Revenue rule "${ruleData.ruleName}" has been modified.`,
          priority: NOTIFICATION_PRIORITIES.HIGH,
          metadata: {
            ruleId: ruleData.id,
            ruleName: ruleData.ruleName
          },
          actionUrl: '/revenue-rules',
          createdBy: modifiedBy
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }

  // Settlement completed notification
  async notifySettlementCompleted(settlementData, ledgerEntries, createdBy) {
    // Notify the party that received the settlement
    const notifications = [];

    const totalAmount = settlementData.totalAmount;
    const currency = settlementData.currency;
    const party = settlementData.party;

    // TODO: Get actual user IDs for the party based on party type
    // For now, we'll create a placeholder implementation
    const partyUserIds = await this.getPartyUserIds(party);

    for (const userId of partyUserIds) {
      const notification = await this.createNotification({
        type: NOTIFICATION_TYPES.SETTLEMENT_COMPLETED,
        userId,
        title: 'Settlement Completed',
        message: `A settlement of ${totalAmount} ${currency} has been completed for ${party} party.`,
        priority: NOTIFICATION_PRIORITIES.MEDIUM,
        metadata: {
          settlementId: settlementData.id,
          party: party,
          amount: totalAmount,
          currency: currency,
          entryCount: ledgerEntries.length
        },
        actionUrl: '/ledger',
        createdBy
      });
      notifications.push(notification);
    }

    return notifications;
  }

  // Settlement reminder notification
  async notifySettlementReminder(party, balanceData) {
    const partyUserIds = await this.getPartyUserIds(party);
    const notifications = [];

    for (const userId of partyUserIds) {
      const notification = await this.createNotification({
        type: NOTIFICATION_TYPES.SETTLEMENT_REMINDER,
        userId,
        title: 'Settlement Reminder',
        message: `You have pending settlements totaling ${balanceData.totalPending} ${balanceData.currency} for ${party} party.`,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        metadata: {
          party: party,
          amount: balanceData.totalPending,
          currency: balanceData.currency
        },
        actionUrl: '/ledger',
        createdBy: null
      });
      notifications.push(notification);
    }

    return notifications;
  }

  // Ledger entry created notification
  async notifyLedgerEntryCreated(ledgerEntry, paymentData, projectData) {
    const notifications = [];
    const partyUserIds = await this.getPartyUserIds(ledgerEntry.party);

    for (const userId of partyUserIds) {
      const notification = await this.createNotification({
        type: NOTIFICATION_TYPES.LEDGER_ENTRY_CREATED,
        userId,
        title: 'New Ledger Entry',
        message: `A new ${ledgerEntry.type} entry of ${ledgerEntry.amount} ${ledgerEntry.currency} has been created for ${ledgerEntry.party} party from project "${projectData.name}".`,
        priority: NOTIFICATION_PRIORITIES.MEDIUM,
        metadata: {
          ledgerEntryId: ledgerEntry.id,
          paymentId: paymentData.id,
          projectId: projectData.id,
          party: ledgerEntry.party,
          amount: ledgerEntry.amount,
          currency: ledgerEntry.currency,
          type: ledgerEntry.type
        },
        actionUrl: `/ledger?entry=${ledgerEntry.id}`,
        createdBy: null
      });
      notifications.push(notification);
    }

    return notifications;
  }

  // Revenue processing notification
  async notifyRevenueProcessed(paymentData, ledgerEntries, projectData) {
    const notifications = [];
    
    // Notify all parties that received ledger entries
    const partiesNotified = new Set();
    
    for (const entry of ledgerEntries) {
      if (!partiesNotified.has(entry.party)) {
        const partyUserIds = await this.getPartyUserIds(entry.party);
        
        for (const userId of partyUserIds) {
          const notification = await this.createNotification({
            type: NOTIFICATION_TYPES.LEDGER_ENTRY_CREATED,
            userId,
            title: 'Revenue Processed',
            message: `Revenue from payment of ${paymentData.amount} ${paymentData.currency} in "${projectData.name}" has been processed. Your ${entry.party} share: ${entry.amount} ${entry.currency}`,
            priority: NOTIFICATION_PRIORITIES.MEDIUM,
            metadata: {
              paymentId: paymentData.id,
              projectId: projectData.id,
              party: entry.party,
              amount: entry.amount,
              currency: entry.currency,
              ledgerEntryId: entry.id
            },
            actionUrl: `/ledger?entry=${entry.id}`,
            createdBy: null
          });
          notifications.push(notification);
        }
        
        partiesNotified.add(entry.party);
      }
    }
    
    return notifications;
  }

  // Scheduled profit summary notification
  async sendProfitSummary(userId, summaryData, period = 'monthly') {
    const notification = await this.createNotification({
      type: NOTIFICATION_TYPES.SUMMARY_REPORT,
      userId,
      title: `${period.charAt(0).toUpperCase() + period.slice(1)} Profit Summary`,
      message: `Your ${period} profit summary is ready. Total earnings: ${summaryData.totalEarnings} ${summaryData.currency}`,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      metadata: {
        period,
        totalEarnings: summaryData.totalEarnings,
        currency: summaryData.currency,
        entryCount: summaryData.entryCount,
        pendingAmount: summaryData.pendingAmount,
        clearedAmount: summaryData.clearedAmount
      },
      actionUrl: '/ledger',
      createdBy: null
    });
    
    return notification;
  }

  // Bulk profit summary for all users
  async sendBulkProfitSummaries(summaryDataByUser, period = 'monthly') {
    const notifications = [];
    
    for (const [userId, summaryData] of Object.entries(summaryDataByUser)) {
      if (summaryData.totalEarnings > 0) { // Only send if there are earnings
        const notification = await this.sendProfitSummary(userId, summaryData, period);
        notifications.push(notification);
      }
    }
    
    return notifications;
  }

  // Revenue rule impact notification
  async notifyRevenueRuleImpact(ruleData, affectedProjects, modifiedBy) {
    const notifications = [];
    const affectedUserIds = new Set();
    
    // Collect all users from affected projects
    for (const project of affectedProjects) {
      for (const userId of project.teamMembers || []) {
        affectedUserIds.add(userId);
      }
    }
    
    for (const userId of affectedUserIds) {
      if (userId !== modifiedBy) {
        const notification = await this.createNotification({
          type: NOTIFICATION_TYPES.REVENUE_RULE_MODIFIED,
          userId,
          title: 'Revenue Rule Updated',
          message: `Revenue rule "${ruleData.ruleName}" has been updated and may affect ${affectedProjects.length} project(s). Future payments will use the new split percentages.`,
          priority: NOTIFICATION_PRIORITIES.HIGH,
          metadata: {
            ruleId: ruleData.id,
            ruleName: ruleData.ruleName,
            affectedProjectCount: affectedProjects.length,
            affectedProjectIds: affectedProjects.map(p => p.id)
          },
          actionUrl: '/revenue-rules',
          createdBy: modifiedBy
        });
        notifications.push(notification);
      }
    }
    
    return notifications;
  }

  // Settlement batch notification
  async notifySettlementBatch(settlements, createdBy) {
    const notifications = [];
    const partySummaries = {};
    
    // Group settlements by party
    for (const settlement of settlements) {
      if (!partySummaries[settlement.party]) {
        partySummaries[settlement.party] = {
          totalAmount: 0,
          currency: settlement.currency,
          count: 0
        };
      }
      partySummaries[settlement.party].totalAmount += settlement.totalAmount;
      partySummaries[settlement.party].count += 1;
    }
    
    // Send notifications to each party
    for (const [party, summary] of Object.entries(partySummaries)) {
      const partyUserIds = await this.getPartyUserIds(party);
      
      for (const userId of partyUserIds) {
        const notification = await this.createNotification({
          type: NOTIFICATION_TYPES.SETTLEMENT_COMPLETED,
          userId,
          title: 'Batch Settlement Completed',
          message: `${summary.count} settlement(s) totaling ${summary.totalAmount} ${summary.currency} have been completed for ${party} party.`,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          metadata: {
            party,
            totalAmount: summary.totalAmount,
            currency: summary.currency,
            settlementCount: summary.count,
            batchId: `batch_${Date.now()}`
          },
          actionUrl: '/ledger',
          createdBy
        });
        notifications.push(notification);
      }
    }
    
    return notifications;
  }

  // Helper method to get user IDs for a party
  async getPartyUserIds(party) {
    try {
      // Query users collection to find users associated with the party
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('party', '==', party),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error(`Error getting user IDs for party ${party}:`, error);
      // Fallback: return empty array if users collection doesn't have party field yet
      return [];
    }
  }

  // Check user notification preferences
  async getUserNotificationPreferences(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        return userData.notificationPreferences || this.getDefaultNotificationPreferences();
      }
      
      return this.getDefaultNotificationPreferences();
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      return this.getDefaultNotificationPreferences();
    }
  }

  // Get default notification preferences
  getDefaultNotificationPreferences() {
    return {
      ledgerEntryCreated: true,
      settlementCompleted: true,
      settlementReminder: true,
      revenueRuleModified: true,
      profitSummary: {
        enabled: true,
        frequency: 'monthly' // 'weekly', 'monthly', 'quarterly'
      },
      deliveryMethods: {
        inApp: true,
        email: false, // Email delivery not implemented yet
        push: false   // Push notifications not implemented yet
      }
    };
  }

  // Update user notification preferences
  async updateUserNotificationPreferences(userId, preferences) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notificationPreferences: preferences,
        updatedAt: new Date()
      });
      return preferences;
    } catch (error) {
      console.error('Error updating user notification preferences:', error);
      throw error;
    }
  }

  // Create notification with preference check
  async createNotificationWithPreferences(notificationData) {
    try {
      const preferences = await this.getUserNotificationPreferences(notificationData.userId);
      
      // Check if user wants this type of notification
      const notificationType = notificationData.type;
      let shouldSend = true;
      
      switch (notificationType) {
        case NOTIFICATION_TYPES.LEDGER_ENTRY_CREATED:
          shouldSend = preferences.ledgerEntryCreated;
          break;
        case NOTIFICATION_TYPES.SETTLEMENT_COMPLETED:
          shouldSend = preferences.settlementCompleted;
          break;
        case NOTIFICATION_TYPES.SETTLEMENT_REMINDER:
          shouldSend = preferences.settlementReminder;
          break;
        case NOTIFICATION_TYPES.REVENUE_RULE_MODIFIED:
          shouldSend = preferences.revenueRuleModified;
          break;
        case NOTIFICATION_TYPES.SUMMARY_REPORT:
          shouldSend = preferences.profitSummary?.enabled;
          break;
        default:
          shouldSend = true; // Send other notification types by default
      }
      
      if (shouldSend && preferences.deliveryMethods?.inApp) {
        return await this.createNotification(notificationData);
      }
      
      return null; // Notification not sent due to user preferences
    } catch (error) {
      console.error('Error creating notification with preferences:', error);
      // Fallback: create notification anyway to ensure important notifications are delivered
      return await this.createNotification(notificationData);
    }
  }
}

export const notificationService = new NotificationService();