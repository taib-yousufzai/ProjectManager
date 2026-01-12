import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { 
  prepareLedgerEntriesForCSV, 
  prepareSettlementsForCSV, 
  preparePartyBalancesForCSV,
  generateLedgerReportData,
  exportToCSV
} from '../exportUtils';
import { PARTY_TYPES, LEDGER_ENTRY_STATUSES, LEDGER_ENTRY_TYPES } from '../../models';

/**
 * Feature: revenue-auto-split-ledger, Property 15: Export Functionality
 * **Validates: Requirements 5.3**
 * 
 * Property: For any set of ledger data, the export function should generate 
 * complete CSV and PDF reports containing all relevant entry information.
 */

describe('Export Functionality Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock DOM methods for CSV export
    global.document = {
      createElement: vi.fn(() => ({
        setAttribute: vi.fn(),
        click: vi.fn(),
        style: {}
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      }
    };
    global.URL = {
      createObjectURL: vi.fn(() => 'mock-url'),
      revokeObjectURL: vi.fn()
    };
    global.Blob = vi.fn();
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
  const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') });

  const ledgerEntryArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    party: partyArb,
    type: entryTypeArb,
    status: entryStatusArb,
    amount: amountArb,
    currency: currencyArb,
    date: dateArb,
    projectId: fc.string({ minLength: 1, maxLength: 50 }),
    paymentId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    revenueRuleId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    settlementId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    remarks: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    createdAt: dateArb,
    updatedAt: dateArb
  });

  const settlementArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    party: partyArb,
    totalAmount: amountArb,
    currency: currencyArb,
    settlementDate: dateArb,
    ledgerEntryIds: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
    proofUrls: fc.option(fc.array(fc.webUrl(), { maxLength: 5 }), { nil: null }),
    remarks: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    createdBy: fc.string({ minLength: 1, maxLength: 50 }),
    createdAt: dateArb
  });

  const partyBalanceArb = fc.record({
    party: partyArb,
    totalPending: amountArb,
    totalCleared: amountArb,
    netBalance: fc.float({ min: Math.fround(-10000), max: Math.fround(10000), noNaN: true }),
    currency: currencyArb,
    lastUpdated: dateArb
  });

  it('should preserve all ledger entry data in CSV export format', () => {
    fc.assert(
      fc.property(
        fc.array(ledgerEntryArb, { minLength: 1, maxLength: 100 }),
        (ledgerEntries) => {
          const csvData = prepareLedgerEntriesForCSV(ledgerEntries);

          // Verify same number of records
          expect(csvData).toHaveLength(ledgerEntries.length);

          // Verify all required fields are present in each CSV record
          csvData.forEach((csvRecord, index) => {
            const originalEntry = ledgerEntries[index];

            // Check all required fields exist
            expect(csvRecord).toHaveProperty('Entry ID');
            expect(csvRecord).toHaveProperty('Date');
            expect(csvRecord).toHaveProperty('Party');
            expect(csvRecord).toHaveProperty('Type');
            expect(csvRecord).toHaveProperty('Amount');
            expect(csvRecord).toHaveProperty('Currency');
            expect(csvRecord).toHaveProperty('Status');
            expect(csvRecord).toHaveProperty('Project ID');
            expect(csvRecord).toHaveProperty('Payment ID');
            expect(csvRecord).toHaveProperty('Revenue Rule ID');
            expect(csvRecord).toHaveProperty('Settlement ID');
            expect(csvRecord).toHaveProperty('Remarks');
            expect(csvRecord).toHaveProperty('Created At');
            expect(csvRecord).toHaveProperty('Updated At');

            // Verify data integrity
            expect(csvRecord['Entry ID']).toBe(originalEntry.id);
            expect(csvRecord['Amount']).toBe(originalEntry.amount);
            expect(csvRecord['Currency']).toBe(originalEntry.currency);
            expect(csvRecord['Party']).toBe(originalEntry.party.charAt(0).toUpperCase() + originalEntry.party.slice(1));
            expect(csvRecord['Type']).toBe(originalEntry.type.charAt(0).toUpperCase() + originalEntry.type.slice(1));
            expect(csvRecord['Status']).toBe(originalEntry.status.charAt(0).toUpperCase() + originalEntry.status.slice(1));
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve all settlement data in CSV export format', () => {
    fc.assert(
      fc.property(
        fc.array(settlementArb, { minLength: 1, maxLength: 50 }),
        (settlements) => {
          const csvData = prepareSettlementsForCSV(settlements);

          // Verify same number of records
          expect(csvData).toHaveLength(settlements.length);

          // Verify all required fields are present and data integrity
          csvData.forEach((csvRecord, index) => {
            const originalSettlement = settlements[index];

            // Check all required fields exist
            expect(csvRecord).toHaveProperty('Settlement ID');
            expect(csvRecord).toHaveProperty('Party');
            expect(csvRecord).toHaveProperty('Total Amount');
            expect(csvRecord).toHaveProperty('Currency');
            expect(csvRecord).toHaveProperty('Settlement Date');
            expect(csvRecord).toHaveProperty('Entry Count');
            expect(csvRecord).toHaveProperty('Ledger Entry IDs');
            expect(csvRecord).toHaveProperty('Proof URLs');
            expect(csvRecord).toHaveProperty('Remarks');
            expect(csvRecord).toHaveProperty('Created By');
            expect(csvRecord).toHaveProperty('Created At');

            // Verify data integrity
            expect(csvRecord['Settlement ID']).toBe(originalSettlement.id);
            expect(csvRecord['Total Amount']).toBe(originalSettlement.totalAmount);
            expect(csvRecord['Currency']).toBe(originalSettlement.currency);
            expect(csvRecord['Party']).toBe(originalSettlement.party.charAt(0).toUpperCase() + originalSettlement.party.slice(1));
            expect(csvRecord['Entry Count']).toBe(originalSettlement.ledgerEntryIds.length);
            expect(csvRecord['Created By']).toBe(originalSettlement.createdBy);

            // Verify array fields are properly joined
            expect(csvRecord['Ledger Entry IDs']).toBe(originalSettlement.ledgerEntryIds.join('; '));
            
            if (originalSettlement.proofUrls) {
              expect(csvRecord['Proof URLs']).toBe(originalSettlement.proofUrls.join('; '));
            } else {
              expect(csvRecord['Proof URLs']).toBe('N/A');
            }
          });
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should preserve all party balance data in CSV export format', () => {
    fc.assert(
      fc.property(
        fc.array(partyBalanceArb, { minLength: 1, maxLength: 20 }),
        (balances) => {
          const csvData = preparePartyBalancesForCSV(balances);

          // Verify same number of records
          expect(csvData).toHaveLength(balances.length);

          // Verify all required fields are present and data integrity
          csvData.forEach((csvRecord, index) => {
            const originalBalance = balances[index];

            // Check all required fields exist
            expect(csvRecord).toHaveProperty('Party');
            expect(csvRecord).toHaveProperty('Total Pending');
            expect(csvRecord).toHaveProperty('Total Cleared');
            expect(csvRecord).toHaveProperty('Net Balance');
            expect(csvRecord).toHaveProperty('Currency');
            expect(csvRecord).toHaveProperty('Last Updated');

            // Verify data integrity
            expect(csvRecord['Party']).toBe(originalBalance.party.charAt(0).toUpperCase() + originalBalance.party.slice(1));
            expect(csvRecord['Total Pending']).toBe(originalBalance.totalPending);
            expect(csvRecord['Total Cleared']).toBe(originalBalance.totalCleared);
            expect(csvRecord['Net Balance']).toBe(originalBalance.netBalance);
            expect(csvRecord['Currency']).toBe(originalBalance.currency);
          });
        }
      ),
      { numRuns: 40 }
    );
  });

  it('should generate complete report data with all sections', () => {
    fc.assert(
      fc.property(
        fc.record({
          ledgerEntries: fc.array(ledgerEntryArb, { maxLength: 20 }),
          settlements: fc.array(settlementArb, { maxLength: 10 }),
          balances: fc.array(partyBalanceArb, { maxLength: 5 }),
          summaryStats: fc.record({
            totalEntries: fc.nat({ max: 1000 }),
            pendingEntries: fc.nat({ max: 500 }),
            clearedEntries: fc.nat({ max: 500 }),
            totalSettlements: fc.nat({ max: 100 }),
            totalPendingAmount: amountArb,
            totalClearedAmount: amountArb
          })
        }),
        fc.record({
          party: fc.option(partyArb, { nil: null }),
          status: fc.option(fc.constantFrom('pending', 'cleared'), { nil: null }),
          currency: fc.option(currencyArb, { nil: null }),
          projectId: fc.option(fc.string({ minLength: 1 }), { nil: null })
        }),
        (data, filters) => {
          const reportData = generateLedgerReportData(data, filters);

          // Verify report structure
          expect(reportData).toHaveProperty('title');
          expect(reportData).toHaveProperty('filters');
          expect(reportData).toHaveProperty('summary');
          expect(reportData).toHaveProperty('ledgerEntries');
          expect(reportData).toHaveProperty('settlements');
          expect(reportData).toHaveProperty('balances');

          // Verify title
          expect(reportData.title).toBe('Ledger & Settlement Report');

          // Verify filters are properly formatted
          expect(reportData.filters.party).toBe(filters.party || 'All Parties');
          expect(reportData.filters.status).toBe(filters.status || 'All Statuses');
          expect(reportData.filters.currency).toBe(filters.currency || 'All Currencies');
          expect(reportData.filters.projectId).toBe(filters.projectId || 'All Projects');

          // Verify summary statistics
          expect(reportData.summary).toHaveProperty('Total Entries');
          expect(reportData.summary).toHaveProperty('Pending Entries');
          expect(reportData.summary).toHaveProperty('Cleared Entries');
          expect(reportData.summary).toHaveProperty('Total Settlements');
          expect(reportData.summary).toHaveProperty('Total Pending Amount');
          expect(reportData.summary).toHaveProperty('Total Cleared Amount');

          // Verify data sections are arrays (or null/undefined)
          if (reportData.ledgerEntries) {
            expect(Array.isArray(reportData.ledgerEntries)).toBe(true);
            // Should be limited to 100 entries
            expect(reportData.ledgerEntries.length).toBeLessThanOrEqual(100);
          }

          if (reportData.settlements) {
            expect(Array.isArray(reportData.settlements)).toBe(true);
            // Should be limited to 50 settlements
            expect(reportData.settlements.length).toBeLessThanOrEqual(50);
          }

          if (reportData.balances) {
            expect(Array.isArray(reportData.balances)).toBe(true);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should handle empty data gracefully in export functions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom([], null, undefined),
        (emptyData) => {
          // Test with empty ledger entries
          if (Array.isArray(emptyData)) {
            const csvData = prepareLedgerEntriesForCSV(emptyData);
            expect(csvData).toEqual([]);
          }

          // Test with empty settlements
          if (Array.isArray(emptyData)) {
            const csvData = prepareSettlementsForCSV(emptyData);
            expect(csvData).toEqual([]);
          }

          // Test with empty balances
          if (Array.isArray(emptyData)) {
            const csvData = preparePartyBalancesForCSV(emptyData);
            expect(csvData).toEqual([]);
          }

          // Test report generation with empty data
          const reportData = generateLedgerReportData({
            ledgerEntries: emptyData,
            settlements: emptyData,
            balances: emptyData,
            summaryStats: {
              totalEntries: 0,
              pendingEntries: 0,
              clearedEntries: 0,
              totalSettlements: 0,
              totalPendingAmount: 0,
              totalClearedAmount: 0
            }
          });

          expect(reportData).toHaveProperty('title');
          expect(reportData).toHaveProperty('summary');
          expect(reportData.summary['Total Entries']).toBe(0);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should properly format dates in CSV exports', () => {
    fc.assert(
      fc.property(
        fc.array(ledgerEntryArb, { minLength: 1, maxLength: 10 }),
        (ledgerEntries) => {
          const csvData = prepareLedgerEntriesForCSV(ledgerEntries);

          csvData.forEach((csvRecord, index) => {
            const originalEntry = ledgerEntries[index];

            // Verify date formatting
            const expectedDate = originalEntry.date.toDate ? 
              originalEntry.date.toDate().toLocaleDateString() : 
              new Date(originalEntry.date).toLocaleDateString();
            
            expect(csvRecord['Date']).toBe(expectedDate);

            // Verify created/updated date formatting
            const expectedCreatedAt = originalEntry.createdAt.toDate ? 
              originalEntry.createdAt.toDate().toLocaleDateString() : 
              new Date(originalEntry.createdAt).toLocaleDateString();
            
            expect(csvRecord['Created At']).toBe(expectedCreatedAt);
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle null and undefined values correctly in CSV exports', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.string({ minLength: 1 }),
          party: partyArb,
          type: entryTypeArb,
          status: entryStatusArb,
          amount: amountArb,
          currency: currencyArb,
          date: dateArb,
          projectId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
          paymentId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
          revenueRuleId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
          settlementId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
          remarks: fc.option(fc.string(), { nil: null }),
          createdAt: dateArb,
          updatedAt: dateArb
        }), { minLength: 1, maxLength: 10 }),
        (ledgerEntries) => {
          const csvData = prepareLedgerEntriesForCSV(ledgerEntries);

          csvData.forEach((csvRecord, index) => {
            const originalEntry = ledgerEntries[index];

            // Verify null/undefined values are converted to 'N/A'
            if (originalEntry.projectId === null || originalEntry.projectId === undefined) {
              expect(csvRecord['Project ID']).toBe('N/A');
            }
            
            if (originalEntry.paymentId === null || originalEntry.paymentId === undefined) {
              expect(csvRecord['Payment ID']).toBe('N/A');
            }
            
            if (originalEntry.revenueRuleId === null || originalEntry.revenueRuleId === undefined) {
              expect(csvRecord['Revenue Rule ID']).toBe('N/A');
            }
            
            if (originalEntry.settlementId === null || originalEntry.settlementId === undefined) {
              expect(csvRecord['Settlement ID']).toBe('N/A');
            }
            
            if (originalEntry.remarks === null || originalEntry.remarks === undefined) {
              expect(csvRecord['Remarks']).toBe('');
            }
          });
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain data consistency across multiple export formats', () => {
    fc.assert(
      fc.property(
        fc.record({
          ledgerEntries: fc.array(ledgerEntryArb, { minLength: 1, maxLength: 20 }),
          settlements: fc.array(settlementArb, { minLength: 1, maxLength: 10 }),
          balances: fc.array(partyBalanceArb, { minLength: 1, maxLength: 5 })
        }),
        (data) => {
          // Generate both CSV and report data
          const ledgerCSV = prepareLedgerEntriesForCSV(data.ledgerEntries);
          const settlementsCSV = prepareSettlementsForCSV(data.settlements);
          const balancesCSV = preparePartyBalancesForCSV(data.balances);
          
          const reportData = generateLedgerReportData({
            ...data,
            summaryStats: {
              totalEntries: data.ledgerEntries.length,
              pendingEntries: data.ledgerEntries.filter(e => e.status === 'pending').length,
              clearedEntries: data.ledgerEntries.filter(e => e.status === 'cleared').length,
              totalSettlements: data.settlements.length,
              totalPendingAmount: 1000,
              totalClearedAmount: 2000
            }
          });

          // Verify consistency between formats
          expect(ledgerCSV.length).toBe(data.ledgerEntries.length);
          expect(settlementsCSV.length).toBe(data.settlements.length);
          expect(balancesCSV.length).toBe(data.balances.length);

          // Verify report data contains same number of items (up to limits)
          if (reportData.ledgerEntries) {
            expect(reportData.ledgerEntries.length).toBeLessThanOrEqual(data.ledgerEntries.length);
          }
          
          if (reportData.settlements) {
            expect(reportData.settlements.length).toBeLessThanOrEqual(data.settlements.length);
          }
          
          if (reportData.balances) {
            expect(reportData.balances.length).toBe(data.balances.length);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});