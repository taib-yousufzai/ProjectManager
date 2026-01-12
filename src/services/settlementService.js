import { settlementsService, ledgerEntriesService } from './firestore';
import { createSettlement, LEDGER_ENTRY_STATUSES, PARTY_TYPES } from '../models';
import { ledgerService } from './ledgerService';
import { notificationService } from './notificationService';

export class SettlementService {
  // Create a bulk settlement
  async createBulkSettlement(settlementData, userId) {
    try {
      const settlement = await ledgerService.createSettlement(settlementData, userId);
      
      // Get ledger entries for notification
      const entryPromises = settlementData.ledgerEntryIds.map(id => 
        ledgerService.getLedgerEntry(id)
      );
      const ledgerEntries = await Promise.all(entryPromises);

      // Send settlement completion notification
      try {
        await notificationService.notifySettlementCompleted(
          settlement,
          ledgerEntries,
          userId
        );
      } catch (notificationError) {
        console.error('Error sending settlement notification:', notificationError);
        // Don't fail the settlement if notification fails
      }

      return settlement;
    } catch (error) {
      console.error('Error creating bulk settlement:', error);
      throw error;
    }
  }

  // Get all settlements
  async getSettlements(filters = {}) {
    try {
      let queryOptions = {
        orderBy: [['settlementDate', 'desc']]
      };

      const whereConditions = [];

      if (filters.party) {
        whereConditions.push(['party', '==', filters.party]);
      }

      if (filters.currency) {
        whereConditions.push(['currency', '==', filters.currency]);
      }

      if (whereConditions.length > 0) {
        queryOptions.where = whereConditions;
      }

      let settlements = await settlementsService.getAll(queryOptions);

      // Apply date range filter (client-side)
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        settlements = settlements.filter(settlement => {
          const settlementDate = settlement.settlementDate.toDate ? 
            settlement.settlementDate.toDate() : 
            new Date(settlement.settlementDate);
          return settlementDate >= start && settlementDate <= end;
        });
      }

      return settlements;
    } catch (error) {
      console.error('Error fetching settlements:', error);
      throw error;
    }
  }

  // Get a single settlement by ID
  async getSettlement(settlementId) {
    try {
      const settlement = await settlementsService.getById(settlementId);
      
      // Enrich with ledger entry details
      const entryPromises = settlement.ledgerEntryIds.map(id => 
        ledgerService.getLedgerEntry(id)
      );
      const entries = await Promise.all(entryPromises);

      return {
        ...settlement,
        ledgerEntries: entries
      };
    } catch (error) {
      console.error('Error fetching settlement:', error);
      throw error;
    }
  }

  // Get settlements for a specific party
  async getPartySettlements(party) {
    try {
      if (!Object.values(PARTY_TYPES).includes(party)) {
        throw new Error('Invalid party type');
      }

      return await this.getSettlements({ party });
    } catch (error) {
      console.error('Error fetching party settlements:', error);
      throw error;
    }
  }

  // Process settlement with proof upload
  async processSettlementWithProof(settlementData, proofFiles, userId) {
    try {
      // Create the settlement first
      const settlement = await this.createBulkSettlement(settlementData, userId);

      // If proof files are provided, handle them
      if (proofFiles && proofFiles.length > 0) {
        // Note: This would integrate with the existing file upload service
        // For now, we'll just store the URLs if they're already uploaded
        const proofUrls = Array.isArray(proofFiles) ? 
          proofFiles.map(file => file.url || file) : 
          [proofFiles.url || proofFiles];
        
        await settlementsService.update(settlement.id, {
          proofUrls: proofUrls
        });

        return {
          ...settlement,
          proofUrls: proofUrls
        };
      }

      return settlement;
    } catch (error) {
      console.error('Error processing settlement with proof:', error);
      throw error;
    }
  }

  // Get pending settlement amounts by party
  async getPendingSettlementAmounts() {
    try {
      const pendingAmounts = {};

      for (const party of Object.values(PARTY_TYPES)) {
        const balance = await ledgerService.getPartyBalance(party);
        pendingAmounts[party] = {
          totalPending: balance.totalPending,
          currency: balance.currency
        };
      }

      return pendingAmounts;
    } catch (error) {
      console.error('Error getting pending settlement amounts:', error);
      throw error;
    }
  }

  // Get settlement history for a party
  async getSettlementHistory(party, limit = 10) {
    try {
      if (!Object.values(PARTY_TYPES).includes(party)) {
        throw new Error('Invalid party type');
      }

      const settlements = await settlementsService.getAll({
        where: [['party', '==', party]],
        orderBy: [['settlementDate', 'desc']],
        limit: limit
      });

      return settlements;
    } catch (error) {
      console.error('Error fetching settlement history:', error);
      throw error;
    }
  }

  // Calculate settlement statistics
  async getSettlementStats(party = null) {
    try {
      const filters = party ? { party } : {};
      const settlements = await this.getSettlements(filters);

      const stats = {
        totalSettlements: settlements.length,
        totalAmount: settlements.reduce((sum, s) => sum + s.totalAmount, 0),
        averageAmount: settlements.length > 0 ? 
          settlements.reduce((sum, s) => sum + s.totalAmount, 0) / settlements.length : 0,
        settlementsThisMonth: 0,
        amountThisMonth: 0
      };

      // Calculate this month's statistics
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const thisMonthSettlements = settlements.filter(s => {
        const settlementDate = s.settlementDate.toDate ? 
          s.settlementDate.toDate() : 
          new Date(s.settlementDate);
        return settlementDate >= monthStart;
      });

      stats.settlementsThisMonth = thisMonthSettlements.length;
      stats.amountThisMonth = thisMonthSettlements.reduce((sum, s) => sum + s.totalAmount, 0);

      // Round amounts to 2 decimal places
      stats.totalAmount = Math.round(stats.totalAmount * 100) / 100;
      stats.averageAmount = Math.round(stats.averageAmount * 100) / 100;
      stats.amountThisMonth = Math.round(stats.amountThisMonth * 100) / 100;

      return stats;
    } catch (error) {
      console.error('Error calculating settlement stats:', error);
      throw error;
    }
  }

  // Validate settlement before processing
  async validateSettlementRequest(settlementData) {
    try {
      const errors = [];

      // Basic validation
      if (!settlementData.party || !Object.values(PARTY_TYPES).includes(settlementData.party)) {
        errors.push('Valid party is required');
      }

      if (!settlementData.ledgerEntryIds || settlementData.ledgerEntryIds.length === 0) {
        errors.push('At least one ledger entry must be selected');
      }

      // Validate ledger entries exist and are pending
      if (settlementData.ledgerEntryIds) {
        const entryPromises = settlementData.ledgerEntryIds.map(id => 
          ledgerService.getLedgerEntry(id).catch(() => null)
        );
        const entries = await Promise.all(entryPromises);

        const invalidEntries = entries.filter(entry => 
          !entry || 
          entry.status !== LEDGER_ENTRY_STATUSES.PENDING || 
          entry.party !== settlementData.party
        );

        if (invalidEntries.length > 0) {
          errors.push('Some selected entries are invalid, already settled, or belong to different party');
        }

        // Check currency consistency
        const currencies = entries
          .filter(entry => entry)
          .map(entry => entry.currency);
        const uniqueCurrencies = [...new Set(currencies)];

        if (uniqueCurrencies.length > 1) {
          errors.push('All selected entries must have the same currency');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: []
      };
    } catch (error) {
      console.error('Error validating settlement request:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to system error'],
        warnings: []
      };
    }
  }

  // Get recommended settlements (entries that should be settled together)
  async getRecommendedSettlements(party) {
    try {
      if (!Object.values(PARTY_TYPES).includes(party)) {
        throw new Error('Invalid party type');
      }

      const pendingEntries = await ledgerService.getPendingEntriesForSettlement(party);

      // Group by currency and project for recommendations
      const recommendations = {};

      pendingEntries.forEach(entry => {
        const key = `${entry.currency}_${entry.projectId}`;
        if (!recommendations[key]) {
          recommendations[key] = {
            currency: entry.currency,
            projectId: entry.projectId,
            entries: [],
            totalAmount: 0
          };
        }

        recommendations[key].entries.push(entry);
        const amount = entry.type === 'credit' ? entry.amount : -entry.amount;
        recommendations[key].totalAmount += amount;
      });

      // Convert to array and sort by total amount (descending)
      return Object.values(recommendations)
        .map(rec => ({
          ...rec,
          totalAmount: Math.round(rec.totalAmount * 100) / 100,
          entryCount: rec.entries.length
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);
    } catch (error) {
      console.error('Error getting recommended settlements:', error);
      throw error;
    }
  }

  // Subscribe to real-time settlement updates
  subscribeToSettlements(callback, party = null) {
    const queryOptions = {
      orderBy: [['settlementDate', 'desc']]
    };

    if (party) {
      queryOptions.where = [['party', '==', party]];
    }

    return settlementsService.subscribe(callback, queryOptions);
  }

  // Send settlement reminders
  async sendSettlementReminders(thresholdAmount = 1000) {
    try {
      const remindersSent = [];

      for (const party of Object.values(PARTY_TYPES)) {
        const balance = await ledgerService.getPartyBalance(party);
        
        if (balance.totalPending >= thresholdAmount) {
          await notificationService.notifySettlementReminder(party, balance);
          remindersSent.push({
            party,
            amount: balance.totalPending,
            currency: balance.currency
          });
        }
      }

      return remindersSent;
    } catch (error) {
      console.error('Error sending settlement reminders:', error);
      throw error;
    }
  }
}

export const settlementService = new SettlementService();