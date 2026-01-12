import { PARTY_TYPES, LEDGER_ENTRY_TYPES, LEDGER_ENTRY_STATUSES } from '../models';
import { auditService, AUDIT_EVENT_TYPES } from './auditService';

// Validation error types
export const VALIDATION_ERROR_TYPES = {
  REQUIRED_FIELD: 'required_field',
  INVALID_TYPE: 'invalid_type',
  INVALID_FORMAT: 'invalid_format',
  INVALID_RANGE: 'invalid_range',
  CURRENCY_MISMATCH: 'currency_mismatch',
  BUSINESS_RULE_VIOLATION: 'business_rule_violation',
  DATA_INTEGRITY_VIOLATION: 'data_integrity_violation'
};

// Supported currencies with validation rules
export const SUPPORTED_CURRENCIES = {
  INR: { symbol: '₹', decimals: 2, minAmount: 1, maxAmount: 9999999999.99 },
  USD: { symbol: '$', decimals: 2, minAmount: 0.01, maxAmount: 999999999.99 },
  EUR: { symbol: '€', decimals: 2, minAmount: 0.01, maxAmount: 999999999.99 },
  GBP: { symbol: '£', decimals: 2, minAmount: 0.01, maxAmount: 999999999.99 },
  CAD: { symbol: 'C$', decimals: 2, minAmount: 0.01, maxAmount: 999999999.99 },
  AUD: { symbol: 'A$', decimals: 2, minAmount: 0.01, maxAmount: 999999999.99 }
};

/**
 * Comprehensive validation service for financial data
 */
export class ValidationService {
  constructor() {
    this.validationRules = new Map();
    this.setupDefaultRules();
  }

  /**
   * Setup default validation rules
   */
  setupDefaultRules() {
    // Monetary amount validation
    this.addRule('monetary_amount', (value, context = {}) => {
      const errors = [];

      if (value === null || value === undefined) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.REQUIRED_FIELD,
          message: 'Amount is required',
          field: context.field || 'amount'
        });
        return { isValid: false, errors };
      }

      if (typeof value !== 'number') {
        errors.push({
          type: VALIDATION_ERROR_TYPES.INVALID_TYPE,
          message: 'Amount must be a number',
          field: context.field || 'amount',
          value
        });
        return { isValid: false, errors };
      }

      if (isNaN(value) || !isFinite(value)) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.INVALID_FORMAT,
          message: 'Amount must be a valid number',
          field: context.field || 'amount',
          value
        });
        return { isValid: false, errors };
      }

      if (value < 0) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.INVALID_RANGE,
          message: 'Amount must be positive',
          field: context.field || 'amount',
          value
        });
      }

      // Check currency-specific limits
      if (context.currency && SUPPORTED_CURRENCIES[context.currency]) {
        const currencyRules = SUPPORTED_CURRENCIES[context.currency];

        if (value < currencyRules.minAmount) {
          errors.push({
            type: VALIDATION_ERROR_TYPES.INVALID_RANGE,
            message: `Amount must be at least ${currencyRules.minAmount} ${context.currency}`,
            field: context.field || 'amount',
            value
          });
        }

        if (value > currencyRules.maxAmount) {
          errors.push({
            type: VALIDATION_ERROR_TYPES.INVALID_RANGE,
            message: `Amount cannot exceed ${currencyRules.maxAmount} ${context.currency}`,
            field: context.field || 'amount',
            value
          });
        }

        // Check decimal places
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > currencyRules.decimals) {
          errors.push({
            type: VALIDATION_ERROR_TYPES.INVALID_FORMAT,
            message: `Amount cannot have more than ${currencyRules.decimals} decimal places for ${context.currency}`,
            field: context.field || 'amount',
            value
          });
        }
      }

      return { isValid: errors.length === 0, errors };
    });

    // Currency validation
    this.addRule('currency', (value, context = {}) => {
      const errors = [];

      if (!value) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.REQUIRED_FIELD,
          message: 'Currency is required',
          field: context.field || 'currency'
        });
        return { isValid: false, errors };
      }

      if (typeof value !== 'string') {
        errors.push({
          type: VALIDATION_ERROR_TYPES.INVALID_TYPE,
          message: 'Currency must be a string',
          field: context.field || 'currency',
          value
        });
        return { isValid: false, errors };
      }

      if (!SUPPORTED_CURRENCIES[value.toUpperCase()]) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.INVALID_FORMAT,
          message: `Unsupported currency: ${value}. Supported currencies: ${Object.keys(SUPPORTED_CURRENCIES).join(', ')}`,
          field: context.field || 'currency',
          value
        });
      }

      return { isValid: errors.length === 0, errors };
    });

    // Percentage validation
    this.addRule('percentage', (value, context = {}) => {
      const errors = [];

      if (value === null || value === undefined) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.REQUIRED_FIELD,
          message: 'Percentage is required',
          field: context.field || 'percentage'
        });
        return { isValid: false, errors };
      }

      if (typeof value !== 'number') {
        errors.push({
          type: VALIDATION_ERROR_TYPES.INVALID_TYPE,
          message: 'Percentage must be a number',
          field: context.field || 'percentage',
          value
        });
        return { isValid: false, errors };
      }

      if (isNaN(value) || !isFinite(value)) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.INVALID_FORMAT,
          message: 'Percentage must be a valid number',
          field: context.field || 'percentage',
          value
        });
        return { isValid: false, errors };
      }

      if (value < 0 || value > 100) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.INVALID_RANGE,
          message: 'Percentage must be between 0 and 100',
          field: context.field || 'percentage',
          value
        });
      }

      return { isValid: errors.length === 0, errors };
    });

    // Party validation
    this.addRule('party', (value, context = {}) => {
      const errors = [];

      if (!value) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.REQUIRED_FIELD,
          message: 'Party is required',
          field: context.field || 'party'
        });
        return { isValid: false, errors };
      }

      if (!Object.values(PARTY_TYPES).includes(value)) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.INVALID_FORMAT,
          message: `Invalid party type: ${value}. Valid types: ${Object.values(PARTY_TYPES).join(', ')}`,
          field: context.field || 'party',
          value
        });
      }

      return { isValid: errors.length === 0, errors };
    });
  }

  /**
   * Add custom validation rule
   */
  addRule(name, validator) {
    this.validationRules.set(name, validator);
  }

  /**
   * Validate a single field
   */
  validateField(ruleName, value, context = {}) {
    const rule = this.validationRules.get(ruleName);
    if (!rule) {
      throw new Error(`Validation rule '${ruleName}' not found`);
    }

    return rule(value, context);
  }

  /**
   * Validate monetary amount with proper formatting
   */
  validateMonetaryAmount(amount, currency, field = 'amount') {
    const amountValidation = this.validateField('monetary_amount', amount, { currency, field });
    const currencyValidation = this.validateField('currency', currency, { field: 'currency' });

    const errors = [...amountValidation.errors, ...currencyValidation.errors];
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate revenue rule percentages
   */
  validateRevenueRulePercentages(adminPercent, teamPercent, vendorPercent = 0) {
    const errors = [];

    // Validate individual percentages
    const adminValidation = this.validateField('percentage', adminPercent, { field: 'adminPercent' });
    const teamValidation = this.validateField('percentage', teamPercent, { field: 'teamPercent' });
    const vendorValidation = this.validateField('percentage', vendorPercent, { field: 'vendorPercent' });

    errors.push(...adminValidation.errors, ...teamValidation.errors, ...vendorValidation.errors);

    // Check if percentages sum to 100
    if (adminValidation.isValid && teamValidation.isValid && vendorValidation.isValid) {
      const total = adminPercent + teamPercent + vendorPercent;
      if (Math.abs(total - 100) > 0.01) { // Allow for small floating point errors
        errors.push({
          type: VALIDATION_ERROR_TYPES.BUSINESS_RULE_VIOLATION,
          message: `Percentages must sum to 100%. Current total: ${total}%`,
          field: 'percentages',
          value: { adminPercent, teamPercent, vendorPercent, total }
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate ledger entry data
   */
  validateLedgerEntry(entryData) {
    const errors = [];

    // Required fields
    if (!entryData.projectId) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.REQUIRED_FIELD,
        message: 'Project ID is required',
        field: 'projectId'
      });
    }

    if (!entryData.type || !Object.values(LEDGER_ENTRY_TYPES).includes(entryData.type)) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.INVALID_FORMAT,
        message: `Invalid entry type. Valid types: ${Object.values(LEDGER_ENTRY_TYPES).join(', ')}`,
        field: 'type',
        value: entryData.type
      });
    }

    // Validate party
    const partyValidation = this.validateField('party', entryData.party);
    errors.push(...partyValidation.errors);

    // Validate amount and currency
    const monetaryValidation = this.validateMonetaryAmount(entryData.amount, entryData.currency);
    errors.push(...monetaryValidation.errors);

    // Validate date
    if (!entryData.date) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.REQUIRED_FIELD,
        message: 'Date is required',
        field: 'date'
      });
    } else if (!(entryData.date instanceof Date) && isNaN(new Date(entryData.date))) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.INVALID_FORMAT,
        message: 'Invalid date format',
        field: 'date',
        value: entryData.date
      });
    }

    // Validate status if provided
    if (entryData.status && !Object.values(LEDGER_ENTRY_STATUSES).includes(entryData.status)) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.INVALID_FORMAT,
        message: `Invalid status. Valid statuses: ${Object.values(LEDGER_ENTRY_STATUSES).join(', ')}`,
        field: 'status',
        value: entryData.status
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate settlement data
   */
  validateSettlement(settlementData) {
    const errors = [];

    // Validate party
    const partyValidation = this.validateField('party', settlementData.party);
    errors.push(...partyValidation.errors);

    // Validate ledger entry IDs
    if (!settlementData.ledgerEntryIds || !Array.isArray(settlementData.ledgerEntryIds) || settlementData.ledgerEntryIds.length === 0) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.REQUIRED_FIELD,
        message: 'At least one ledger entry ID is required',
        field: 'ledgerEntryIds'
      });
    }

    // Validate currency
    const currencyValidation = this.validateField('currency', settlementData.currency);
    errors.push(...currencyValidation.errors);

    // Validate settlement date
    if (!settlementData.settlementDate) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.REQUIRED_FIELD,
        message: 'Settlement date is required',
        field: 'settlementDate'
      });
    } else if (!(settlementData.settlementDate instanceof Date) && isNaN(new Date(settlementData.settlementDate))) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.INVALID_FORMAT,
        message: 'Invalid settlement date format',
        field: 'settlementDate',
        value: settlementData.settlementDate
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check currency consistency across related data
   */
  validateCurrencyConsistency(items, currencyField = 'currency') {
    const errors = [];

    if (!Array.isArray(items) || items.length === 0) {
      return { isValid: true, errors };
    }

    const currencies = items.map(item => item[currencyField]).filter(Boolean);
    const uniqueCurrencies = [...new Set(currencies)];

    if (uniqueCurrencies.length > 1) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.CURRENCY_MISMATCH,
        message: `Currency mismatch detected. Found currencies: ${uniqueCurrencies.join(', ')}`,
        field: currencyField,
        value: uniqueCurrencies
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate data integrity for financial calculations
   */
  async validateDataIntegrity(data, userId = null) {
    const results = {
      passed: true,
      issues: [],
      checks: []
    };

    try {
      // Check 1: Revenue split calculations
      if (data.revenueRules && data.ledgerEntries) {
        const splitCheck = await this.validateRevenueSplitIntegrity(data.revenueRules, data.ledgerEntries);
        results.checks.push(splitCheck);
        if (!splitCheck.passed) {
          results.passed = false;
          results.issues.push(...splitCheck.issues);
        }
      }

      // Check 2: Balance calculations
      if (data.ledgerEntries) {
        const balanceCheck = await this.validateBalanceIntegrity(data.ledgerEntries);
        results.checks.push(balanceCheck);
        if (!balanceCheck.passed) {
          results.passed = false;
          results.issues.push(...balanceCheck.issues);
        }
      }

      // Check 3: Settlement consistency
      if (data.settlements && data.ledgerEntries) {
        const settlementCheck = await this.validateSettlementIntegrity(data.settlements, data.ledgerEntries);
        results.checks.push(settlementCheck);
        if (!settlementCheck.passed) {
          results.passed = false;
          results.issues.push(...settlementCheck.issues);
        }
      }

      // Log the integrity check
      await auditService.logDataIntegrityCheck('comprehensive_check', results, userId);

    } catch (error) {
      results.passed = false;
      results.issues.push({
        type: 'integrity_check_error',
        message: `Data integrity check failed: ${error.message}`,
        severity: 'high'
      });
    }

    return results;
  }

  /**
   * Validate revenue split calculation integrity
   */
  async validateRevenueSplitIntegrity(revenueRules, ledgerEntries) {
    const check = {
      name: 'revenue_split_integrity',
      passed: true,
      issues: []
    };

    // Group ledger entries by payment
    const entriesByPayment = ledgerEntries.reduce((acc, entry) => {
      if (entry.paymentId) {
        if (!acc[entry.paymentId]) acc[entry.paymentId] = [];
        acc[entry.paymentId].push(entry);
      }
      return acc;
    }, {});

    // Check each payment's split
    for (const [paymentId, entries] of Object.entries(entriesByPayment)) {
      const totalAmount = entries.reduce((sum, entry) => {
        return sum + (entry.type === 'credit' ? entry.amount : -entry.amount);
      }, 0);

      // Check if total is close to zero (splits should balance)
      if (Math.abs(totalAmount) > 0.01) {
        check.passed = false;
        check.issues.push({
          type: 'split_imbalance',
          message: `Payment ${paymentId} has unbalanced splits. Total: ${totalAmount}`,
          paymentId,
          totalAmount,
          severity: 'high'
        });
      }

      // Check currency consistency
      const currencies = [...new Set(entries.map(e => e.currency))];
      if (currencies.length > 1) {
        check.passed = false;
        check.issues.push({
          type: 'currency_inconsistency',
          message: `Payment ${paymentId} has mixed currencies: ${currencies.join(', ')}`,
          paymentId,
          currencies,
          severity: 'medium'
        });
      }
    }

    return check;
  }

  /**
   * Validate balance calculation integrity
   */
  async validateBalanceIntegrity(ledgerEntries) {
    const check = {
      name: 'balance_integrity',
      passed: true,
      issues: []
    };

    // Group by party and currency
    const balancesByParty = {};

    ledgerEntries.forEach(entry => {
      const key = `${entry.party}_${entry.currency}`;
      if (!balancesByParty[key]) {
        balancesByParty[key] = { credits: 0, debits: 0, party: entry.party, currency: entry.currency };
      }

      if (entry.type === 'credit') {
        balancesByParty[key].credits += entry.amount;
      } else {
        balancesByParty[key].debits += entry.amount;
      }
    });

    // Check for negative balances (might indicate data issues)
    Object.values(balancesByParty).forEach(balance => {
      const netBalance = balance.credits - balance.debits;
      if (netBalance < -0.01) { // Allow small floating point errors
        check.issues.push({
          type: 'negative_balance',
          message: `${balance.party} has negative balance in ${balance.currency}: ${netBalance}`,
          party: balance.party,
          currency: balance.currency,
          balance: netBalance,
          severity: 'medium'
        });
      }
    });

    return check;
  }

  /**
   * Validate settlement integrity
   */
  async validateSettlementIntegrity(settlements, ledgerEntries) {
    const check = {
      name: 'settlement_integrity',
      passed: true,
      issues: []
    };

    const entryMap = new Map(ledgerEntries.map(entry => [entry.id, entry]));

    settlements.forEach(settlement => {
      let calculatedTotal = 0;
      const currencies = new Set();

      settlement.ledgerEntryIds.forEach(entryId => {
        const entry = entryMap.get(entryId);
        if (!entry) {
          check.passed = false;
          check.issues.push({
            type: 'missing_ledger_entry',
            message: `Settlement ${settlement.id} references non-existent ledger entry ${entryId}`,
            settlementId: settlement.id,
            entryId,
            severity: 'high'
          });
          return;
        }

        if (entry.party !== settlement.party) {
          check.passed = false;
          check.issues.push({
            type: 'party_mismatch',
            message: `Settlement ${settlement.id} includes entry for different party`,
            settlementId: settlement.id,
            entryId,
            settlementParty: settlement.party,
            entryParty: entry.party,
            severity: 'high'
          });
        }

        currencies.add(entry.currency);
        calculatedTotal += entry.type === 'credit' ? entry.amount : -entry.amount;
      });

      // Check total amount
      if (Math.abs(calculatedTotal - settlement.totalAmount) > 0.01) {
        check.passed = false;
        check.issues.push({
          type: 'settlement_amount_mismatch',
          message: `Settlement ${settlement.id} total amount mismatch`,
          settlementId: settlement.id,
          expectedTotal: calculatedTotal,
          actualTotal: settlement.totalAmount,
          severity: 'high'
        });
      }

      // Check currency consistency
      if (currencies.size > 1) {
        check.passed = false;
        check.issues.push({
          type: 'settlement_currency_mismatch',
          message: `Settlement ${settlement.id} includes multiple currencies`,
          settlementId: settlement.id,
          currencies: Array.from(currencies),
          severity: 'medium'
        });
      }
    });

    return check;
  }

  /**
   * Format monetary amount according to currency rules
   */
  formatMonetaryAmount(amount, currency) {
    if (!SUPPORTED_CURRENCIES[currency]) {
      return amount.toString();
    }

    const currencyRules = SUPPORTED_CURRENCIES[currency];
    return amount.toFixed(currencyRules.decimals);
  }

  /**
   * Parse and validate monetary amount from string
   */
  parseMonetaryAmount(amountString, currency) {
    if (typeof amountString === 'number') {
      return this.validateMonetaryAmount(amountString, currency);
    }

    if (typeof amountString !== 'string') {
      return {
        isValid: false,
        errors: [{
          type: VALIDATION_ERROR_TYPES.INVALID_TYPE,
          message: 'Amount must be a number or string',
          value: amountString
        }]
      };
    }

    // Remove currency symbols and whitespace
    const cleanAmount = amountString.replace(/[$€£₹,\s]/g, '');
    const parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount)) {
      return {
        isValid: false,
        errors: [{
          type: VALIDATION_ERROR_TYPES.INVALID_FORMAT,
          message: 'Invalid amount format',
          value: amountString
        }]
      };
    }

    return this.validateMonetaryAmount(parsedAmount, currency);
  }
}

// Export singleton instance
export const validationService = new ValidationService();