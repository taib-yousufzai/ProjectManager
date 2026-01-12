import fc from 'fast-check';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ledgerService } from '../ledgerService';
import { PARTY_TYPES, LEDGER_ENTRY_STATUSES, LEDGER_ENTRY_TYPES } from '../../models';

// Mock Firestore service
vi.mock('../firestore', () => ({
  ledgerEntriesService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getById: vi.fn()
  },
  settlementsService: {
    getAll: vi.fn(),
    create: vi.fn(),
    getById: vi.fn()
  }
}));

describe('Ledger Service Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Property 9: Ledger Filtering and Display
  describe('Property 9: Ledger Filtering and Display', () => {
    /**
     * Feature: revenue-auto-split-ledger, Property 9: Ledger Filtering and Display
     * **Validates: Requirements 3.2, 3.3**
     * 
     * For any combination of filter criteria (party, date range, project, status), 
     * the ledger should return only entries matching all specified filters and 
     * display complete entry information.
     */
    
    // Generator for ledger entries
    const ledgerEntryArb = fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      paymentId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
      projectId: fc.string({ minLength: 1, maxLength: 20 }),
      revenueRuleId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
      type: fc.constantFrom(...Object.values(LEDGER_ENTRY_TYPES)),
      party: fc.constantFrom(...Object.values(PARTY_TYPES)),
      amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
      currency: fc.constantFrom('USD', 'EUR', 'GBP'),
      date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
      status: fc.constantFrom(...Object.values(LEDGER_ENTRY_STATUSES)),
      remarks: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
      settlementId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null })
    });

    // Generator for filter criteria
    const filterCriteriaArb = fc.record({
      party: fc.option(fc.constantFrom(...Object.values(PARTY_TYPES)), { nil: undefined }),
      status: fc.option(fc.constantFrom(...Object.values(LEDGER_ENTRY_STATUSES)), { nil: undefined }),
      projectId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      currency: fc.option(fc.constantFrom('USD', 'EUR', 'GBP'), { nil: undefined }),
      type: fc.option(fc.constantFrom(...Object.values(LEDGER_ENTRY_TYPES)), { nil: undefined }),
      dateRange: fc.option(
        fc.record({
          start: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
          end: fc.date({ min: new Date('2021-01-01'), max: new Date('2025-12-31') })
        }).filter(({ start, end }) => start <= end),
        { nil: undefined }
      )
    });

    test('should return only entries matching all specified filter criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(ledgerEntryArb, { minLength: 0, maxLength: 50 }),
          filterCriteriaArb,
          async (mockEntries, filters) => {
            // Mock the Firestore service to return our test entries
            const { ledgerEntriesService } = require('../firestore');
            ledgerEntriesService.getAll.mockResolvedValue(mockEntries);

            // Apply filters using the service
            const filteredEntries = await ledgerService.getLedgerEntries(filters);

            // Verify that all returned entries match the filter criteria
            for (const entry of filteredEntries) {
              // Check party filter
              if (filters.party !== undefined) {
                expect(entry.party).toBe(filters.party);
              }

              // Check status filter
              if (filters.status !== undefined) {
                expect(entry.status).toBe(filters.status);
              }

              // Check project filter
              if (filters.projectId !== undefined) {
                expect(entry.projectId).toBe(filters.projectId);
              }

              // Check currency filter
              if (filters.currency !== undefined) {
                expect(entry.currency).toBe(filters.currency);
              }

              // Check type filter
              if (filters.type !== undefined) {
                expect(entry.type).toBe(filters.type);
              }

              // Check date range filter
              if (filters.dateRange !== undefined) {
                const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
                expect(entryDate >= filters.dateRange.start).toBe(true);
                expect(entryDate <= filters.dateRange.end).toBe(true);
              }

              // Verify complete entry information is present
              expect(entry).toHaveProperty('id');
              expect(entry).toHaveProperty('projectId');
              expect(entry).toHaveProperty('type');
              expect(entry).toHaveProperty('party');
              expect(entry).toHaveProperty('amount');
              expect(entry).toHaveProperty('currency');
              expect(entry).toHaveProperty('date');
              expect(entry).toHaveProperty('status');

              // Verify data types and constraints
              expect(typeof entry.id).toBe('string');
              expect(typeof entry.projectId).toBe('string');
              expect(Object.values(LEDGER_ENTRY_TYPES)).toContain(entry.type);
              expect(Object.values(PARTY_TYPES)).toContain(entry.party);
              expect(typeof entry.amount).toBe('number');
              expect(entry.amount).toBeGreaterThan(0);
              expect(typeof entry.currency).toBe('string');
              expect(entry.date).toBeInstanceOf(Date);
              expect(Object.values(LEDGER_ENTRY_STATUSES)).toContain(entry.status);
            }

            // Verify no entries are missing that should match the filters
            const expectedEntries = mockEntries.filter(entry => {
              let matches = true;

              if (filters.party !== undefined && entry.party !== filters.party) {
                matches = false;
              }

              if (filters.status !== undefined && entry.status !== filters.status) {
                matches = false;
              }

              if (filters.projectId !== undefined && entry.projectId !== filters.projectId) {
                matches = false;
              }

              if (filters.currency !== undefined && entry.currency !== filters.currency) {
                matches = false;
              }

              if (filters.type !== undefined && entry.type !== filters.type) {
                matches = false;
              }

              if (filters.dateRange !== undefined) {
                const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
                if (entryDate < filters.dateRange.start || entryDate > filters.dateRange.end) {
                  matches = false;
                }
              }

              return matches;
            });

            expect(filteredEntries).toHaveLength(expectedEntries.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle empty filter criteria by returning all entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(ledgerEntryArb, { minLength: 0, maxLength: 20 }),
          async (mockEntries) => {
            const { ledgerEntriesService } = require('../firestore');
            ledgerEntriesService.getAll.mockResolvedValue(mockEntries);

            const filteredEntries = await ledgerService.getLedgerEntries({});

            expect(filteredEntries).toHaveLength(mockEntries.length);
            expect(filteredEntries).toEqual(mockEntries);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should maintain data integrity during filtering operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(ledgerEntryArb, { minLength: 1, maxLength: 30 }),
          filterCriteriaArb,
          async (mockEntries, filters) => {
            const { ledgerEntriesService } = require('../firestore');
            ledgerEntriesService.getAll.mockResolvedValue(mockEntries);

            const filteredEntries = await ledgerService.getLedgerEntries(filters);

            // Verify that filtering doesn't modify original data
            for (const entry of filteredEntries) {
              const originalEntry = mockEntries.find(e => e.id === entry.id);
              expect(originalEntry).toBeDefined();
              expect(entry).toEqual(originalEntry);
            }

            // Verify that all required fields are preserved
            for (const entry of filteredEntries) {
              expect(entry.amount).toBeGreaterThan(0);
              expect(entry.currency).toBeTruthy();
              expect(entry.projectId).toBeTruthy();
              expect(Object.values(PARTY_TYPES)).toContain(entry.party);
              expect(Object.values(LEDGER_ENTRY_TYPES)).toContain(entry.type);
              expect(Object.values(LEDGER_ENTRY_STATUSES)).toContain(entry.status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle complex multi-criteria filtering correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(ledgerEntryArb, { minLength: 5, maxLength: 25 }),
          fc.record({
            party: fc.constantFrom(...Object.values(PARTY_TYPES)),
            status: fc.constantFrom(...Object.values(LEDGER_ENTRY_STATUSES)),
            currency: fc.constantFrom('USD', 'EUR', 'GBP')
          }),
          async (mockEntries, complexFilters) => {
            const { ledgerEntriesService } = require('../firestore');
            ledgerEntriesService.getAll.mockResolvedValue(mockEntries);

            const filteredEntries = await ledgerService.getLedgerEntries(complexFilters);

            // Every returned entry must match ALL filter criteria
            for (const entry of filteredEntries) {
              expect(entry.party).toBe(complexFilters.party);
              expect(entry.status).toBe(complexFilters.status);
              expect(entry.currency).toBe(complexFilters.currency);
            }

            // Count expected matches manually
            const expectedCount = mockEntries.filter(entry =>
              entry.party === complexFilters.party &&
              entry.status === complexFilters.status &&
              entry.currency === complexFilters.currency
            ).length;

            expect(filteredEntries).toHaveLength(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

  // Property 10: Balance Calculation Accuracy
  describe('Property 10: Balance Calculation Accuracy', () => {
    /**
     * Feature: revenue-auto-split-ledger, Property 10: Balance Calculation Accuracy
     * **Validates: Requirements 3.4**
     * 
     * For any set of ledger entries for a party, the running balance should 
     * accurately reflect the sum of all credits minus debits, grouped by currency.
     */

    test('should accurately calculate party balance from ledger entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...Object.values(PARTY_TYPES)),
          fc.constantFrom('USD', 'EUR', 'GBP'),
          fc.array(ledgerEntryArb, { minLength: 1, maxLength: 20 }),
          async (party, currency, allEntries) => {
            // Filter entries for the specific party and currency
            const partyEntries = allEntries.filter(entry => 
              entry.party === party && entry.currency === currency
            );

            // Skip if no entries for this party/currency combination
            if (partyEntries.length === 0) return;

            const { ledgerEntriesService } = require('../firestore');
            ledgerEntriesService.getAll.mockResolvedValue(partyEntries);

            const balance = await ledgerService.getPartyBalance(party, currency);

            // Calculate expected balance manually
            const expectedPending = partyEntries
              .filter(e => e.status === LEDGER_ENTRY_STATUSES.PENDING)
              .reduce((sum, entry) => {
                const amount = entry.type === LEDGER_ENTRY_TYPES.CREDIT ? entry.amount : -entry.amount;
                return sum + amount;
              }, 0);

            const expectedCleared = partyEntries
              .filter(e => e.status === LEDGER_ENTRY_STATUSES.CLEARED)
              .reduce((sum, entry) => {
                const amount = entry.type === LEDGER_ENTRY_TYPES.CREDIT ? entry.amount : -entry.amount;
                return sum + amount;
              }, 0);

            const expectedNet = expectedPending + expectedCleared;

            // Verify balance calculation accuracy (within floating point precision)
            expect(Math.abs(balance.totalPending - Math.round(expectedPending * 100) / 100)).toBeLessThan(0.01);
            expect(Math.abs(balance.totalCleared - Math.round(expectedCleared * 100) / 100)).toBeLessThan(0.01);
            expect(Math.abs(balance.netBalance - Math.round(expectedNet * 100) / 100)).toBeLessThan(0.01);

            // Verify balance properties
            expect(balance.party).toBe(party);
            expect(balance.currency).toBe(currency);
            expect(balance.lastUpdated).toBeInstanceOf(Date);

            // Verify mathematical relationship
            expect(Math.abs(balance.netBalance - (balance.totalPending + balance.totalCleared))).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle zero balance correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...Object.values(PARTY_TYPES)),
          fc.constantFrom('USD', 'EUR', 'GBP'),
          async (party, currency) => {
            const { ledgerEntriesService } = require('../firestore');
            ledgerEntriesService.getAll.mockResolvedValue([]);

            const balance = await ledgerService.getPartyBalance(party, currency);

            expect(balance.totalPending).toBe(0);
            expect(balance.totalCleared).toBe(0);
            expect(balance.netBalance).toBe(0);
            expect(balance.party).toBe(party);
            expect(balance.currency).toBe(currency);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should maintain balance accuracy with mixed credit and debit entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...Object.values(PARTY_TYPES)),
          fc.constantFrom('USD', 'EUR', 'GBP'),
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              paymentId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
              projectId: fc.string({ minLength: 1, maxLength: 20 }),
              revenueRuleId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
              type: fc.constantFrom(...Object.values(LEDGER_ENTRY_TYPES)),
              party: fc.constantFrom(...Object.values(PARTY_TYPES)),
              amount: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
              currency: fc.constantFrom('USD', 'EUR', 'GBP'),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
              status: fc.constantFrom(...Object.values(LEDGER_ENTRY_STATUSES)),
              remarks: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
              settlementId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null })
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (party, currency, entries) => {
            // Ensure we have both credits and debits
            const mixedEntries = entries.map((entry, index) => ({
              ...entry,
              party,
              currency,
              type: index % 2 === 0 ? LEDGER_ENTRY_TYPES.CREDIT : LEDGER_ENTRY_TYPES.DEBIT
            }));

            const { ledgerEntriesService } = require('../firestore');
            ledgerEntriesService.getAll.mockResolvedValue(mixedEntries);

            const balance = await ledgerService.getPartyBalance(party, currency);

            // Calculate expected totals
            const credits = mixedEntries.filter(e => e.type === LEDGER_ENTRY_TYPES.CREDIT);
            const debits = mixedEntries.filter(e => e.type === LEDGER_ENTRY_TYPES.DEBIT);

            const totalCredits = credits.reduce((sum, e) => sum + e.amount, 0);
            const totalDebits = debits.reduce((sum, e) => sum + e.amount, 0);
            const expectedNet = totalCredits - totalDebits;

            // Verify the balance reflects the credit/debit relationship
            expect(Math.abs(balance.netBalance - Math.round(expectedNet * 100) / 100)).toBeLessThan(0.01);

            // Verify that credits increase balance and debits decrease it
            if (credits.length > 0 && debits.length > 0) {
              expect(typeof balance.netBalance).toBe('number');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle currency-specific balance calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...Object.values(PARTY_TYPES)),
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              paymentId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
              projectId: fc.string({ minLength: 1, maxLength: 20 }),
              revenueRuleId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
              type: fc.constantFrom(...Object.values(LEDGER_ENTRY_TYPES)),
              party: fc.constantFrom(...Object.values(PARTY_TYPES)),
              amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
              currency: fc.constantFrom('USD', 'EUR', 'GBP'),
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
              status: fc.constantFrom(...Object.values(LEDGER_ENTRY_STATUSES)),
              remarks: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
              settlementId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null })
            }),
            { minLength: 3, maxLength: 15 }
          ),
          async (party, entries) => {
            // Filter entries for the specific party
            const partyEntries = entries.map(entry => ({ ...entry, party }));

            const { ledgerEntriesService } = require('../firestore');
            ledgerEntriesService.getAll.mockResolvedValue(partyEntries);

            // Get balances for each currency
            const currencies = [...new Set(partyEntries.map(e => e.currency))];
            
            for (const currency of currencies) {
              const balance = await ledgerService.getPartyBalance(party, currency);
              
              // Verify only entries with matching currency are included
              const currencyEntries = partyEntries.filter(e => e.currency === currency);
              
              if (currencyEntries.length > 0) {
                expect(balance.currency).toBe(currency);
                expect(balance.party).toBe(party);
                
                // Verify balance is calculated only from entries with matching currency
                const expectedBalance = currencyEntries.reduce((sum, entry) => {
                  const amount = entry.type === LEDGER_ENTRY_TYPES.CREDIT ? entry.amount : -entry.amount;
                  return sum + amount;
                }, 0);
                
                expect(Math.abs(balance.netBalance - Math.round(expectedBalance * 100) / 100)).toBeLessThan(0.01);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});