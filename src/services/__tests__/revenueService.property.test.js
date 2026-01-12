import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { revenueService } from '../revenueService';

// Mock the firestore service
vi.mock('../firestore', () => ({
  revenueRulesService: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    subscribe: vi.fn()
  }
}));

// Mock the notification service
vi.mock('../notificationService', () => ({
  notificationService: {
    notifyRevenueRuleCreated: vi.fn(),
    notifyRevenueRuleModified: vi.fn()
  }
}));

describe('RevenueService Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 1: Revenue Rule Validation', () => {
    /**
     * Feature: revenue-auto-split-ledger, Property 1: Revenue Rule Validation
     * For any set of percentage values entered for a revenue rule, 
     * the system should validate that the total equals exactly 100% before allowing the rule to be saved.
     * Validates: Requirements 1.3
     */
    it('should validate that percentages always total exactly 100% for valid rules', () => {
      fc.assert(
        fc.property(
          fc.record({
            ruleName: fc.string({ minLength: 3, maxLength: 50 }).filter(name => {
              const trimmed = name.trim();
              return trimmed.length >= 3 && /\S/.test(trimmed) && trimmed.replace(/\s+/g, '').length >= 3;
            }),
            adminPercent: fc.float({ min: 0, max: 100, noNaN: true }),
            teamPercent: fc.float({ min: 0, max: 100, noNaN: true }),
            vendorPercent: fc.float({ min: 0, max: 100, noNaN: true })
          }).filter(rule => {
            // Only test rules where percentages sum to exactly 100
            const total = rule.adminPercent + rule.teamPercent + rule.vendorPercent;
            return Math.abs(total - 100) < 0.01; // Allow for floating point precision
          }),
          (rule) => {
            const result = revenueService.validateRevenueRule(rule);
            
            // For rules that sum to 100%, validation should pass
            expect(result.isValid).toBe(true);
            expect(result.errors).not.toContain('Total percentages must equal 100%');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject any rule where percentages do not total exactly 100%', () => {
      fc.assert(
        fc.property(
          fc.record({
            ruleName: fc.string({ minLength: 3, maxLength: 50 }),
            adminPercent: fc.float({ min: 0, max: 100, noNaN: true }),
            teamPercent: fc.float({ min: 0, max: 100, noNaN: true }),
            vendorPercent: fc.float({ min: 0, max: 100, noNaN: true })
          }).filter(rule => {
            // Only test rules where percentages do NOT sum to 100
            const total = rule.adminPercent + rule.teamPercent + rule.vendorPercent;
            return Math.abs(total - 100) > 0.01; // Exclude rules that sum to 100
          }),
          (rule) => {
            const result = revenueService.validateRevenueRule(rule);
            
            // For rules that don't sum to 100%, validation should fail
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Total percentages must equal 100%');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject rules with invalid percentage ranges', () => {
      fc.assert(
        fc.property(
          fc.record({
            ruleName: fc.string({ minLength: 3, maxLength: 50 }),
            adminPercent: fc.oneof(
              fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01) }), // Negative values
              fc.float({ min: Math.fround(100.01), max: Math.fround(1000) })  // Values over 100
            ),
            teamPercent: fc.float({ min: 0, max: 100, noNaN: true }),
            vendorPercent: fc.float({ min: 0, max: 100, noNaN: true })
          }),
          (rule) => {
            const result = revenueService.validateRevenueRule(rule);
            
            // Rules with invalid percentage ranges should always fail
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => 
              error.includes('Admin percentage must be a number between 0 and 100')
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject rules with invalid rule names', () => {
      fc.assert(
        fc.property(
          fc.record({
            ruleName: fc.oneof(
              fc.constant(''), // Empty string
              fc.string({ maxLength: 2 }), // Too short
              fc.constant(null),
              fc.constant(undefined)
            ),
            adminPercent: fc.constant(50),
            teamPercent: fc.constant(30),
            vendorPercent: fc.constant(20)
          }),
          (rule) => {
            const result = revenueService.validateRevenueRule(rule);
            
            // Rules with invalid names should always fail
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => 
              error.includes('Rule name is required') || 
              error.includes('Rule name must be at least 3 characters long')
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate boolean fields correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            ruleName: fc.string({ minLength: 3, maxLength: 50 }),
            adminPercent: fc.constant(50),
            teamPercent: fc.constant(30),
            vendorPercent: fc.constant(20),
            isDefault: fc.oneof(
              fc.boolean(),
              fc.string(), // Invalid type
              fc.integer(),
              fc.constant(null)
            ),
            isActive: fc.boolean()
          }),
          (rule) => {
            const result = revenueService.validateRevenueRule(rule);
            
            if (typeof rule.isDefault === 'boolean' || rule.isDefault === undefined) {
              // Valid boolean or undefined should not cause validation error for isDefault
              expect(result.errors).not.toContain('isDefault must be a boolean value');
            } else {
              // Invalid type should cause validation error
              expect(result.isValid).toBe(false);
              expect(result.errors).toContain('isDefault must be a boolean value');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Revenue Rule Persistence', () => {
    /**
     * Feature: revenue-auto-split-ledger, Property 2: Revenue Rule Persistence
     * For any valid revenue rule, when saved, the system should store it in Firestore 
     * with a unique ID, timestamp, and all specified fields intact.
     * Validates: Requirements 1.4
     */
    it('should persist valid revenue rules with all required fields', async () => {
      // Mock successful creation
      const mockCreate = vi.fn().mockImplementation((data) => 
        Promise.resolve({ id: 'mock-id-123', ...data })
      );
      
      // Mock getAll to return empty array (no existing default rules)
      const mockGetAll = vi.fn().mockResolvedValue([]);
      
      const { revenueRulesService } = await import('../firestore');
      revenueRulesService.create = mockCreate;
      revenueRulesService.getAll = mockGetAll;

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ruleName: fc.string({ minLength: 3, maxLength: 50 }).filter(name => {
              const trimmed = name.trim();
              return trimmed.length >= 3 && /\S/.test(trimmed) && trimmed.replace(/\s+/g, '').length >= 3;
            }),
            adminPercent: fc.float({ min: 0, max: 100, noNaN: true }),
            teamPercent: fc.float({ min: 0, max: 100, noNaN: true }),
            vendorPercent: fc.float({ min: 0, max: 100, noNaN: true }),
            isDefault: fc.boolean(),
            isActive: fc.boolean()
          }).filter(rule => {
            // Only test valid rules (percentages sum to 100)
            const total = rule.adminPercent + rule.teamPercent + rule.vendorPercent;
            return Math.abs(total - 100) < 0.01;
          }),
          async (rule) => {
            const userId = 'test-user-123';
            
            try {
              const result = await revenueService.createRevenueRule(rule, userId);
              
              // Should have called create with proper data structure
              expect(mockCreate).toHaveBeenCalled();
              const createCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0];
              
              // Verify all original fields are preserved
              expect(createCall.ruleName).toBe(rule.ruleName);
              expect(createCall.adminPercent).toBe(rule.adminPercent);
              expect(createCall.teamPercent).toBe(rule.teamPercent);
              expect(createCall.vendorPercent).toBe(rule.vendorPercent);
              expect(createCall.isDefault).toBe(rule.isDefault);
              expect(createCall.isActive).toBe(rule.isActive);
              expect(createCall.createdBy).toBe(userId);
              
              // Should return result with ID
              expect(result).toBeDefined();
              expect(result.id).toBe('mock-id-123');
              
              // Clear mocks for next iteration
              mockCreate.mockClear();
              mockGetAll.mockClear();
            } catch (error) {
              // Should not throw for valid rules
              throw new Error(`Valid rule should not throw error: ${error.message}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject persistence of invalid revenue rules', async () => {
      const mockCreate = vi.fn();
      const mockGetAll = vi.fn().mockResolvedValue([]);
      
      const { revenueRulesService } = await import('../firestore');
      revenueRulesService.create = mockCreate;
      revenueRulesService.getAll = mockGetAll;

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ruleName: fc.oneof(
              fc.constant(''), // Invalid: empty
              fc.string({ maxLength: 2 }), // Invalid: too short
              fc.string({ minLength: 3, maxLength: 50 }) // Valid name
            ),
            adminPercent: fc.oneof(
              fc.float({ min: Math.fround(-100), max: Math.fround(-0.01) }), // Invalid: negative
              fc.float({ min: Math.fround(100.01), max: Math.fround(200) }), // Invalid: over 100
              fc.float({ min: 0, max: 100, noNaN: true }) // Valid range
            ),
            teamPercent: fc.float({ min: 0, max: 100, noNaN: true }),
            vendorPercent: fc.float({ min: 0, max: 100, noNaN: true })
          }).filter(rule => {
            // Only test rules that should be invalid
            const hasInvalidName = !rule.ruleName || rule.ruleName.trim().length < 3;
            const hasInvalidPercent = rule.adminPercent < 0 || rule.adminPercent > 100;
            const total = rule.adminPercent + rule.teamPercent + rule.vendorPercent;
            const hasInvalidTotal = Math.abs(total - 100) > 0.01;
            
            return hasInvalidName || hasInvalidPercent || hasInvalidTotal;
          }),
          async (rule) => {
            const userId = 'test-user-123';
            
            try {
              await revenueService.createRevenueRule(rule, userId);
              
              // Should not reach here for invalid rules
              throw new Error('Invalid rule should have been rejected');
            } catch (error) {
              // Should throw validation error for invalid rules
              expect(error.message).toContain('Validation failed');
              
              // Should not have called create for invalid rules
              expect(mockCreate).not.toHaveBeenCalled();
            }
            
            // Clear mocks for next iteration
            mockCreate.mockClear();
            mockGetAll.mockClear();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});