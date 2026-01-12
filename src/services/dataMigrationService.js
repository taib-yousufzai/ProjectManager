import { collection, query, where, getDocs, updateDoc, doc, writeBatch, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { revenueService } from './revenueService';
import { ledgerService } from './ledgerService';
import { notificationService } from './notificationService';

export class DataMigrationService {
  constructor() {
    this.paymentsCollection = 'payments';
    this.projectsCollection = 'projects';
    this.usersCollection = 'users';
    this.migrationLogCollection = 'migrationLogs';
  }

  // Check if a payment needs migration (has no revenue processing fields)
  needsMigration(payment) {
    return (
      payment.verified === true &&
      (payment.revenueProcessed === undefined || payment.revenueProcessed === false) &&
      !payment.ledgerEntryIds
    );
  }

  // Get all payments that need migration
  async getPaymentsNeedingMigration(batchSize = 50) {
    try {
      const paymentsRef = collection(db, this.paymentsCollection);
      const q = query(
        paymentsRef,
        where('verified', '==', true),
        orderBy('createdAt', 'desc'),
        limit(batchSize)
      );

      const snapshot = await getDocs(q);
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter to only those that actually need migration
      return payments.filter(payment => this.needsMigration(payment));
    } catch (error) {
      console.error('Error getting payments needing migration:', error);
      throw error;
    }
  }

  // Migrate a single payment to the new ledger system
  async migratePayment(payment) {
    try {
      // Skip if already migrated
      if (!this.needsMigration(payment)) {
        return { success: true, skipped: true, reason: 'Already migrated' };
      }

      // Get the project for this payment
      const project = await this.getProject(payment.projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      // Get or create default revenue rule
      let revenueRule;
      try {
        revenueRule = await revenueService.getActiveRevenueRule(payment.projectId);
      } catch (error) {
        // Create a default rule if none exists
        revenueRule = await this.createDefaultRevenueRule();
      }

      // Process the payment revenue (this will create ledger entries)
      const ledgerEntries = await revenueService.processPaymentRevenue(payment.id);

      // Update the payment with migration metadata
      const paymentRef = doc(db, this.paymentsCollection, payment.id);
      await updateDoc(paymentRef, {
        revenueProcessed: true,
        revenueProcessedAt: new Date(),
        ledgerEntryIds: ledgerEntries.map(entry => entry.id),
        revenueRuleId: revenueRule.id,
        migratedAt: new Date(),
        migrationVersion: '1.0'
      });

      // Log the migration
      await this.logMigration({
        type: 'payment_migration',
        paymentId: payment.id,
        projectId: payment.projectId,
        revenueRuleId: revenueRule.id,
        ledgerEntryIds: ledgerEntries.map(entry => entry.id),
        amount: payment.amount,
        currency: payment.currency,
        status: 'success'
      });

      return {
        success: true,
        paymentId: payment.id,
        ledgerEntries: ledgerEntries.length,
        revenueRuleId: revenueRule.id
      };
    } catch (error) {
      console.error(`Error migrating payment ${payment.id}:`, error);
      
      // Log the failed migration
      await this.logMigration({
        type: 'payment_migration',
        paymentId: payment.id,
        projectId: payment.projectId,
        status: 'failed',
        error: error.message
      });

      return { success: false, paymentId: payment.id, error: error.message };
    }
  }

  // Migrate payments in batches
  async migratePaymentsBatch(batchSize = 10) {
    try {
      const payments = await this.getPaymentsNeedingMigration(batchSize);
      
      if (payments.length === 0) {
        return { success: true, processed: 0, message: 'No payments need migration' };
      }

      const results = [];
      
      for (const payment of payments) {
        const result = await this.migratePayment(payment);
        results.push(result);
        
        // Add a small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successful = results.filter(r => r.success && !r.skipped).length;
      const skipped = results.filter(r => r.skipped).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: true,
        processed: payments.length,
        successful,
        skipped,
        failed,
        results
      };
    } catch (error) {
      console.error('Error in batch migration:', error);
      throw error;
    }
  }

  // Get project by ID
  async getProject(projectId) {
    try {
      const projectRef = collection(db, this.projectsCollection);
      const q = query(projectRef, where('__name__', '==', projectId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }

  // Create a default revenue rule for migration
  async createDefaultRevenueRule() {
    try {
      const defaultRule = {
        ruleName: 'Default Migration Rule',
        adminPercent: 40,
        teamPercent: 60,
        vendorPercent: 0,
        isDefault: true,
        isActive: true,
        createdBy: 'system_migration',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const ruleId = await revenueService.createRevenueRule(defaultRule);
      return { id: ruleId, ...defaultRule };
    } catch (error) {
      console.error('Error creating default revenue rule:', error);
      throw error;
    }
  }

  // Ensure user records have party associations for backward compatibility
  async migrateUserPartyAssociations() {
    try {
      const usersRef = collection(db, this.usersCollection);
      const snapshot = await getDocs(usersRef);
      
      const batch = writeBatch(db);
      let updateCount = 0;

      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        
        // Skip if user already has party association
        if (userData.party) {
          continue;
        }

        // Assign party based on role
        let party = 'team'; // default
        if (userData.role === 'admin') {
          party = 'admin';
        } else if (userData.role === 'vendor') {
          party = 'vendor';
        }

        batch.update(userDoc.ref, {
          party,
          updatedAt: new Date(),
          migratedAt: new Date()
        });

        updateCount++;
      }

      if (updateCount > 0) {
        await batch.commit();
      }

      await this.logMigration({
        type: 'user_party_migration',
        usersUpdated: updateCount,
        status: 'success'
      });

      return { success: true, usersUpdated: updateCount };
    } catch (error) {
      console.error('Error migrating user party associations:', error);
      
      await this.logMigration({
        type: 'user_party_migration',
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  // Check system migration status
  async getMigrationStatus() {
    try {
      const [paymentsNeedingMigration, usersWithoutParty] = await Promise.all([
        this.getPaymentsNeedingMigration(1000), // Check up to 1000 payments
        this.getUsersWithoutParty()
      ]);

      const migrationLogs = await this.getMigrationLogs();

      return {
        paymentsNeedingMigration: paymentsNeedingMigration.length,
        usersWithoutParty: usersWithoutParty.length,
        migrationLogs: migrationLogs.slice(0, 10), // Recent 10 logs
        lastMigration: migrationLogs[0]?.createdAt || null,
        isFullyMigrated: paymentsNeedingMigration.length === 0 && usersWithoutParty.length === 0
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      throw error;
    }
  }

  // Get users without party association
  async getUsersWithoutParty() {
    try {
      const usersRef = collection(db, this.usersCollection);
      const snapshot = await getDocs(usersRef);
      
      const usersWithoutParty = [];
      
      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        if (!userData.party) {
          usersWithoutParty.push({ id: userDoc.id, ...userData });
        }
      }

      return usersWithoutParty;
    } catch (error) {
      console.error('Error getting users without party:', error);
      return [];
    }
  }

  // Run complete migration process
  async runFullMigration() {
    try {
      const startTime = new Date();
      
      // Step 1: Migrate user party associations
      console.log('Starting user party migration...');
      const userMigrationResult = await this.migrateUserPartyAssociations();
      
      // Step 2: Migrate payments in batches
      console.log('Starting payment migration...');
      let totalPaymentsMigrated = 0;
      let batchCount = 0;
      
      while (true) {
        const batchResult = await this.migratePaymentsBatch(20);
        
        if (batchResult.processed === 0) {
          break; // No more payments to migrate
        }
        
        totalPaymentsMigrated += batchResult.successful;
        batchCount++;
        
        console.log(`Batch ${batchCount}: ${batchResult.successful} payments migrated`);
        
        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const endTime = new Date();
      const duration = endTime - startTime;

      const result = {
        success: true,
        duration: `${Math.round(duration / 1000)}s`,
        usersMigrated: userMigrationResult.usersUpdated,
        paymentsMigrated: totalPaymentsMigrated,
        batchesProcessed: batchCount,
        completedAt: endTime
      };

      // Log the full migration
      await this.logMigration({
        type: 'full_migration',
        ...result,
        status: 'success'
      });

      return result;
    } catch (error) {
      console.error('Error in full migration:', error);
      
      await this.logMigration({
        type: 'full_migration',
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  // Log migration activities
  async logMigration(logData) {
    try {
      const migrationLogRef = collection(db, this.migrationLogCollection);
      await addDoc(migrationLogRef, {
        ...logData,
        createdAt: new Date(),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error logging migration:', error);
      // Don't throw here to avoid breaking the migration process
    }
  }

  // Get migration logs
  async getMigrationLogs(limitCount = 50) {
    try {
      const migrationLogRef = collection(db, this.migrationLogCollection);
      const q = query(
        migrationLogRef,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting migration logs:', error);
      return [];
    }
  }

  // Graceful degradation: Get revenue rule with fallback
  async getRevenueRuleWithFallback(projectId) {
    try {
      return await revenueService.getActiveRevenueRule(projectId);
    } catch (error) {
      console.warn('No revenue rule found, using default fallback');
      
      // Return a default rule for graceful degradation
      return {
        id: 'default-fallback',
        ruleName: 'Default Fallback Rule',
        adminPercent: 40,
        teamPercent: 60,
        vendorPercent: 0,
        isDefault: true,
        isActive: true
      };
    }
  }

  // Check if payment has been processed with new system
  isPaymentProcessed(payment) {
    return (
      payment.revenueProcessed === true &&
      payment.ledgerEntryIds &&
      payment.ledgerEntryIds.length > 0
    );
  }

  // Get payment revenue breakdown (works for both old and new payments)
  async getPaymentRevenueBreakdown(paymentId) {
    try {
      const payment = await this.getPayment(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // If payment has been processed with new system, get actual ledger entries
      if (this.isPaymentProcessed(payment)) {
        const ledgerEntries = await ledgerService.getLedgerEntries({
          paymentId: paymentId
        });
        
        return {
          processed: true,
          ledgerEntries,
          revenueRuleId: payment.revenueRuleId,
          processedAt: payment.revenueProcessedAt
        };
      }

      // For old payments, calculate what the breakdown would be
      const revenueRule = await this.getRevenueRuleWithFallback(payment.projectId);
      const breakdown = revenueService.calculateRevenueSplit(
        payment.amount,
        payment.currency,
        revenueRule
      );

      return {
        processed: false,
        estimatedBreakdown: breakdown,
        revenueRule,
        note: 'This is an estimated breakdown. Payment has not been processed with the new ledger system.'
      };
    } catch (error) {
      console.error('Error getting payment revenue breakdown:', error);
      throw error;
    }
  }

  // Get payment by ID
  async getPayment(paymentId) {
    try {
      const paymentRef = collection(db, this.paymentsCollection);
      const q = query(paymentRef, where('__name__', '==', paymentId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting payment:', error);
      return null;
    }
  }
}

export const dataMigrationService = new DataMigrationService();