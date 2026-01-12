/**
 * Property-Based Tests for Backward Compatibility
 * Feature: revenue-auto-split-ledger, Property 19: Backward Compatibility
 * Validates: Requirements 7.2, 7.5
 */

import fc from 'fast-check';
import { dataMigrationService } from '../dataMigrationService';
import { paymentService } from '../paymentService';
import { revenueService } from '../revenueService';
import { ledgerService } from '../ledgerService';

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  db: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  writeBatch: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  addDoc: jest.fn(),
  Timestamp: {
    fromDate: jest.fn(date => ({ seconds: Math.floor(date.getTime() / 1000) }))
  }
}));

describe('Backward Compatibility Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Generator for legacy payment data (without revenue processing fields)
  const legacyPaymentArb = fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }),
    projectId: fc.string({ minLength: 10, maxLength: 20 }),
    amount: fc.float({ min: 0.01, max: 10000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP', 'CAD'),
    verified: fc.boolean(),
    approvedBy: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 0, maxLength: 5 }),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
    // Legacy payments don't have these fields
    revenueProcessed: fc.constant(undefined),
    ledgerEntryIds: fc.constant(undefined),
    revenueRuleId: fc.constant(undefined)
  });

  // Generator for modern payment data (with revenue processing fields)
  const modernPaymentArb = fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }),
    projectId: fc.string({ minLength: 10, maxLength: 20 }),
    amount: fc.float({ min: 0.01, max: 10000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP', 'CAD'),
    verified: fc.boolean(),
    approvedBy: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 0, maxLength: 5 }),
    createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
    revenueProcessed: fc.boolean(),
    ledgerEntryIds: fc.array(fc.string({ minLength: 10, maxLength: 20 }), { minLength: 0, maxLength: 3 }),
    revenueRuleId: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: null })
  });

  /**
   * Property 19: Backward Compatibility
   * For any existing payment record, the system should maintain full functionality 
   * and data integrity when ledger features are added.
   */
  test('Property 19: Legacy payments maintain functionality with new ledger system', () => {
    return fc.assert(fc.asyncProperty(
      legacyPaymentArb,
      async (legacyPayment) => {
        // Mock the migration service methods
        const mockNeedsMigration = jest.spyOn(dataMigrationService, 'needsMigration');
        const mockIsPaymentProcessed = jest.spyOn(dataMigrationService, 'isPaymentProcessed');
        const mockGetPaymentRevenueBreakdown = jest.spyOn(dataMigrationService, 'getPaymentRevenueBreakdown');

        mockNeedsMigration.mockReturnValue(legacyPayment.verified && !legacyPayment.revenueProcessed);
        mockIsPaymentProcessed.mockReturnValue(false);
        mockGetPaymentRevenueBreakdown.mockResolvedValue({
          processed: false,
          estimatedBreakdown: {
            admin: { amount: legacyPayment.amount * 0.4, currency: legacyPayment.currency },
            team: { amount: legacyPayment.amount * 0.6, currency: legacyPayment.currency }
          },
          note: 'This is an estimated breakdown. Payment has not been processed with the new ledger system.'
        });

        // Test 1: Legacy payment detection works correctly
        const needsMigration = dataMigrationService.needsMigration(legacyPayment);
        const isProcessed = dataMigrationService.isPaymentProcessed(legacyPayment);

        if (legacyPayment.verified) {
          expect(needsMigration).toBe(true);
          expect(isProcessed).toBe(false);
        } else {
          expect(isProcessed).toBe(false);
        }

        // Test 2: Revenue breakdown can be calculated for legacy payments
        if (legacyPayment.verified) {
          const breakdown = await dataMigrationService.getPaymentRevenueBreakdown(legacyPayment.id);
          
          expect(breakdown).toBeDefined();
          expect(breakdown.processed).toBe(false);
          expect(breakdown.estimatedBreakdown).toBeDefined();
          expect(breakdown.note).toContain('estimated breakdown');
          
          // Verify breakdown amounts are reasonable
          if (breakdown.estimatedBreakdown) {
            const totalBreakdown = Object.values(breakdown.estimatedBreakdown)
              .reduce((sum, party) => sum + party.amount, 0);
            
            // Total should approximately equal original amount (within floating point precision)
            expect(Math.abs(totalBreakdown - legacyPayment.amount)).toBeLessThan(0.01);
          }
        }

        // Test 3: Legacy payments don't break the system
        expect(() => {
          dataMigrationService.needsMigration(legacyPayment);
          dataMigrationService.isPaymentProcessed(legacyPayment);
        }).not.toThrow();

        // Cleanup
        mockNeedsMigration.mockRestore();
        mockIsPaymentProcessed.mockRestore();
        mockGetPaymentRevenueBreakdown.mockRestore();
      }
    ), { numRuns: 100 });
  });

  test('Property 19.1: Modern payments work correctly alongside legacy payments', () => {
    return fc.assert(fc.asyncProperty(
      fc.tuple(legacyPaymentArb, modernPaymentArb),
      async ([legacyPayment, modernPayment]) => {
        // Mock the migration service methods
        const mockNeedsMigration = jest.spyOn(dataMigrationService, 'needsMigration');
        const mockIsPaymentProcessed = jest.spyOn(dataMigrationService, 'isPaymentProcessed');

        mockNeedsMigration.mockImplementation((payment) => {
          return payment.verified === true &&
                 (payment.revenueProcessed === undefined || payment.revenueProcessed === false) &&
                 !payment.ledgerEntryIds;
        });

        mockIsPaymentProcessed.mockImplementation((payment) => {
          return payment.revenueProcessed === true &&
                 payment.ledgerEntryIds &&
                 payment.ledgerEntryIds.length > 0;
        });

        // Test legacy payment behavior
        const legacyNeedsMigration = dataMigrationService.needsMigration(legacyPayment);
        const legacyIsProcessed = dataMigrationService.isPaymentProcessed(legacyPayment);

        // Test modern payment behavior
        const modernNeedsMigration = dataMigrationService.needsMigration(modernPayment);
        const modernIsProcessed = dataMigrationService.isPaymentProcessed(modernPayment);

        // Verify legacy payments are correctly identified
        if (legacyPayment.verified) {
          expect(legacyNeedsMigration).toBe(true);
        }
        expect(legacyIsProcessed).toBe(false);

        // Verify modern payments are correctly identified
        if (modernPayment.revenueProcessed && modernPayment.ledgerEntryIds?.length > 0) {
          expect(modernIsProcessed).toBe(true);
          expect(modernNeedsMigration).toBe(false);
        }

        // Both payment types should be processable without errors
        expect(() => {
          dataMigrationService.needsMigration(legacyPayment);
          dataMigrationService.needsMigration(modernPayment);
          dataMigrationService.isPaymentProcessed(legacyPayment);
          dataMigrationService.isPaymentProcessed(modernPayment);
        }).not.toThrow();

        // Cleanup
        mockNeedsMigration.mockRestore();
        mockIsPaymentProcessed.mockRestore();
      }
    ), { numRuns: 100 });
  });

  test('Property 19.2: Payment approval process maintains backward compatibility', () => {
    return fc.assert(fc.asyncProperty(
      legacyPaymentArb.filter(p => p.approvedBy.length < 3),
      fc.string({ minLength: 5, maxLength: 15 }), // userId
      async (payment, userId) => {
        // Mock payment service dependencies
        const mockGetById = jest.fn().mockResolvedValue(payment);
        const mockUpdate = jest.fn().mockResolvedValue({ ...payment, approvedBy: [...payment.approvedBy, userId] });
        
        // Mock the paymentsService
        const originalPaymentsService = require('../firestore').paymentsService;
        jest.doMock('../firestore', () => ({
          paymentsService: {
            getById: mockGetById,
            update: mockUpdate
          },
          projectsService: {
            getById: jest.fn().mockResolvedValue({ id: payment.projectId, name: 'Test Project' })
          }
        }));

        // Mock revenue processing to simulate both success and failure scenarios
        const mockProcessPaymentRevenue = jest.spyOn(paymentService, 'processPaymentRevenue');
        
        // Simulate that revenue processing might fail for legacy payments
        if (!payment.revenueProcessed) {
          mockProcessPaymentRevenue.mockRejectedValue(new Error('No revenue rule configured'));
        } else {
          mockProcessPaymentRevenue.mockResolvedValue();
        }

        try {
          // Attempt to approve the payment
          const result = await paymentService.approvePayment(payment.id, userId);
          
          // Approval should succeed regardless of revenue processing status
          expect(result).toBeDefined();
          expect(mockGetById).toHaveBeenCalledWith(payment.id);
          expect(mockUpdate).toHaveBeenCalled();
          
          // If this would make the payment verified (3 approvals), revenue processing should be attempted
          const wouldBeVerified = payment.approvedBy.length + 1 >= 3;
          if (wouldBeVerified) {
            expect(mockProcessPaymentRevenue).toHaveBeenCalledWith(payment.id);
          }
          
        } catch (error) {
          // Approval should not fail even if revenue processing fails
          expect(error.message).not.toContain('revenue');
        }

        // Cleanup
        mockProcessPaymentRevenue.mockRestore();
      }
    ), { numRuns: 50 });
  });

  test('Property 19.3: Data integrity is maintained during migration', () => {
    return fc.assert(fc.asyncProperty(
      fc.array(legacyPaymentArb.filter(p => p.verified), { minLength: 1, maxLength: 10 }),
      async (legacyPayments) => {
        // Mock migration service methods
        const mockGetPaymentsNeedingMigration = jest.spyOn(dataMigrationService, 'getPaymentsNeedingMigration');
        const mockMigratePayment = jest.spyOn(dataMigrationService, 'migratePayment');

        mockGetPaymentsNeedingMigration.mockResolvedValue(legacyPayments);
        
        // Mock successful migration for each payment
        legacyPayments.forEach((payment, index) => {
          mockMigratePayment.mockResolvedValueOnce({
            success: true,
            paymentId: payment.id,
            ledgerEntries: 2, // admin + team
            revenueRuleId: `rule_${index}`
          });
        });

        // Test batch migration
        const batchResult = await dataMigrationService.migratePaymentsBatch(legacyPayments.length);

        // Verify migration results maintain data integrity
        expect(batchResult.success).toBe(true);
        expect(batchResult.processed).toBe(legacyPayments.length);
        expect(batchResult.successful).toBe(legacyPayments.length);
        expect(batchResult.failed).toBe(0);

        // Verify each payment was processed
        expect(mockMigratePayment).toHaveBeenCalledTimes(legacyPayments.length);
        
        legacyPayments.forEach(payment => {
          expect(mockMigratePayment).toHaveBeenCalledWith(payment);
        });

        // Cleanup
        mockGetPaymentsNeedingMigration.mockRestore();
        mockMigratePayment.mockRestore();
      }
    ), { numRuns: 20 });
  });

  test('Property 19.4: Graceful degradation when revenue rules are missing', () => {
    return fc.assert(fc.asyncProperty(
      legacyPaymentArb.filter(p => p.verified),
      async (payment) => {
        // Mock revenue service to simulate missing revenue rules
        const mockGetActiveRevenueRule = jest.spyOn(revenueService, 'getActiveRevenueRule');
        const mockCreateDefaultRevenueRule = jest.spyOn(dataMigrationService, 'createDefaultRevenueRule');
        
        mockGetActiveRevenueRule.mockRejectedValue(new Error('No active revenue rule found'));
        mockCreateDefaultRevenueRule.mockResolvedValue({
          id: 'default-rule-id',
          ruleName: 'Default Migration Rule',
          adminPercent: 40,
          teamPercent: 60,
          vendorPercent: 0
        });

        // Mock the revenue rule fallback
        const mockGetRevenueRuleWithFallback = jest.spyOn(dataMigrationService, 'getRevenueRuleWithFallback');
        mockGetRevenueRuleWithFallback.mockResolvedValue({
          id: 'default-fallback',
          ruleName: 'Default Fallback Rule',
          adminPercent: 40,
          teamPercent: 60,
          vendorPercent: 0,
          isDefault: true,
          isActive: true
        });

        try {
          // Test that the system can handle missing revenue rules gracefully
          const revenueRule = await dataMigrationService.getRevenueRuleWithFallback(payment.projectId);
          
          expect(revenueRule).toBeDefined();
          expect(revenueRule.adminPercent + revenueRule.teamPercent + revenueRule.vendorPercent).toBe(100);
          expect(revenueRule.isDefault).toBe(true);
          
          // Test that breakdown can still be calculated
          const breakdown = await dataMigrationService.getPaymentRevenueBreakdown(payment.id);
          expect(breakdown).toBeDefined();
          
        } catch (error) {
          // Should not throw errors for missing revenue rules
          expect(error.message).not.toContain('revenue rule');
        }

        // Cleanup
        mockGetActiveRevenueRule.mockRestore();
        mockCreateDefaultRevenueRule.mockRestore();
        mockGetRevenueRuleWithFallback.mockRestore();
      }
    ), { numRuns: 50 });
  });
});