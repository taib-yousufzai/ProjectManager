import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export class NotificationPreferencesService {
  constructor() {
    this.collectionName = 'users';
  }

  // Get default notification preferences
  getDefaultPreferences() {
    return {
      // Ledger and financial notifications
      ledgerEntryCreated: true,
      settlementCompleted: true,
      settlementReminder: true,
      revenueRuleModified: true,
      
      // Summary and reporting
      profitSummary: {
        enabled: true,
        frequency: 'monthly', // 'weekly', 'monthly', 'quarterly'
        dayOfWeek: 1, // Monday for weekly summaries
        dayOfMonth: 1 // 1st of month for monthly summaries
      },
      
      // Payment notifications (existing)
      paymentAdded: true,
      paymentVerified: true,
      paymentReminder: true,
      proofUploaded: true,
      
      // Project notifications (existing)
      projectCreated: true,
      projectCompleted: true,
      
      // System notifications
      systemAlert: true,
      
      // Delivery methods
      deliveryMethods: {
        inApp: true,
        email: false, // Email delivery not implemented yet
        push: false   // Push notifications not implemented yet
      },
      
      // Quiet hours (future feature)
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC'
      }
    };
  }

  // Get user notification preferences
  async getUserPreferences(userId) {
    try {
      const userRef = doc(db, this.collectionName, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const preferences = userData.notificationPreferences;
        
        if (preferences) {
          // Merge with defaults to ensure all properties exist
          return { ...this.getDefaultPreferences(), ...preferences };
        }
      }
      
      // Return defaults if no preferences found
      return this.getDefaultPreferences();
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  // Update user notification preferences
  async updateUserPreferences(userId, preferences) {
    try {
      const userRef = doc(db, this.collectionName, userId);
      
      // Merge with existing preferences to avoid overwriting unspecified fields
      const currentPreferences = await this.getUserPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      await updateDoc(userRef, {
        notificationPreferences: updatedPreferences,
        updatedAt: new Date()
      });
      
      return updatedPreferences;
    } catch (error) {
      console.error('Error updating user notification preferences:', error);
      throw error;
    }
  }

  // Check if user should receive a specific notification type
  async shouldReceiveNotification(userId, notificationType) {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      // Map notification types to preference keys
      const typeMapping = {
        'ledger_entry_created': 'ledgerEntryCreated',
        'settlement_completed': 'settlementCompleted',
        'settlement_reminder': 'settlementReminder',
        'revenue_rule_created': 'revenueRuleModified',
        'revenue_rule_modified': 'revenueRuleModified',
        'summary_report': 'profitSummary.enabled',
        'payment_added': 'paymentAdded',
        'payment_verified': 'paymentVerified',
        'payment_reminder': 'paymentReminder',
        'proof_uploaded': 'proofUploaded',
        'project_created': 'projectCreated',
        'project_completed': 'projectCompleted',
        'system_alert': 'systemAlert'
      };
      
      const preferenceKey = typeMapping[notificationType];
      if (!preferenceKey) {
        return true; // Default to sending if type not mapped
      }
      
      // Handle nested properties (e.g., 'profitSummary.enabled')
      if (preferenceKey.includes('.')) {
        const [parent, child] = preferenceKey.split('.');
        return preferences[parent]?.[child] ?? true;
      }
      
      return preferences[preferenceKey] ?? true;
    } catch (error) {
      console.error('Error checking notification preference:', error);
      return true; // Default to sending on error
    }
  }

  // Get users who should receive profit summaries for a given frequency
  async getUsersForProfitSummary(frequency = 'monthly') {
    try {
      const usersRef = collection(db, this.collectionName);
      const snapshot = await getDocs(usersRef);
      
      const eligibleUsers = [];
      
      for (const doc of snapshot.docs) {
        const userData = doc.data();
        const preferences = userData.notificationPreferences || this.getDefaultPreferences();
        
        if (preferences.profitSummary?.enabled && 
            preferences.profitSummary?.frequency === frequency &&
            preferences.deliveryMethods?.inApp) {
          eligibleUsers.push({
            userId: doc.id,
            preferences: preferences.profitSummary
          });
        }
      }
      
      return eligibleUsers;
    } catch (error) {
      console.error('Error getting users for profit summary:', error);
      return [];
    }
  }

  // Get all users with specific party association
  async getUsersByParty(party) {
    try {
      const usersRef = collection(db, this.collectionName);
      const q = query(
        usersRef,
        where('party', '==', party),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting users for party ${party}:`, error);
      return [];
    }
  }

  // Bulk update preferences for multiple users
  async bulkUpdatePreferences(updates) {
    try {
      const promises = updates.map(({ userId, preferences }) =>
        this.updateUserPreferences(userId, preferences)
      );
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { successful, failed, total: updates.length };
    } catch (error) {
      console.error('Error in bulk preference update:', error);
      throw error;
    }
  }

  // Reset user preferences to defaults
  async resetUserPreferences(userId) {
    try {
      const defaultPreferences = this.getDefaultPreferences();
      return await this.updateUserPreferences(userId, defaultPreferences);
    } catch (error) {
      console.error('Error resetting user preferences:', error);
      throw error;
    }
  }

  // Get preference statistics (for admin dashboard)
  async getPreferenceStatistics() {
    try {
      const usersRef = collection(db, this.collectionName);
      const snapshot = await getDocs(usersRef);
      
      const stats = {
        totalUsers: 0,
        enabledByType: {},
        deliveryMethods: { inApp: 0, email: 0, push: 0 },
        profitSummaryFrequency: { weekly: 0, monthly: 0, quarterly: 0 }
      };
      
      for (const doc of snapshot.docs) {
        const userData = doc.data();
        const preferences = userData.notificationPreferences || this.getDefaultPreferences();
        
        stats.totalUsers++;
        
        // Count enabled notification types
        Object.keys(preferences).forEach(key => {
          if (typeof preferences[key] === 'boolean' && preferences[key]) {
            stats.enabledByType[key] = (stats.enabledByType[key] || 0) + 1;
          }
        });
        
        // Count delivery methods
        if (preferences.deliveryMethods) {
          Object.keys(preferences.deliveryMethods).forEach(method => {
            if (preferences.deliveryMethods[method]) {
              stats.deliveryMethods[method]++;
            }
          });
        }
        
        // Count profit summary frequencies
        if (preferences.profitSummary?.enabled) {
          const frequency = preferences.profitSummary.frequency || 'monthly';
          stats.profitSummaryFrequency[frequency]++;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting preference statistics:', error);
      throw error;
    }
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();