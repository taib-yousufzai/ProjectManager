import { ledgerEntriesService, settlementsService } from './firestore';
import { createLedgerEntry, createSettlement, LEDGER_ENTRY_STATUSES, LEDGER_ENTRY_TYPES, PARTY_TYPES } from '../models';
import { notificationService } from './notificationService';
import { 
  validateSettlementPermissions, 
  filterLedgerEntriesByPermissions, 
  filterSettlementsByPermissions,
  hasPermission,
  canAccessParty,
  LEDGER_PERMISSIONS 
} from './permissionsService';
import { auditService, AUDIT_EVENT_TYPES } from './auditService';
import { encryptSensitiveData, decryptSensitiveData, complianceUtils } from '../utils/encryption';
import { validationService } from './validationService';

// Ledger operation error types
export const LEDGER_ERROR_TYPES = {
  VALIDATION_ERROR: 'validation_error',
  ENTRY_NOT_FOUND: 'entry_not_found',
  INVALID_STATUS_CHANGE: 'invalid_status_change',
  SETTLEMENT_ERROR: 'settlement_error',
  BALANCE_CALCULATION_ERROR: 'balance_calculation_error',
  FIRESTORE_ERROR: 'firestore_error'
};

export class LedgerService {
  constructor() {
    this.operationLogs = [];
  }

  // Log ledger operations for audit purposes
  logOperation(operation, details, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      details,
      success: !error,
      error: error ? {
        message: error.message,
        type: error.constructor.name
      } : null
    };

    this.operationLogs.push(logEntry);

    // Log to console
    if (error) {
      console.error(`[LEDGER] ${operation} failed:`, details, error);
    } else {
      console.log(`[LEDGER] ${operation} completed:`, details);
    }

    return logEntry;
  }

  // Enhanced error handling for ledger operations
  async executeWithErrorHandling(operation, operationName, details = {}) {
    try {
      const result = await operation();
      this.logOperation(operationName, { ...details, success: true });
      return result;
    } catch (error) {
      this.logOperation(operationName, { ...details, errorMessage: error.message }, error);
      
      // Categorize and handle different types of errors
      const errorType = this.categorizeError(error);
      
      // For critical errors, we might want to notify administrators
      if (errorType === LEDGER_ERROR_TYPES.FIRESTORE_ERROR) {
        console.error(`Critical ledger error in ${operationName}:`, error);
      }
      
      throw error;
    }
  }

  // Categorize ledger errors
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation failed') || message.includes('invalid')) {
      return LEDGER_ERROR_TYPES.VALIDATION_ERROR;
    }
    
    if (message.includes('not found')) {
      return LEDGER_ERROR_TYPES.ENTRY_NOT_FOUND;
    }
    
    if (message.includes('status')) {
      return LEDGER_ERROR_TYPES.INVALID_STATUS_CHANGE;
    }
    
    if (message.includes('settlement')) {
      return LEDGER_ERROR_TYPES.SETTLEMENT_ERROR;
    }
    
    if (message.includes('balance') || message.includes('calculation')) {
      return LEDGER_ERROR_TYPES.BALANCE_CALCULATION_ERROR;
    }
    
    if (message.includes('firestore') || message.includes('firebase')) {
      return LEDGER_ERROR_TYPES.FIRESTORE_ERROR;
    }
    
    return 'unknown_error';
  }

  // Get operation logs for debugging
  getOperationLogs(filters = {}) {
    let logs = [...this.operationLogs];

    if (filters.operation) {
      logs = logs.filter(log => log.operation.includes(filters.operation));
    }

    if (filters.success !== undefined) {
      logs = logs.filter(log => log.success === filters.success);
    }

    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  // Create a new ledger entry
  async createLedgerEntry(entryData, user = null) {
    return await this.executeWithErrorHandling(async () => {
      // Check permissions for manual entries
      if (user && !entryData.paymentId) {
        if (!hasPermission(user, LEDGER_PERMISSIONS.CREATE_MANUAL_ENTRIES)) {
          // Log unauthorized access attempt
          await auditService.logUnauthorizedAccess(
            'ledger_entry', 
            'create_manual_entry', 
            user.id,
            { entryData: complianceUtils.sanitizeForLogging(entryData) }
          );
          throw new Error('Insufficient permissions to create manual ledger entries');
        }
        
        if (!canAccessParty(user, entryData.party)) {
          await auditService.logUnauthorizedAccess(
            'ledger_entry', 
            'create_entry_for_party', 
            user.id,
            { party: entryData.party }
          );
          throw new Error(`Insufficient permissions to create entries for party: ${entryData.party}`);
        }
      }

      // Validate entry data
      const validation = this.validateLedgerEntry(entryData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Encrypt sensitive data before storing
      const encryptedEntryData = encryptSensitiveData(entryData);
      const entry = createLedgerEntry(encryptedEntryData);
      const newEntry = await ledgerEntriesService.create(entry);
      
      // Log the ledger entry creation
      await auditService.logLedgerEntryOperation(
        'CREATED',
        { ...entryData, id: newEntry.id },
        user?.id || 'system'
      );
      
      return newEntry;
    }, 'create_ledger_entry', {
      party: entryData.party,
      amount: entryData.amount,
      currency: entryData.currency,
      type: entryData.type,
      paymentId: entryData.paymentId,
      userId: user?.id
    });
  }

  // Get ledger entries with filtering
  async getLedgerEntries(filters = {}, user = null) {
    try {
      // Check permissions
      if (user && !hasPermission(user, LEDGER_PERMISSIONS.VIEW_LEDGER_ENTRIES) && 
          !hasPermission(user, LEDGER_PERMISSIONS.VIEW_ALL_LEDGER_ENTRIES)) {
        throw new Error('Insufficient permissions to view ledger entries');
      }

      let queryOptions = {
        orderBy: [['date', 'desc']]
      };

      // Build where conditions based on filters
      const whereConditions = [];

      if (filters.party) {
        whereConditions.push(['party', '==', filters.party]);
      }

      if (filters.status) {
        whereConditions.push(['status', '==', filters.status]);
      }

      if (filters.projectId) {
        whereConditions.push(['projectId', '==', filters.projectId]);
      }

      if (filters.currency) {
        whereConditions.push(['currency', '==', filters.currency]);
      }

      if (filters.type) {
        whereConditions.push(['type', '==', filters.type]);
      }

      if (whereConditions.length > 0) {
        queryOptions.where = whereConditions;
      }

      let entries = await ledgerEntriesService.getAll(queryOptions);

      // Apply date range filter (client-side since Firestore has limitations with range queries)
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        entries = entries.filter(entry => {
          const entryDate = entry.date.toDate ? entry.date.toDate() : new Date(entry.date);
          return entryDate >= start && entryDate <= end;
        });
      }

      // Apply permission-based filtering
      if (user) {
        entries = filterLedgerEntriesByPermissions(entries, user);
      }

      return entries;
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      throw error;
    }
  }

  // Get a single ledger entry by ID
  async getLedgerEntry(entryId) {
    try {
      return await ledgerEntriesService.getById(entryId);
    } catch (error) {
      console.error('Error fetching ledger entry:', error);
      throw error;
    }
  }

  // Update ledger entry status
  async updateLedgerEntryStatus(entryId, status, user = null) {
    try {
      // Check permissions
      if (user && !hasPermission(user, LEDGER_PERMISSIONS.EDIT_LEDGER_ENTRIES)) {
        await auditService.logUnauthorizedAccess(
          'ledger_entry', 
          'update_status', 
          user.id,
          { entryId, status }
        );
        throw new Error('Insufficient permissions to update ledger entries');
      }

      if (!Object.values(LEDGER_ENTRY_STATUSES).includes(status)) {
        throw new Error('Invalid ledger entry status');
      }

      // Get the entry to check party access and for audit logging
      const entry = await ledgerEntriesService.getById(entryId);
      const decryptedEntry = decryptSensitiveData(entry);
      
      if (user && !canAccessParty(user, decryptedEntry.party)) {
        await auditService.logUnauthorizedAccess(
          'ledger_entry', 
          'update_entry_for_party', 
          user.id,
          { entryId, party: decryptedEntry.party }
        );
        throw new Error(`Insufficient permissions to update entries for party: ${decryptedEntry.party}`);
      }

      const updatedEntry = await ledgerEntriesService.update(entryId, { status });
      
      // Log the status change
      await auditService.logLedgerEntryOperation(
        'STATUS_CHANGED',
        { 
          ...decryptedEntry, 
          id: entryId, 
          oldStatus: decryptedEntry.status, 
          newStatus: status 
        },
        user?.id || 'system'
      );
      
      return updatedEntry;
    } catch (error) {
      console.error('Error updating ledger entry status:', error);
      throw error;
    }
  }

  // Calculate party balance
  async getPartyBalance(party, currency = null, user = null) {
    try {
      if (!Object.values(PARTY_TYPES).includes(party)) {
        throw new Error('Invalid party type');
      }

      // Check permissions
      if (user) {
        if (!hasPermission(user, LEDGER_PERMISSIONS.VIEW_PARTY_BALANCES) && 
            !hasPermission(user, LEDGER_PERMISSIONS.VIEW_ALL_PARTY_BALANCES)) {
          throw new Error('Insufficient permissions to view party balances');
        }
        
        if (!hasPermission(user, LEDGER_PERMISSIONS.VIEW_ALL_PARTY_BALANCES) && 
            !canAccessParty(user, party)) {
          throw new Error(`Insufficient permissions to view balance for party: ${party}`);
        }
      }

      const filters = { party };
      if (currency) {
        filters.currency = currency;
      }

      const entries = await this.getLedgerEntries(filters, user);

      const pendingEntries = entries.filter(e => e.status === LEDGER_ENTRY_STATUSES.PENDING);
      const clearedEntries = entries.filter(e => e.status === LEDGER_ENTRY_STATUSES.CLEARED);

      const calculateBalance = (entryList) => {
        return entryList.reduce((sum, entry) => {
          const amount = entry.type === LEDGER_ENTRY_TYPES.CREDIT ? entry.amount : -entry.amount;
          return sum + amount;
        }, 0);
      };

      const totalPending = calculateBalance(pendingEntries);
      const totalCleared = calculateBalance(clearedEntries);

      return {
        party,
        totalPending: Math.round(totalPending * 100) / 100, // Round to 2 decimal places
        totalCleared: Math.round(totalCleared * 100) / 100,
        netBalance: Math.round((totalPending + totalCleared) * 100) / 100,
        currency: currency || 'USD',
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error calculating party balance:', error);
      throw error;
    }
  }

  // Get project ledger summary
  async getProjectLedgerSummary(projectId) {
    try {
      const entries = await this.getLedgerEntries({ projectId });

      // Group by party and currency
      const summary = {};

      entries.forEach(entry => {
        const key = `${entry.party}_${entry.currency}`;
        if (!summary[key]) {
          summary[key] = {
            party: entry.party,
            currency: entry.currency,
            totalCredits: 0,
            totalDebits: 0,
            pendingCredits: 0,
            pendingDebits: 0,
            clearedCredits: 0,
            clearedDebits: 0
          };
        }

        const amount = entry.amount;
        if (entry.type === LEDGER_ENTRY_TYPES.CREDIT) {
          summary[key].totalCredits += amount;
          if (entry.status === LEDGER_ENTRY_STATUSES.PENDING) {
            summary[key].pendingCredits += amount;
          } else {
            summary[key].clearedCredits += amount;
          }
        } else {
          summary[key].totalDebits += amount;
          if (entry.status === LEDGER_ENTRY_STATUSES.PENDING) {
            summary[key].pendingDebits += amount;
          } else {
            summary[key].clearedDebits += amount;
          }
        }
      });

      // Convert to array and calculate net balances
      return Object.values(summary).map(item => ({
        ...item,
        netBalance: Math.round((item.totalCredits - item.totalDebits) * 100) / 100,
        pendingBalance: Math.round((item.pendingCredits - item.pendingDebits) * 100) / 100,
        clearedBalance: Math.round((item.clearedCredits - item.clearedDebits) * 100) / 100
      }));
    } catch (error) {
      console.error('Error getting project ledger summary:', error);
      throw error;
    }
  }

  // Create a settlement
  async createSettlement(settlementData, userId, user = null) {
    return await this.executeWithErrorHandling(async () => {
      // Validate settlement data
      const validation = this.validateSettlement(settlementData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Verify all ledger entries exist and are pending
      const entryPromises = settlementData.ledgerEntryIds.map(id => 
        this.getLedgerEntry(id)
      );
      const entries = await Promise.all(entryPromises);

      // Validate settlement permissions
      if (user) {
        validateSettlementPermissions(user, entries);
      }

      // Check that all entries are pending and belong to the same party
      const invalidEntries = entries.filter(entry => 
        entry.status !== LEDGER_ENTRY_STATUSES.PENDING || 
        entry.party !== settlementData.party
      );

      if (invalidEntries.length > 0) {
        throw new Error('Some ledger entries are not pending or belong to different party');
      }

      // Calculate total amount
      const totalAmount = entries.reduce((sum, entry) => {
        const amount = entry.type === LEDGER_ENTRY_TYPES.CREDIT ? entry.amount : -entry.amount;
        return sum + amount;
      }, 0);

      const settlement = createSettlement({
        ...settlementData,
        totalAmount: Math.round(totalAmount * 100) / 100,
        createdBy: userId
      });

      const newSettlement = await settlementsService.create(settlement);

      // Update all ledger entries to cleared status and link to settlement
      const updatePromises = settlementData.ledgerEntryIds.map(entryId =>
        ledgerEntriesService.update(entryId, {
          status: LEDGER_ENTRY_STATUSES.CLEARED,
          settlementId: newSettlement.id
        })
      );

      await Promise.all(updatePromises);

      // Send notification about settlement
      await notificationService.notifySettlementCompleted(
        { ...newSettlement, id: newSettlement.id },
        entries,
        userId
      );

      return newSettlement;
    }, 'create_settlement', {
      party: settlementData.party,
      entryCount: settlementData.ledgerEntryIds.length,
      currency: settlementData.currency,
      userId
    });
  }

  // Get settlements
  async getSettlements(party = null, user = null) {
    try {
      // Check permissions
      if (user && !hasPermission(user, LEDGER_PERMISSIONS.VIEW_SETTLEMENTS) && 
          !hasPermission(user, LEDGER_PERMISSIONS.VIEW_ALL_SETTLEMENTS)) {
        throw new Error('Insufficient permissions to view settlements');
      }

      const queryOptions = {
        orderBy: [['settlementDate', 'desc']]
      };

      if (party) {
        queryOptions.where = [['party', '==', party]];
      }

      let settlements = await settlementsService.getAll(queryOptions);

      // Apply permission-based filtering
      if (user) {
        settlements = filterSettlementsByPermissions(settlements, user);
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
      return await settlementsService.getById(settlementId);
    } catch (error) {
      console.error('Error fetching settlement:', error);
      throw error;
    }
  }

  // Add manual ledger entry (for adjustments)
  async addManualLedgerEntry(entryData, userId) {
    try {
      const entry = await this.createLedgerEntry({
        ...entryData,
        paymentId: null, // Manual entries don't link to payments
        revenueRuleId: null,
        remarks: entryData.remarks || 'Manual adjustment'
      });

      // Log the manual entry for audit purposes
      console.log(`Manual ledger entry created by ${userId}:`, entry);

      return entry;
    } catch (error) {
      console.error('Error adding manual ledger entry:', error);
      throw error;
    }
  }

  // Get ledger entries for a specific payment
  async getLedgerEntriesByPayment(paymentId) {
    try {
      return await this.getLedgerEntries({ paymentId });
    } catch (error) {
      console.error('Error fetching payment ledger entries:', error);
      throw error;
    }
  }

  // Get ledger entries for a specific payment (alias for backward compatibility)
  async getPaymentLedgerEntries(paymentId) {
    try {
      return await this.getLedgerEntries({ paymentId });
    } catch (error) {
      console.error('Error fetching payment ledger entries:', error);
      throw error;
    }
  }

  // Get pending entries for settlement
  async getPendingEntriesForSettlement(party, currency = null) {
    try {
      const filters = {
        party,
        status: LEDGER_ENTRY_STATUSES.PENDING
      };

      if (currency) {
        filters.currency = currency;
      }

      return await this.getLedgerEntries(filters);
    } catch (error) {
      console.error('Error fetching pending entries for settlement:', error);
      throw error;
    }
  }

  // Validate ledger entry data
  validateLedgerEntry(entryData) {
    // Use the comprehensive validation service
    return validationService.validateLedgerEntry(entryData);
  }

  // Validate settlement data
  validateSettlement(settlementData) {
    // Use the comprehensive validation service
    return validationService.validateSettlement(settlementData);
  }

  // Get ledger statistics
  async getLedgerStats() {
    try {
      const allEntries = await this.getLedgerEntries();

      const stats = {
        totalEntries: allEntries.length,
        pendingEntries: allEntries.filter(e => e.status === LEDGER_ENTRY_STATUSES.PENDING).length,
        clearedEntries: allEntries.filter(e => e.status === LEDGER_ENTRY_STATUSES.CLEARED).length,
        creditEntries: allEntries.filter(e => e.type === LEDGER_ENTRY_TYPES.CREDIT).length,
        debitEntries: allEntries.filter(e => e.type === LEDGER_ENTRY_TYPES.DEBIT).length,
        partiesWithBalances: {}
      };

      // Calculate balances for each party
      for (const party of Object.values(PARTY_TYPES)) {
        const balance = await this.getPartyBalance(party);
        stats.partiesWithBalances[party] = balance;
      }

      return stats;
    } catch (error) {
      console.error('Error calculating ledger stats:', error);
      throw error;
    }
  }

  // Subscribe to real-time ledger entry updates
  subscribeToLedgerEntries(callback, filters = {}) {
    let queryOptions = {
      orderBy: [['date', 'desc']]
    };

    // Build where conditions based on filters
    const whereConditions = [];

    if (filters.party) {
      whereConditions.push(['party', '==', filters.party]);
    }

    if (filters.status) {
      whereConditions.push(['status', '==', filters.status]);
    }

    if (filters.projectId) {
      whereConditions.push(['projectId', '==', filters.projectId]);
    }

    if (whereConditions.length > 0) {
      queryOptions.where = whereConditions;
    }

    return ledgerEntriesService.subscribe(callback, queryOptions);
  }

  // Subscribe to settlements
  subscribeToSettlements(callback, party = null) {
    const queryOptions = {
      orderBy: [['settlementDate', 'desc']]
    };

    if (party) {
      queryOptions.where = [['party', '==', party]];
    }

    return settlementsService.subscribe(callback, queryOptions);
  }
}

export const ledgerService = new LedgerService();