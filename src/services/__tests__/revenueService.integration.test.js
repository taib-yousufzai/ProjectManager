import { describe, it, expect, vi } from 'vitest';
import { createRevenueRule } from '../../models';

// Mock Firebase to avoid initialization issues in tests
vi.mock('../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {}
}));

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

// Import after mocking
const { revenueService } = await import('../revenueService');

describe('RevenueService Integration', () => {
  it('should create a valid revenue rule model', () => {
    const ruleData = {
      ruleName: 'Default Split',
      adminPercent: 50,
      teamPercent: 30,
      vendorPercent: 20,
      isDefault: true,
      createdBy: 'user123'
    };

    const rule = createRevenueRule(ruleData);
    
    expect(rule.ruleName).toBe('Default Split');
    expect(rule.adminPercent).toBe(50);
    expect(rule.teamPercent).toBe(30);
    expect(rule.vendorPercent).toBe(20);
    expect(rule.isDefault).toBe(true);
    expect(rule.isActive).toBe(true); // Default value
    expect(rule.createdBy).toBe('user123');
  });

  it('should validate and calculate splits for a complete workflow', () => {
    const ruleData = {
      ruleName: 'Test Rule',
      adminPercent: 40,
      teamPercent: 35,
      vendorPercent: 25,
      isDefault: false,
      createdBy: 'user123'
    };

    // Validate the rule
    const validation = revenueService.validateRevenueRule(ruleData);
    expect(validation.isValid).toBe(true);

    // Calculate split
    const split = revenueService.calculateRevenueSplit(1000, 'USD', ruleData);
    
    expect(split.admin.amount).toBe(400);
    expect(split.team.amount).toBe(350);
    expect(split.vendor.amount).toBe(250);
    
    // Verify total equals original amount
    const total = split.admin.amount + split.team.amount + split.vendor.amount;
    expect(total).toBe(1000);
  });

  it('should handle edge case with no vendor percentage', () => {
    const ruleData = {
      ruleName: 'No Vendor Rule',
      adminPercent: 60,
      teamPercent: 40,
      vendorPercent: 0,
      createdBy: 'user123'
    };

    const validation = revenueService.validateRevenueRule(ruleData);
    expect(validation.isValid).toBe(true);

    const split = revenueService.calculateRevenueSplit(500, 'EUR', ruleData);
    
    expect(split.admin.amount).toBe(300);
    expect(split.admin.currency).toBe('EUR');
    expect(split.team.amount).toBe(200);
    expect(split.team.currency).toBe('EUR');
    expect(split.vendor).toBeUndefined();
  });
});