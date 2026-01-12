import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { notificationService } from './notificationService';
import { notificationPreferencesService } from './notificationPreferencesService';
import { ledgerService } from './ledgerService';

export class ProfitSummaryService {
  constructor() {
    this.ledgerCollectionName = 'ledgerEntries';
    this.usersCollectionName = 'users';
  }

  // Calculate profit summary for a user within a date range
  async calculateUserProfitSummary(userId, startDate, endDate, party = null) {
    try {
      // Get user's party if not provided
      if (!party) {
        const userParty = await this.getUserParty(userId);
        if (!userParty) {
          return null; // User has no party association
        }
        party = userParty;
      }

      // Query ledger entries for the user's party within date range
      const ledgerRef = collection(db, this.ledgerCollectionName);
      const q = query(
        ledgerRef,
        where('party', '==', party),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate summary statistics
      const summary = this.calculateSummaryStats(entries);
      
      return {
        userId,
        party,
        period: { startDate, endDate },
        ...summary,
        entries: entries.slice(0, 10) // Include recent 10 entries for reference
      };
    } catch (error) {
      console.error('Error calculating user profit summary:', error);
      throw error;
    }
  }

  // Calculate summary statistics from ledger entries
  calculateSummaryStats(entries) {
    const stats = {
      totalEarnings: 0,
      totalDebits: 0,
      netProfit: 0,
      entryCount: entries.length,
      pendingAmount: 0,
      clearedAmount: 0,
      currencyBreakdown: {},
      projectBreakdown: {},
      statusBreakdown: { pending: 0, cleared: 0 }
    };

    entries.forEach(entry => {
      const amount = entry.amount || 0;
      const currency = entry.currency || 'USD';

      // Initialize currency breakdown
      if (!stats.currencyBreakdown[currency]) {
        stats.currencyBreakdown[currency] = {
          earnings: 0,
          debits: 0,
          net: 0,
          pending: 0,
          cleared: 0
        };
      }

      // Initialize project breakdown
      if (entry.projectId && !stats.projectBreakdown[entry.projectId]) {
        stats.projectBreakdown[entry.projectId] = {
          earnings: 0,
          debits: 0,
          net: 0,
          entryCount: 0
        };
      }

      // Calculate totals
      if (entry.type === 'credit') {
        stats.totalEarnings += amount;
        stats.currencyBreakdown[currency].earnings += amount;
        if (entry.projectId) {
          stats.projectBreakdown[entry.projectId].earnings += amount;
        }
      } else if (entry.type === 'debit') {
        stats.totalDebits += amount;
        stats.currencyBreakdown[currency].debits += amount;
        if (entry.projectId) {
          stats.projectBreakdown[entry.projectId].debits += amount;
        }
      }

      // Status-based calculations
      if (entry.status === 'pending') {
        stats.pendingAmount += (entry.type === 'credit' ? amount : -amount);
        stats.currencyBreakdown[currency].pending += (entry.type === 'credit' ? amount : -amount);
        stats.statusBreakdown.pending++;
      } else if (entry.status === 'cleared') {
        stats.clearedAmount += (entry.type === 'credit' ? amount : -amount);
        stats.currencyBreakdown[currency].cleared += (entry.type === 'credit' ? amount : -amount);
        stats.statusBreakdown.cleared++;
      }

      // Project entry count
      if (entry.projectId) {
        stats.projectBreakdown[entry.projectId].entryCount++;
        stats.projectBreakdown[entry.projectId].net = 
          stats.projectBreakdown[entry.projectId].earnings - stats.projectBreakdown[entry.projectId].debits;
      }
    });

    // Calculate net profit and currency nets
    stats.netProfit = stats.totalEarnings - stats.totalDebits;
    
    Object.keys(stats.currencyBreakdown).forEach(currency => {
      stats.currencyBreakdown[currency].net = 
        stats.currencyBreakdown[currency].earnings - stats.currencyBreakdown[currency].debits;
    });

    // Determine primary currency (most used)
    const primaryCurrency = Object.keys(stats.currencyBreakdown).reduce((a, b) => 
      (stats.currencyBreakdown[a].earnings + stats.currencyBreakdown[a].debits) > 
      (stats.currencyBreakdown[b].earnings + stats.currencyBreakdown[b].debits) ? a : b
    ) || 'USD';

    stats.primaryCurrency = primaryCurrency;

    return stats;
  }

  // Get user's party association
  async getUserParty(userId) {
    try {
      const userRef = collection(db, this.usersCollectionName);
      const q = query(userRef, where('__name__', '==', userId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        return userData.party || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user party:', error);
      return null;
    }
  }

  // Generate date ranges for different frequencies
  getDateRangeForFrequency(frequency, referenceDate = new Date()) {
    const endDate = new Date(referenceDate);
    let startDate;

    switch (frequency) {
      case 'weekly':
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      default:
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 1);
    }

    return { startDate, endDate };
  }

  // Send profit summary to a single user
  async sendUserProfitSummary(userId, frequency = 'monthly') {
    try {
      const { startDate, endDate } = this.getDateRangeForFrequency(frequency);
      const summary = await this.calculateUserProfitSummary(userId, startDate, endDate);
      
      if (!summary || summary.totalEarnings === 0) {
        return null; // No earnings to report
      }

      // Send notification
      const notification = await notificationService.sendProfitSummary(userId, {
        totalEarnings: summary.totalEarnings,
        currency: summary.primaryCurrency,
        entryCount: summary.entryCount,
        pendingAmount: summary.pendingAmount,
        clearedAmount: summary.clearedAmount,
        netProfit: summary.netProfit
      }, frequency);

      return { summary, notification };
    } catch (error) {
      console.error('Error sending user profit summary:', error);
      throw error;
    }
  }

  // Send profit summaries to all eligible users
  async sendScheduledProfitSummaries(frequency = 'monthly') {
    try {
      // Get users who want profit summaries for this frequency
      const eligibleUsers = await notificationPreferencesService.getUsersForProfitSummary(frequency);
      
      if (eligibleUsers.length === 0) {
        return { sent: 0, failed: 0, total: 0 };
      }

      const results = [];
      
      for (const user of eligibleUsers) {
        try {
          const result = await this.sendUserProfitSummary(user.userId, frequency);
          results.push({ userId: user.userId, success: true, result });
        } catch (error) {
          console.error(`Failed to send profit summary to user ${user.userId}:`, error);
          results.push({ userId: user.userId, success: false, error: error.message });
        }
      }

      const sent = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return { sent, failed, total: eligibleUsers.length, results };
    } catch (error) {
      console.error('Error sending scheduled profit summaries:', error);
      throw error;
    }
  }

  // Get profit summary for display (without sending notification)
  async getProfitSummaryForUser(userId, frequency = 'monthly') {
    try {
      const { startDate, endDate } = this.getDateRangeForFrequency(frequency);
      return await this.calculateUserProfitSummary(userId, startDate, endDate);
    } catch (error) {
      console.error('Error getting profit summary for user:', error);
      throw error;
    }
  }

  // Get profit summaries for all parties (admin view)
  async getAllPartiesProfitSummary(frequency = 'monthly') {
    try {
      const { startDate, endDate } = this.getDateRangeForFrequency(frequency);
      const parties = ['admin', 'team', 'vendor'];
      const summaries = {};

      for (const party of parties) {
        // Get all users for this party
        const partyUsers = await notificationPreferencesService.getUsersByParty(party);
        
        if (partyUsers.length > 0) {
          // Calculate combined summary for the party
          const ledgerRef = collection(db, this.ledgerCollectionName);
          const q = query(
            ledgerRef,
            where('party', '==', party),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate)),
            orderBy('date', 'desc')
          );

          const snapshot = await getDocs(q);
          const entries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          summaries[party] = {
            party,
            userCount: partyUsers.length,
            ...this.calculateSummaryStats(entries)
          };
        }
      }

      return summaries;
    } catch (error) {
      console.error('Error getting all parties profit summary:', error);
      throw error;
    }
  }

  // Schedule profit summary job (to be called by a scheduler)
  async runScheduledSummaries() {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayOfMonth = now.getDate();
      
      const results = {
        weekly: null,
        monthly: null,
        quarterly: null
      };

      // Send weekly summaries on Mondays
      if (dayOfWeek === 1) {
        results.weekly = await this.sendScheduledProfitSummaries('weekly');
      }

      // Send monthly summaries on the 1st of each month
      if (dayOfMonth === 1) {
        results.monthly = await this.sendScheduledProfitSummaries('monthly');
      }

      // Send quarterly summaries on the 1st of Jan, Apr, Jul, Oct
      const month = now.getMonth(); // 0 = January
      if (dayOfMonth === 1 && [0, 3, 6, 9].includes(month)) {
        results.quarterly = await this.sendScheduledProfitSummaries('quarterly');
      }

      return results;
    } catch (error) {
      console.error('Error running scheduled summaries:', error);
      throw error;
    }
  }
}

export const profitSummaryService = new ProfitSummaryService();