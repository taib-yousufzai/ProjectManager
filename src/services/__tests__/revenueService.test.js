import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('RevenueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRevenueRule', () => {
    it('should validate a correct revenue rule', () => {
      const rule = {
        ruleName: 'Test Rule',
        adminPercent: 50,
        teamPercent: 30,
        vendorPercent: 20
      };

      const result = revenueService.validateRevenueRule(rule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject rule with percentages not totaling 100', () => {
      const rule = {
        ruleName: 'Test Rule',
        adminPercent: 50,
        teamPercent: 30,
        vendorPercent: 15 // Total = 95%
      };

      const result = revenueService.validateRevenueRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Total percentages must equal 100%');
    });

    it('should reject rule with missing name', () => {
      const rule = {
        adminPercent: 50,
        teamPercent: 50,
        vendorPercent: 0
      };

      const result = revenueService.validateRevenueRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rule name is required');
    });

    it('should reject rule with negative percentages', () => {
      const rule = {
        ruleName: 'Test Rule',
        adminPercent: -10,
        teamPercent: 60,
        vendorPercent: 50
      };

      const result = revenueService.validateRevenueRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Admin percentage must be a number between 0 and 100');
    });

    it('should reject rule with percentages over 100', () => {
      const rule = {
        ruleName: 'Test Rule',
        adminPercent: 150,
        teamPercent: 30,
        vendorPercent: 20
      };

      const result = revenueService.validateRevenueRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Admin percentage must be a number between 0 and 100');
    });
  });

  describe('calculateRevenueSplit', () => {
    it('should calculate correct revenue split', () => {
      const rule = {
        ruleName: 'Test Rule',
        adminPercent: 50,
        teamPercent: 30,
        vendorPercent: 20
      };

      const result = revenueService.calculateRevenueSplit(1000, 'USD', rule);
      
      expect(result.admin.amount).toBe(500);
      expect(result.admin.currency).toBe('USD');
      expect(result.team.amount).toBe(300);
      expect(result.team.currency).toBe('USD');
      expect(result.vendor.amount).toBe(200);
      expect(result.vendor.currency).toBe('USD');
    });

    it('should handle rounding correctly', () => {
      const rule = {
        ruleName: 'Test Rule',
        adminPercent: 33.33,
        teamPercent: 33.33,
        vendorPercent: 33.34
      };

      const result = revenueService.calculateRevenueSplit(100, 'USD', rule);
      
      // Total should equal original amount
      const total = result.admin.amount + result.team.amount + result.vendor.amount;
      expect(total).toBe(100);
    });

    it('should not include vendor if percentage is 0', () => {
      const rule = {
        ruleName: 'Test Rule',
        adminPercent: 60,
        teamPercent: 40,
        vendorPercent: 0
      };

      const result = revenueService.calculateRevenueSplit(1000, 'USD', rule);
      
      expect(result.admin.amount).toBe(600);
      expect(result.team.amount).toBe(400);
      expect(result.vendor).toBeUndefined();
    });

    it('should throw error for invalid amount', () => {
      const rule = {
        ruleName: 'Test Rule',
        adminPercent: 50,
        teamPercent: 50,
        vendorPercent: 0
      };

      expect(() => {
        revenueService.calculateRevenueSplit(0, 'USD', rule);
      }).toThrow('Amount must be positive');

      expect(() => {
        revenueService.calculateRevenueSplit(-100, 'USD', rule);
      }).toThrow('Amount must be positive');
    });

    it('should throw error for invalid rule', () => {
      expect(() => {
        revenueService.calculateRevenueSplit(1000, 'USD', null);
      }).toThrow('Revenue rule is required');
    });
  });
});