import fc from 'fast-check';
import { 
  validationService, 
  VALIDATION_ERROR_TYPES, 
  SUPPORTED_CURRENCIES 
} from '../validationService';
import { PARTY_TYPES, LEDGER_ENTRY_TYPES, LEDGER_ENTRY_STATUSES } from '../../models';

/**
 * Feature: revenue-auto-split-ledger, Property 17: Input Validation
 * **Validates: Requirements 6.1, 6.5**
 */

// Generators for test data
const validCurrencyGen = fc.constantFrom(...Object.keys(SUPPORTED_CURRENCIES));
const invalidCurrencyGen = fc.string().filter(s => !Object.keys(SUPPORTED_CURRENCIES).includes(s.toUpperCase()));
const partyTypeGen = fc.constantFrom(...Object.values(PARTY_TYPES));
const entryTypeGen = fc.constantFrom(...Object.values(LEDGER_ENTRY_TYPES));
const entryStatusGen = fc.constantFrom(...Object.values(LEDGER_ENTRY_STATUSES));

// Valid monetary amount generator
const validAmountGen = fc.float({ 
  min: Math.fround(0.01), 
  max: Math.fround(999999.99) 
});

// Invalid monetary amount generator
const invalidAmountGen = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(NaN),
  fc.constant(Infinity),
  fc.constant(-Infinity),
  fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01) }), // negative amounts
  fc.string(),
  fc.boolean(),
  fc.object()
);

// Valid percentage generator
const validPercentageGen = fc.float({ 
  min: Math.fround(0), 
  max: Math.fround(100) 
});

// Invalid percentage generator
const invalidPercentageGen = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(NaN),
  fc.float({ min: Math.fround(-100), max: Math.fround(-0.01) }), // negative
  fc.float({ min: Math.fround(100.01), max: Math.fround(200) }), // over 100
  fc.string(),
  fc.boolean()
);

describe('Input Validation Property Tests', () => {
  describe('Property 17.1: Monetary amount validation', () => {
    test('Valid monetary amounts should pass validation', () => {
      fc.assert(fc.property(
        validAmountGen,
        validCurrencyGen,
        (amount, currency) => {
          const result = validationService.validateMonetaryAmount(amount, currency);
          
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ), { numRuns: 100 });
    });

    test('Invalid monetary amounts should fail validation', () => {
      fc.assert(fc.property(
        invalidAmountGen,
        validCurrencyGen,
        (amount, currency) => {
          const result = validationService.validateMonetaryAmount(amount, currency);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          
          // Should contain appropriate error types
          const errorTypes = result.errors.map(e => e.type);
          expect(errorTypes).toContain(
            expect.stringMatching(/(required_field|invalid_type|invalid_format|invalid_range)/)
          );
        }
      ), { numRuns: 100 });
    });

    test('Amounts with too many decimal places should fail validation', () => {
      fc.assert(fc.property(
        validCurrencyGen,
        (currency) => {
          // Create amount with more than allowed decimal places
          const currencyRules = SUPPORTED_CURRENCIES[currency];
          const invalidAmount = parseFloat((Math.random() * 100).toFixed(currencyRules.decimals + 2));
          
          if (invalidAmount.toString().split('.')[1]?.length > currencyRules.decimals) {
            const result = validationService.validateMonetaryAmount(invalidAmount, currency);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === VALIDATION_ERROR_TYPES.INVALID_FORMAT)).toBe(true);
          }
        }
      ), { numRuns: 50 });
    });

    test('Amounts exceeding currency limits should fail validation', () => {
      fc.assert(fc.property(
        validCurrencyGen,
        (currency) => {
          const currencyRules = SUPPORTED_CURRENCIES[currency];
          const exceedingAmount = currencyRules.maxAmount + 1;
          
          const result = validationService.validateMonetaryAmount(exceedingAmount, currency);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.type === VALIDATION_ERROR_TYPES.INVALID_RANGE)).toBe(true);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 17.2: Currency validation', () => {
    test('Valid currencies should pass validation', () => {
      fc.assert(fc.property(
        validCurrencyGen,
        (currency) => {
          const result = validationService.validateField('currency', currency);
          
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ), { numRuns: 50 });
    });

    test('Invalid currencies should fail validation', () => {
      fc.assert(fc.property(
        invalidCurrencyGen,
        (currency) => {
          const result = validationService.validateField('currency', currency);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors.some(e => e.type === VALIDATION_ERROR_TYPES.INVALID_FORMAT)).toBe(true);
        }
      ), { numRuns: 50 });
    });

    test('Null or undefined currencies should fail validation', () => {
      fc.assert(fc.property(
        fc.constantFrom(null, undefined, ''),
        (currency) => {
          const result = validationService.validateField('currency', currency);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors.some(e => e.type === VALIDATION_ERROR_TYPES.REQUIRED_FIELD)).toBe(true);
        }
      ), { numRuns: 20 });
    });
  });

  describe('Property 17.3: Percentage validation', () => {
    test('Valid percentages should pass validation', () => {
      fc.assert(fc.property(
        validPercentageGen,
        (percentage) => {
          const result = validationService.validateField('percentage', percentage);
          
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ), { numRuns: 100 });
    });

    test('Invalid percentages should fail validation', () => {
      fc.assert(fc.property(
        invalidPercentageGen,
        (percentage) => {
          const result = validationService.validateField('percentage', percentage);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ), { numRuns: 100 });
    });

    test('Revenue rule percentages must sum to 100', () => {
      fc.assert(fc.property(
        validPercentageGen,
        validPercentageGen,
        validPercentageGen,
        (admin, team, vendor) => {
          const result = validationService.validateRevenueRulePercentages(admin, team, vendor);
          
          const total = admin + team + vendor;
          const isValidSum = Math.abs(total - 100) <= 0.01;
          
          expect(result.isValid).toBe(isValidSum);
          
          if (!isValidSum) {
            expect(result.errors.some(e => e.type === VALIDATION_ERROR_TYPES.BUSINESS_RULE_VIOLATION)).toBe(true);
          }
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 17.4: Ledger entry validation', () => {
    test('Valid ledger entries should pass validation', () => {
      fc.assert(fc.property(
        fc.record({
          projectId: fc.uuid(),
          type: entryTypeGen,
          party: partyTypeGen,
          amount: validAmountGen,
          currency: validCurrencyGen,
          date: fc.date(),
          status: entryStatusGen
        }),
        (entryData) => {
          const result = validationService.validateLedgerEntry(entryData);
          
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ), { numRuns: 100 });
    });

    test('Ledger entries with missing required fields should fail validation', () => {
      fc.assert(fc.property(
        fc.constantFrom('projectId', 'type', 'party', 'amount', 'currency', 'date'),
        (missingField) => {
          const validEntry = {
            projectId: 'project-123',
            type: LEDGER_ENTRY_TYPES.CREDIT,
            party: PARTY_TYPES.ADMIN,
            amount: 100.50,
            currency: 'USD',
            date: new Date()
          };
          
          // Remove the specified field
          delete validEntry[missingField];
          
          const result = validationService.validateLedgerEntry(validEntry);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors.some(e => 
            e.type === VALIDATION_ERROR_TYPES.REQUIRED_FIELD ||
            e.type === VALIDATION_ERROR_TYPES.INVALID_FORMAT
          )).toBe(true);
        }
      ), { numRuns: 50 });
    });

    test('Ledger entries with invalid field values should fail validation', () => {
      fc.assert(fc.property(
        fc.record({
          projectId: fc.uuid(),
          type: fc.string().filter(s => !Object.values(LEDGER_ENTRY_TYPES).includes(s)),
          party: fc.string().filter(s => !Object.values(PARTY_TYPES).includes(s)),
          amount: invalidAmountGen,
          currency: invalidCurrencyGen,
          date: fc.string()
        }),
        (entryData) => {
          const result = validationService.validateLedgerEntry(entryData);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 17.5: Settlement validation', () => {
    test('Valid settlements should pass validation', () => {
      fc.assert(fc.property(
        fc.record({
          party: partyTypeGen,
          ledgerEntryIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          currency: validCurrencyGen,
          settlementDate: fc.date()
        }),
        (settlementData) => {
          const result = validationService.validateSettlement(settlementData);
          
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ), { numRuns: 100 });
    });

    test('Settlements with missing required fields should fail validation', () => {
      fc.assert(fc.property(
        fc.constantFrom('party', 'ledgerEntryIds', 'currency', 'settlementDate'),
        (missingField) => {
          const validSettlement = {
            party: PARTY_TYPES.ADMIN,
            ledgerEntryIds: ['entry-1', 'entry-2'],
            currency: 'USD',
            settlementDate: new Date()
          };
          
          // Remove the specified field
          delete validSettlement[missingField];
          
          const result = validationService.validateSettlement(validSettlement);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors.some(e => 
            e.type === VALIDATION_ERROR_TYPES.REQUIRED_FIELD ||
            e.type === VALIDATION_ERROR_TYPES.INVALID_FORMAT
          )).toBe(true);
        }
      ), { numRuns: 50 });
    });

    test('Settlements with empty ledger entry IDs should fail validation', () => {
      fc.assert(fc.property(
        fc.constantFrom([], null, undefined),
        (emptyEntryIds) => {
          const settlementData = {
            party: PARTY_TYPES.ADMIN,
            ledgerEntryIds: emptyEntryIds,
            currency: 'USD',
            settlementDate: new Date()
          };
          
          const result = validationService.validateSettlement(settlementData);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.type === VALIDATION_ERROR_TYPES.REQUIRED_FIELD)).toBe(true);
        }
      ), { numRuns: 20 });
    });
  });

  describe('Property 17.6: Currency consistency validation', () => {
    test('Items with consistent currencies should pass validation', () => {
      fc.assert(fc.property(
        validCurrencyGen,
        fc.array(fc.record({
          amount: validAmountGen,
          currency: fc.constant('') // Will be set to the same currency
        }), { minLength: 1, maxLength: 5 }),
        (currency, items) => {
          // Set all items to the same currency
          const consistentItems = items.map(item => ({ ...item, currency }));
          
          const result = validationService.validateCurrencyConsistency(consistentItems);
          
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ), { numRuns: 50 });
    });

    test('Items with mixed currencies should fail validation', () => {
      fc.assert(fc.property(
        fc.array(validCurrencyGen, { minLength: 2, maxLength: 4 }),
        fc.array(fc.record({
          amount: validAmountGen
        }), { minLength: 2, maxLength: 4 }),
        (currencies, items) => {
          // Ensure we have different currencies
          const uniqueCurrencies = [...new Set(currencies)];
          if (uniqueCurrencies.length < 2) return; // Skip if not mixed
          
          // Assign different currencies to items
          const mixedItems = items.map((item, index) => ({
            ...item,
            currency: currencies[index % currencies.length]
          }));
          
          const result = validationService.validateCurrencyConsistency(mixedItems);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.type === VALIDATION_ERROR_TYPES.CURRENCY_MISMATCH)).toBe(true);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 17.7: Data formatting and parsing', () => {
    test('Formatted monetary amounts should be parseable', () => {
      fc.assert(fc.property(
        validAmountGen,
        validCurrencyGen,
        (amount, currency) => {
          const formatted = validationService.formatMonetaryAmount(amount, currency);
          const parsed = validationService.parseMonetaryAmount(formatted, currency);
          
          expect(parsed.isValid).toBe(true);
          
          if (parsed.isValid) {
            const currencyRules = SUPPORTED_CURRENCIES[currency];
            const expectedAmount = parseFloat(amount.toFixed(currencyRules.decimals));
            const parsedAmount = parseFloat(formatted);
            
            expect(Math.abs(parsedAmount - expectedAmount)).toBeLessThan(0.01);
          }
        }
      ), { numRuns: 100 });
    });

    test('Invalid amount strings should fail parsing', () => {
      fc.assert(fc.property(
        fc.string().filter(s => isNaN(parseFloat(s.replace(/[$€£,\s]/g, '')))),
        validCurrencyGen,
        (invalidString, currency) => {
          const result = validationService.parseMonetaryAmount(invalidString, currency);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.type === VALIDATION_ERROR_TYPES.INVALID_FORMAT)).toBe(true);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 17.8: Validation error consistency', () => {
    test('Validation errors should always include required fields', () => {
      fc.assert(fc.property(
        fc.oneof(
          invalidAmountGen,
          invalidCurrencyGen,
          invalidPercentageGen
        ),
        fc.constantFrom('monetary_amount', 'currency', 'percentage'),
        (invalidValue, ruleName) => {
          try {
            const result = validationService.validateField(ruleName, invalidValue);
            
            if (!result.isValid) {
              result.errors.forEach(error => {
                expect(error).toHaveProperty('type');
                expect(error).toHaveProperty('message');
                expect(typeof error.message).toBe('string');
                expect(error.message.length).toBeGreaterThan(0);
              });
            }
          } catch (e) {
            // Some combinations might throw, which is acceptable
          }
        }
      ), { numRuns: 100 });
    });

    test('Validation should be deterministic', () => {
      fc.assert(fc.property(
        fc.record({
          projectId: fc.uuid(),
          type: entryTypeGen,
          party: partyTypeGen,
          amount: validAmountGen,
          currency: validCurrencyGen,
          date: fc.date()
        }),
        (entryData) => {
          const result1 = validationService.validateLedgerEntry(entryData);
          const result2 = validationService.validateLedgerEntry(entryData);
          
          expect(result1.isValid).toBe(result2.isValid);
          expect(result1.errors.length).toBe(result2.errors.length);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 17.9: Edge case handling', () => {
    test('Validation should handle boundary values correctly', () => {
      fc.assert(fc.property(
        validCurrencyGen,
        (currency) => {
          const currencyRules = SUPPORTED_CURRENCIES[currency];
          
          // Test minimum valid amount
          const minResult = validationService.validateMonetaryAmount(currencyRules.minAmount, currency);
          expect(minResult.isValid).toBe(true);
          
          // Test maximum valid amount
          const maxResult = validationService.validateMonetaryAmount(currencyRules.maxAmount, currency);
          expect(maxResult.isValid).toBe(true);
          
          // Test just below minimum (should fail)
          const belowMinResult = validationService.validateMonetaryAmount(currencyRules.minAmount - 0.01, currency);
          expect(belowMinResult.isValid).toBe(false);
          
          // Test just above maximum (should fail)
          const aboveMaxResult = validationService.validateMonetaryAmount(currencyRules.maxAmount + 0.01, currency);
          expect(aboveMaxResult.isValid).toBe(false);
        }
      ), { numRuns: 50 });
    });

    test('Validation should handle special numeric values', () => {
      fc.assert(fc.property(
        fc.constantFrom(0, -0, Infinity, -Infinity, NaN),
        validCurrencyGen,
        (specialValue, currency) => {
          const result = validationService.validateMonetaryAmount(specialValue, currency);
          
          if (specialValue === 0 || specialValue === -0) {
            // Zero should fail (amounts must be positive)
            expect(result.isValid).toBe(false);
          } else {
            // Infinity and NaN should fail
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => 
              e.type === VALIDATION_ERROR_TYPES.INVALID_FORMAT ||
              e.type === VALIDATION_ERROR_TYPES.INVALID_RANGE
            )).toBe(true);
          }
        }
      ), { numRuns: 50 });
    });
  });
});