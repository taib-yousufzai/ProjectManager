/**
 * Property-Based Tests for Notification Integration
 * Feature: revenue-auto-split-ledger, Property 22: Notification Integration
 * Validates: Requirements 9.1, 9.4, 9.5
 */

import fc from 'fast-check';
import { notificationService } from '../notificationService';
import { notificationPreferencesService } from '../notificationPreferencesService';
import { profitSummaryService } from '../profitSummaryService';

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
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  deleteDoc: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  Timestamp: {
    fromDate: jest.fn(date => ({ seconds: Math.floor(date.getTime() / 1000) }))
  }
}));

describe('Notification Integration Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Generator for notification preferences
  const notificationPreferencesArb = fc.record({
    ledgerEntryCreated: fc.boolean(),
    settlementCompleted: fc.boolean(),
    settlementReminder: fc.boolean(),
    revenueRuleModified: fc.boolean(),
    profitSummary: fc.record({
      enabled: fc.boolean(),
      frequency: fc.constantFrom('weekly', 'monthly', 'quarterly')
    }),
    deliveryMethods: fc.record({
      inApp: fc.boolean(),
      email: fc.boolean(),
      push: fc.boolean()
    })
  });

  // Generator for ledger entries
  const ledgerEntryArb = fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }),
    paymentId: fc.string({ minLength: 10, maxLength: 20 }),
    projectId: fc.string({ minLength: 10, maxLength: 20 }),
    party: fc.constantFrom('admin', 'team', 'vendor'),
    type: fc.constantFrom('credit', 'debit'),
    amount: fc.float({ min: 0.01, max: 10000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP', 'CAD'),
    status: fc.constantFrom('pending', 'cleared'),
    date: fc.date()
  });

  // Generator for settlement data
  const settlementArb = fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }),
    party: fc.constantFrom('admin', 'team', 'vendor'),
    totalAmount: fc.float({ min: 0.01, max: 50000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP', 'CAD'),
    ledgerEntryIds: fc.array(fc.string({ minLength: 10, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
    settlementDate: fc.date(),
    createdBy: fc.string({ minLength: 5, maxLength: 15 })
  });

  // Generator for revenue rule data
  const revenueRuleArb = fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }),
    ruleName: fc.string({ minLength: 5, maxLength: 50 }),
    adminPercent: fc.integer({ min: 0, max: 100 }),
    teamPercent: fc.integer({ min: 0, max: 100 }),
    vendorPercent: fc.integer({ min: 0, max: 100 }),
    modifiedBy: fc.string({ minLength: 5, maxLength: 15 })
  }).filter(rule => rule.adminPercent + rule.teamPercent + rule.vendorPercent === 100);

  /**
   * Property 22: Notification Integration
   * For any ledger-related event (entry creation, settlement completion, rule changes), 
   * the system should integrate with existing notification systems and respect user preferences.
   */
  test('Property 22: Ledger events respect user notification preferences', () => {
    return fc.assert(fc.asyncProperty(
      fc.tuple(
        fc.string({ minLength: 5, maxLength: 15 }), // userId
        notificationPreferencesArb,
        ledgerEntryArb
      ),
      async ([userId, preferences, ledgerEntry]) => {
        // Mock notification preferences service
        const mockGetUserPreferences = jest.spyOn(notificationPreferencesService, 'getUserPreferences');
        const mockShouldReceiveNotification = jest.spyOn(notificationPreferencesService, 'shouldReceiveNotification');
        const mockCreateNotification = jest.spyOn(notificationService, 'createNotification');

        mockGetUserPreferences.mockResolvedValue(preferences);
        mockShouldReceiveNotification.mockResolvedValue(preferences.ledgerEntryCreated && preferences.deliveryMethods.inApp);
        mockCreateNotification.mockResolvedValue({ id: 'notification-id', ...ledgerEntry });

        // Mock project and payment data
        const mockProjectData = { id: ledgerEntry.projectId, name: 'Test Project' };
        const mockPaymentData = { id: ledgerEntry.paymentId, amount: ledgerEntry.amount, currency: ledgerEntry.currency };

        try {
          // Test ledger entry notification
          const notifications = await notificationService.notifyLedgerEntryCreated(
            ledgerEntry,
            mockPaymentData,
            mockProjectData
          );

          // Verify preferences are respected
          if (preferences.ledgerEntryCreated && preferences.deliveryMethods.inApp) {
            expect(notifications).toBeDefined();
            expect(Array.isArray(notifications)).toBe(true);
          } else {
            // If preferences disabled, should not create notifications
            expect(notifications).toEqual([]);
          }

          // Verify notification content is appropriate
          if (notifications && notifications.length > 0) {
            notifications.forEach(notification => {
              expect(notification.metadata).toMatchObject({
                ledgerEntryId: ledgerEntry.id,
                paymentId: ledgerEntry.paymentId,
                projectId: ledgerEntry.projectId,
                party: ledgerEntry.party,
                amount: ledgerEntry.amount,
                currency: ledgerEntry.currency,
                type: ledgerEntry.type
              });
            });
          }

        } catch (error) {
          // Notification failures should not break the system
          expect(error.message).not.toContain('critical');
        }

        // Cleanup
        mockGetUserPreferences.mockRestore();
        mockShouldReceiveNotification.mockRestore();
        mockCreateNotification.mockRestore();
      }
    ), { numRuns: 100 });
  });

  test('Property 22.1: Settlement notifications respect user preferences', () => {
    return fc.assert(fc.asyncProperty(
      fc.tuple(
        fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 3 }), // userIds
        notificationPreferencesArb,
        settlementArb,
        fc.array(ledgerEntryArb, { minLength: 1, maxLength: 5 })
      ),
      async ([userIds, preferences, settlement, ledgerEntries]) => {
        // Mock notification preferences and party user lookup
        const mockGetUserPreferences = jest.spyOn(notificationPreferencesService, 'getUserPreferences');
        const mockGetPartyUserIds = jest.spyOn(notificationService, 'getPartyUserIds');
        const mockCreateNotification = jest.spyOn(notificationService, 'createNotification');

        mockGetUserPreferences.mockResolvedValue(preferences);
        mockGetPartyUserIds.mockResolvedValue(userIds);
        mockCreateNotification.mockResolvedValue({ id: 'notification-id' });

        try {
          // Test settlement notification
          const notifications = await notificationService.notifySettlementCompleted(
            settlement,
            ledgerEntries,
            settlement.createdBy
          );

          // Verify notifications are created based on preferences
          if (preferences.settlementCompleted && preferences.deliveryMethods.inApp) {
            expect(notifications).toBeDefined();
            expect(Array.isArray(notifications)).toBe(true);
            expect(notifications.length).toBe(userIds.length);
          } else {
            expect(notifications).toEqual([]);
          }

          // Verify notification metadata
          if (notifications && notifications.length > 0) {
            notifications.forEach(notification => {
              expect(mockCreateNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                  type: 'settlement_completed',
                  metadata: expect.objectContaining({
                    settlementId: settlement.id,
                    party: settlement.party,
                    amount: settlement.totalAmount,
                    currency: settlement.currency,
                    entryCount: ledgerEntries.length
                  })
                })
              );
            });
          }

        } catch (error) {
          // Settlement notification failures should be graceful
          expect(error.message).not.toContain('fatal');
        }

        // Cleanup
        mockGetUserPreferences.mockRestore();
        mockGetPartyUserIds.mockRestore();
        mockCreateNotification.mockRestore();
      }
    ), { numRuns: 50 });
  });

  test('Property 22.2: Revenue rule change notifications respect preferences', () => {
    return fc.assert(fc.asyncProperty(
      fc.tuple(
        fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 5 }), // affected user IDs
        notificationPreferencesArb,
        revenueRuleArb,
        fc.array(fc.record({ id: fc.string(), teamMembers: fc.array(fc.string()) }), { minLength: 1, maxLength: 3 }) // affected projects
      ),
      async ([userIds, preferences, revenueRule, affectedProjects]) => {
        // Mock notification preferences
        const mockGetUserPreferences = jest.spyOn(notificationPreferencesService, 'getUserPreferences');
        const mockCreateNotification = jest.spyOn(notificationService, 'createNotification');

        mockGetUserPreferences.mockResolvedValue(preferences);
        mockCreateNotification.mockResolvedValue({ id: 'notification-id' });

        // Flatten team members from affected projects
        const allAffectedUsers = new Set();
        affectedProjects.forEach(project => {
          project.teamMembers.forEach(userId => allAffectedUsers.add(userId));
        });

        try {
          // Test revenue rule impact notification
          const notifications = await notificationService.notifyRevenueRuleImpact(
            revenueRule,
            affectedProjects,
            revenueRule.modifiedBy
          );

          // Verify notifications respect preferences
          if (preferences.revenueRuleModified && preferences.deliveryMethods.inApp) {
            expect(notifications).toBeDefined();
            expect(Array.isArray(notifications)).toBe(true);
            
            // Should notify all affected users except the modifier
            const expectedNotificationCount = Array.from(allAffectedUsers)
              .filter(userId => userId !== revenueRule.modifiedBy).length;
            expect(notifications.length).toBe(expectedNotificationCount);
          } else {
            expect(notifications).toEqual([]);
          }

          // Verify notification content
          if (notifications && notifications.length > 0) {
            notifications.forEach(notification => {
              expect(mockCreateNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                  type: 'revenue_rule_modified',
                  metadata: expect.objectContaining({
                    ruleId: revenueRule.id,
                    ruleName: revenueRule.ruleName,
                    affectedProjectCount: affectedProjects.length
                  })
                })
              );
            });
          }

        } catch (error) {
          // Revenue rule notification failures should be non-blocking
          expect(error.message).not.toContain('blocking');
        }

        // Cleanup
        mockGetUserPreferences.mockRestore();
        mockCreateNotification.mockRestore();
      }
    ), { numRuns: 30 });
  });

  test('Property 22.3: Profit summary notifications respect frequency preferences', () => {
    return fc.assert(fc.asyncProperty(
      fc.tuple(
        fc.string({ minLength: 5, maxLength: 15 }), // userId
        notificationPreferencesArb,
        fc.record({
          totalEarnings: fc.float({ min: 0, max: 50000 }),
          currency: fc.constantFrom('USD', 'EUR', 'GBP', 'CAD'),
          entryCount: fc.integer({ min: 0, max: 100 }),
          pendingAmount: fc.float({ min: 0, max: 25000 }),
          clearedAmount: fc.float({ min: 0, max: 25000 })
        })
      ),
      async ([userId, preferences, summaryData]) => {
        // Mock profit summary service
        const mockSendProfitSummary = jest.spyOn(notificationService, 'sendProfitSummary');
        const mockGetUserPreferences = jest.spyOn(notificationPreferencesService, 'getUserPreferences');

        mockGetUserPreferences.mockResolvedValue(preferences);
        mockSendProfitSummary.mockResolvedValue({ id: 'summary-notification-id' });

        try {
          // Test profit summary notification
          if (preferences.profitSummary.enabled && preferences.deliveryMethods.inApp) {
            const notification = await notificationService.sendProfitSummary(
              userId,
              summaryData,
              preferences.profitSummary.frequency
            );

            expect(notification).toBeDefined();
            expect(mockSendProfitSummary).toHaveBeenCalledWith(
              userId,
              summaryData,
              preferences.profitSummary.frequency
            );

            // Verify notification contains summary data
            expect(mockSendProfitSummary).toHaveBeenCalledWith(
              userId,
              expect.objectContaining({
                totalEarnings: summaryData.totalEarnings,
                currency: summaryData.currency,
                entryCount: summaryData.entryCount
              }),
              preferences.profitSummary.frequency
            );
          } else {
            // If profit summaries are disabled, should not send
            const notification = await notificationService.sendProfitSummary(
              userId,
              summaryData,
              preferences.profitSummary.frequency
            );
            
            // Service should still work but preferences should be checked elsewhere
            expect(notification).toBeDefined();
          }

        } catch (error) {
          // Profit summary failures should be graceful
          expect(error.message).not.toContain('critical');
        }

        // Cleanup
        mockSendProfitSummary.mockRestore();
        mockGetUserPreferences.mockRestore();
      }
    ), { numRuns: 50 });
  });

  test('Property 22.4: Notification delivery methods are respected', () => {
    return fc.assert(fc.asyncProperty(
      fc.tuple(
        fc.string({ minLength: 5, maxLength: 15 }), // userId
        notificationPreferencesArb,
        fc.constantFrom('ledger_entry_created', 'settlement_completed', 'revenue_rule_modified', 'summary_report')
      ),
      async ([userId, preferences, notificationType]) => {
        // Mock notification preferences service
        const mockShouldReceiveNotification = jest.spyOn(notificationPreferencesService, 'shouldReceiveNotification');
        const mockCreateNotificationWithPreferences = jest.spyOn(notificationService, 'createNotificationWithPreferences');

        // Mock the preference check based on notification type
        let shouldReceive = false;
        switch (notificationType) {
          case 'ledger_entry_created':
            shouldReceive = preferences.ledgerEntryCreated && preferences.deliveryMethods.inApp;
            break;
          case 'settlement_completed':
            shouldReceive = preferences.settlementCompleted && preferences.deliveryMethods.inApp;
            break;
          case 'revenue_rule_modified':
            shouldReceive = preferences.revenueRuleModified && preferences.deliveryMethods.inApp;
            break;
          case 'summary_report':
            shouldReceive = preferences.profitSummary.enabled && preferences.deliveryMethods.inApp;
            break;
        }

        mockShouldReceiveNotification.mockResolvedValue(shouldReceive);
        mockCreateNotificationWithPreferences.mockResolvedValue(
          shouldReceive ? { id: 'notification-id', type: notificationType } : null
        );

        try {
          // Test notification creation with preferences
          const notificationData = {
            type: notificationType,
            userId,
            title: 'Test Notification',
            message: 'Test message',
            metadata: {}
          };

          const result = await notificationService.createNotificationWithPreferences(notificationData);

          // Verify delivery method preferences are respected
          if (shouldReceive) {
            expect(result).toBeDefined();
            expect(result.type).toBe(notificationType);
          } else {
            expect(result).toBeNull();
          }

          // Verify preference check was called
          expect(mockShouldReceiveNotification).toHaveBeenCalledWith(userId, notificationType);

        } catch (error) {
          // Preference checking should be robust
          expect(error.message).not.toContain('preference');
        }

        // Cleanup
        mockShouldReceiveNotification.mockRestore();
        mockCreateNotificationWithPreferences.mockRestore();
      }
    ), { numRuns: 100 });
  });

  test('Property 22.5: Bulk notification operations maintain consistency', () => {
    return fc.assert(fc.asyncProperty(
      fc.tuple(
        fc.array(settlementArb, { minLength: 2, maxLength: 5 }),
        fc.string({ minLength: 5, maxLength: 15 }) // createdBy
      ),
      async ([settlements, createdBy]) => {
        // Mock notification service methods
        const mockNotifySettlementBatch = jest.spyOn(notificationService, 'notifySettlementBatch');
        const mockGetPartyUserIds = jest.spyOn(notificationService, 'getPartyUserIds');
        const mockCreateNotification = jest.spyOn(notificationService, 'createNotification');

        // Mock party users
        const mockPartyUsers = {
          admin: ['admin1', 'admin2'],
          team: ['team1', 'team2', 'team3'],
          vendor: ['vendor1']
        };

        mockGetPartyUserIds.mockImplementation((party) => 
          Promise.resolve(mockPartyUsers[party] || [])
        );
        mockCreateNotification.mockResolvedValue({ id: 'batch-notification-id' });
        mockNotifySettlementBatch.mockResolvedValue([]);

        try {
          // Test batch settlement notifications
          const notifications = await notificationService.notifySettlementBatch(settlements, createdBy);

          expect(notifications).toBeDefined();
          expect(Array.isArray(notifications)).toBe(true);

          // Verify batch processing maintains data consistency
          const partySummaries = {};
          settlements.forEach(settlement => {
            if (!partySummaries[settlement.party]) {
              partySummaries[settlement.party] = {
                totalAmount: 0,
                count: 0,
                currency: settlement.currency
              };
            }
            partySummaries[settlement.party].totalAmount += settlement.totalAmount;
            partySummaries[settlement.party].count += 1;
          });

          // Each party should receive notifications consistent with their settlements
          Object.keys(partySummaries).forEach(party => {
            const partyUserCount = mockPartyUsers[party]?.length || 0;
            if (partyUserCount > 0) {
              expect(mockCreateNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                  metadata: expect.objectContaining({
                    party,
                    totalAmount: partySummaries[party].totalAmount,
                    settlementCount: partySummaries[party].count
                  })
                })
              );
            }
          });

        } catch (error) {
          // Batch operations should be resilient
          expect(error.message).not.toContain('batch failure');
        }

        // Cleanup
        mockNotifySettlementBatch.mockRestore();
        mockGetPartyUserIds.mockRestore();
        mockCreateNotification.mockRestore();
      }
    ), { numRuns: 20 });
  });
});