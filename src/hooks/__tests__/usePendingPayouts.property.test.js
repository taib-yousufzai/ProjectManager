import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { usePendingPayouts } from '../usePendingPayouts';
import { ledgerService } from '../../services/ledgerService';
import { PARTY_TYPES, LEDGER_ENTRY_STATUSES, LEDGER_ENTRY_TYPES } from '../../models';

// Mock the ledger service
vi.mock('../../services/ledgerService');

/**
 * Feature: revenue-auto-split-ledger, Property 16: Dashboard Calculations
 * **Validates: Requirements 5.4**
 * 
 * Property: For any current ledger state, the dashboard should accurately calculate 
 * and display pending payout amounts per party.
 */

describe('usePendingPayouts Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Generators for test data
  const partyArb = fc.constantFrom(...Object.values(PARTY_TYPES));
  const currencyArb = fc.constantFrom('USD', 'EUR', 'GBP');
  const amountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true });
  const entryTypeArb = fc.constantFrom(...Object.values(LEDGER_ENTRY_TYPES));
  const entryStatusArb = fc.constantFrom(...Object.values(LEDGER_ENTRY_STATUSES));

  const ledgerEntryArb = fc.record({
    id: fc.string({ minLength: 1 }),
    party: partyArb,
    type: entryTypeArb,
    status: entryStatusArb,
    amount: amountArb,
    currency: currencyArb,
    date: fc.date(),
    projectId: fc.string({ minLength: 1 }),
    paymentId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    revenueRuleId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    remarks: fc.option(fc.string(), { nil: null })
  });

  const partyBalanceArb = fc.record({
    party: partyArb,
    totalPending: amountArb,
    totalCleared: amountArb,
    netBalance: fc.float({ min: Math.fround(-10000), max: Math.fround(10000), noNaN: true }),
    currency: currencyArb,
    lastUpdated: fc.date()
  });

  it('should accurately calculate total pending amounts across all parties', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(partyBalanceArb, { minLength: 1, maxLength: 10 }),
        async (balances) => {
          // Setup mocks
          const mockBalances = {};
          const mockEntries = {};
          
          balances.forEach(balance => {
            mockBalances[balance.party] = balance;
            mockEntries[balance.party] = [];
          });

          ledgerService.getPartyBalance = vi.fn().mockImplementation(async (party) => {
            return mockBalances[party] || {
              party,
              totalPending: 0,
              totalCleared: 0,
              netBalance: 0,
              currency: 'USD',
              lastUpdated: new Date()
            };
          });

          ledgerService.getPendingEntriesForSettlement = vi.fn().mockImplementation(async (party) => {
            return mockEntries[party] || [];
          });

          // Render hook
          const { result } = renderHook(() => usePendingPayouts(0)); // No refresh interval

          // Wait for loading to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Calculate expected total pending
          const expectedTotalPending = balances.reduce((sum, balance) => sum + balance.totalPending, 0);
          const roundedExpected = Math.round(expectedTotalPending * 100) / 100;

          // Verify total pending calculation
          expect(result.current.totalPending).toBeCloseTo(roundedExpected, 2);

          // Verify individual party amounts match
          Object.entries(result.current.payouts).forEach(([party, data]) => {
            const expectedBalance = balances.find(b => b.party === party);
            if (expectedBalance) {
              expect(data.amount).toBeCloseTo(expectedBalance.totalPending, 2);
              expect(data.currency).toBe(expectedBalance.currency);
            }
          });

          // Verify hasPendingPayouts flag
          const shouldHavePending = expectedTotalPending > 0;
          expect(result.current.hasPendingPayouts).toBe(shouldHavePending);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly identify the party with highest pending amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(partyBalanceArb, { minLength: 2, maxLength: 5 }),
        async (balances) => {
          // Ensure we have different amounts to avoid ties
          const uniqueBalances = balances.map((balance, index) => ({
            ...balance,
            totalPending: balance.totalPending + index * 0.01 // Add small increment to avoid ties
          }));

          // Setup mocks
          const mockBalances = {};
          uniqueBalances.forEach(balance => {
            mockBalances[balance.party] = balance;
          });

          ledgerService.getPartyBalance = vi.fn().mockImplementation(async (party) => {
            return mockBalances[party] || {
              party,
              totalPending: 0,
              totalCleared: 0,
              netBalance: 0,
              currency: 'USD',
              lastUpdated: new Date()
            };
          });

          ledgerService.getPendingEntriesForSettlement = vi.fn().mockResolvedValue([]);

          // Render hook
          const { result } = renderHook(() => usePendingPayouts(0));

          // Wait for loading to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Find expected highest pending party
          const expectedHighest = uniqueBalances.reduce((highest, current) => 
            current.totalPending > highest.totalPending ? current : highest
          );

          // Verify highest pending party identification
          expect(result.current.highestPendingParty.party).toBe(expectedHighest.party);
          expect(result.current.highestPendingParty.amount).toBeCloseTo(expectedHighest.totalPending, 2);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should correctly identify parties needing attention (with pending amounts)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(partyBalanceArb, { minLength: 1, maxLength: 10 }),
        async (balances) => {
          // Setup mocks
          const mockBalances = {};
          balances.forEach(balance => {
            mockBalances[balance.party] = balance;
          });

          ledgerService.getPartyBalance = vi.fn().mockImplementation(async (party) => {
            return mockBalances[party] || {
              party,
              totalPending: 0,
              totalCleared: 0,
              netBalance: 0,
              currency: 'USD',
              lastUpdated: new Date()
            };
          });

          ledgerService.getPendingEntriesForSettlement = vi.fn().mockResolvedValue([]);

          // Render hook
          const { result } = renderHook(() => usePendingPayouts(0));

          // Wait for loading to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Calculate expected parties needing attention
          const expectedPartiesNeedingAttention = balances.filter(balance => balance.totalPending > 0);

          // Verify parties needing attention
          expect(result.current.partiesNeedingAttention).toHaveLength(expectedPartiesNeedingAttention.length);
          
          result.current.partiesNeedingAttention.forEach(party => {
            expect(party.amount).toBeGreaterThan(0);
            const expectedParty = expectedPartiesNeedingAttention.find(b => b.party === party.party);
            expect(expectedParty).toBeDefined();
            expect(party.amount).toBeCloseTo(expectedParty.totalPending, 2);
          });
        }
      ),
      { numRuns: 40 }
    );
  });

  it('should handle zero amounts correctly without floating point errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          party: partyArb,
          totalPending: fc.constantFrom(0, 0.00, -0.00), // Various zero representations
          totalCleared: amountArb,
          netBalance: amountArb,
          currency: currencyArb,
          lastUpdated: fc.date()
        }), { minLength: 1, maxLength: 5 }),
        async (balances) => {
          // Setup mocks
          const mockBalances = {};
          balances.forEach(balance => {
            mockBalances[balance.party] = balance;
          });

          ledgerService.getPartyBalance = vi.fn().mockImplementation(async (party) => {
            return mockBalances[party] || {
              party,
              totalPending: 0,
              totalCleared: 0,
              netBalance: 0,
              currency: 'USD',
              lastUpdated: new Date()
            };
          });

          ledgerService.getPendingEntriesForSettlement = vi.fn().mockResolvedValue([]);

          // Render hook
          const { result } = renderHook(() => usePendingPayouts(0));

          // Wait for loading to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Verify zero amounts are handled correctly
          expect(result.current.totalPending).toBe(0);
          expect(result.current.hasPendingPayouts).toBe(false);
          expect(result.current.partiesNeedingAttention).toHaveLength(0);
          expect(result.current.highestPendingParty.amount).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain calculation accuracy with currency rounding', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          party: partyArb,
          totalPending: fc.float({ min: Math.fround(0.001), max: Math.fround(999.999), noNaN: true }), // Amounts with many decimal places
          totalCleared: amountArb,
          netBalance: amountArb,
          currency: currencyArb,
          lastUpdated: fc.date()
        }), { minLength: 1, maxLength: 8 }),
        async (balances) => {
          // Setup mocks
          const mockBalances = {};
          balances.forEach(balance => {
            mockBalances[balance.party] = balance;
          });

          ledgerService.getPartyBalance = vi.fn().mockImplementation(async (party) => {
            return mockBalances[party] || {
              party,
              totalPending: 0,
              totalCleared: 0,
              netBalance: 0,
              currency: 'USD',
              lastUpdated: new Date()
            };
          });

          ledgerService.getPendingEntriesForSettlement = vi.fn().mockResolvedValue([]);

          // Render hook
          const { result } = renderHook(() => usePendingPayouts(0));

          // Wait for loading to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Verify amounts are properly rounded to 2 decimal places
          const totalPending = result.current.totalPending;
          const roundedTotal = Math.round(totalPending * 100) / 100;
          expect(totalPending).toBe(roundedTotal);

          // Verify individual party amounts are properly rounded
          Object.values(result.current.payouts).forEach(payout => {
            const roundedAmount = Math.round(payout.amount * 100) / 100;
            expect(payout.amount).toBe(roundedAmount);
          });

          // Verify total is sum of individual amounts (within floating point precision)
          const sumOfIndividual = Object.values(result.current.payouts)
            .reduce((sum, payout) => sum + payout.amount, 0);
          const roundedSum = Math.round(sumOfIndividual * 100) / 100;
          expect(totalPending).toBeCloseTo(roundedSum, 2);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle service errors gracefully without breaking calculations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(partyArb, { minLength: 1, maxLength: 3 }),
        fc.array(partyArb, { minLength: 0, maxLength: 2 }), // Parties that will error
        async (successParties, errorParties) => {
          // Setup mocks - some succeed, some fail
          ledgerService.getPartyBalance = vi.fn().mockImplementation(async (party) => {
            if (errorParties.includes(party)) {
              throw new Error(`Service error for ${party}`);
            }
            return {
              party,
              totalPending: 100,
              totalCleared: 50,
              netBalance: 150,
              currency: 'USD',
              lastUpdated: new Date()
            };
          });

          ledgerService.getPendingEntriesForSettlement = vi.fn().mockImplementation(async (party) => {
            if (errorParties.includes(party)) {
              throw new Error(`Service error for ${party}`);
            }
            return [];
          });

          // Render hook
          const { result } = renderHook(() => usePendingPayouts(0));

          // Wait for loading to complete
          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Verify that successful parties are included in calculations
          const successfulParties = successParties.filter(p => !errorParties.includes(p));
          const expectedTotal = successfulParties.length * 100; // Each successful party has 100 pending

          if (successfulParties.length > 0) {
            expect(result.current.totalPending).toBeCloseTo(expectedTotal, 2);
            expect(result.current.hasPendingPayouts).toBe(true);
          } else {
            expect(result.current.totalPending).toBe(0);
            expect(result.current.hasPendingPayouts).toBe(false);
          }

          // Verify error parties have zero amounts or error states
          errorParties.forEach(party => {
            const partyData = result.current.payouts[party];
            if (partyData) {
              // Should either have zero amount or error state
              expect(partyData.amount === 0 || partyData.error).toBe(true);
            }
          });
        }
      ),
      { numRuns: 25 }
    );
  });
});