import { revenueRulesService } from './firestore';
import { createRevenueRule } from '../models';
import { notificationService } from './notificationService';
import { 
  hasPermission, 
  canManageRevenueRules,
  LEDGER_PERMISSIONS 
} from './permissionsService';
import { validationService } from './validationService';

// Revenue processing error types
export const REVENUE_ERROR_TYPES = {
  VALIDATION_ERROR: 'validation_error',
  CALCULATION_ERROR: 'calculation_error',
  RULE_NOT_FOUND: 'rule_not_found',
  CURRENCY_MISMATCH: 'currency_mismatch',
  FIRESTORE_ERROR: 'firestore_error',
  NOTIFICATION_ERROR: 'notification_error'
};

// Audit log levels
export const AUDIT_LOG_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

export class RevenueService {
  constructor() {
    this.auditLogs = [];
  }

  // Enhanced audit logging for revenue operations
  async logAuditEvent(level, operation, details, userId = null, error = null) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      details,
      userId,
      error: error ? {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      } : null
    };

    // Store in memory (in production, this should go to a persistent audit log)
    this.auditLogs.push(auditEntry);

    // Log to console with appropriate level
    const logMessage = `[REVENUE AUDIT] ${level.toUpperCase()}: ${operation} - ${JSON.stringify(details)}`;
    
    switch (level) {
      case AUDIT_LOG_LEVELS.ERROR:
      case AUDIT_LOG_LEVELS.CRITICAL:
        console.error(logMessage, error);
        break;
      case AUDIT_LOG_LEVELS.WARNING:
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }

    // For critical errors, notify administrators immediately
    if (level === AUDIT_LOG_LEVELS.CRITICAL) {
      try {
        await this.notifyAdministrators(
          'Critical Revenue System Error',
          `Operation: ${operation}\nDetails: ${JSON.stringify(details, null, 2)}\nError: ${error?.message || 'Unknown error'}`,
          'critical'
        );
      } catch (notificationError) {
        console.error('Failed to send critical error notification:', notificationError);
      }
    }

    return auditEntry;
  }

  // Enhanced error handling wrapper
  async executeWithErrorHandling(operation, operationName, userId = null) {
    try {
      await this.logAuditEvent(AUDIT_LOG_LEVELS.INFO, `${operationName}_started`, {
        userId,
        timestamp: new Date().toISOString()
      }, userId);

      const result = await operation();

      await this.logAuditEvent(AUDIT_LOG_LEVELS.INFO, `${operationName}_completed`, {
        userId,
        success: true,
        timestamp: new Date().toISOString()
      }, userId);

      return result;
    } catch (error) {
      const errorType = this.categorizeError(error);
      
      await this.logAuditEvent(
        errorType === REVENUE_ERROR_TYPES.VALIDATION_ERROR ? AUDIT_LOG_LEVELS.WARNING : AUDIT_LOG_LEVELS.ERROR,
        `${operationName}_failed`,
        {
          userId,
          errorType,
          errorMessage: error.message,
          timestamp: new Date().toISOString()
        },
        userId,
        error
      );

      // For non-validation errors, notify administrators
      if (errorType !== REVENUE_ERROR_TYPES.VALIDATION_ERROR) {
        try {
          await this.notifyAdministrators(
            `Revenue System Error: ${operationName}`,
            `Error Type: ${errorType}\nMessage: ${error.message}\nUser: ${userId || 'System'}\nTime: ${new Date().toISOString()}`,
            'high'
          );
        } catch (notificationError) {
          console.error('Failed to send error notification:', notificationError);
        }
      }

      throw error;
    }
  }

  // Categorize errors for better handling
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation failed') || message.includes('invalid')) {
      return REVENUE_ERROR_TYPES.VALIDATION_ERROR;
    }
    
    if (message.includes('calculation') || message.includes('split') || message.includes('percentage')) {
      return REVENUE_ERROR_TYPES.CALCULATION_ERROR;
    }
    
    if (message.includes('rule') && message.includes('not found')) {
      return REVENUE_ERROR_TYPES.RULE_NOT_FOUND;
    }
    
    if (message.includes('currency')) {
      return REVENUE_ERROR_TYPES.CURRENCY_MISMATCH;
    }
    
    if (message.includes('firestore') || message.includes('firebase')) {
      return REVENUE_ERROR_TYPES.FIRESTORE_ERROR;
    }
    
    if (message.includes('notification')) {
      return REVENUE_ERROR_TYPES.NOTIFICATION_ERROR;
    }
    
    return 'unknown_error';
  }

  // Notify administrators about revenue system issues
  async notifyAdministrators(title, message, priority = 'medium') {
    try {
      // TODO: In production, get actual admin user IDs from user management system
      const adminUserIds = import.meta.env.VITE_ADMIN_USER_IDS ? 
        import.meta.env.VITE_ADMIN_USER_IDS.split(',') : 
        []; // Fallback to empty array if no admins configured

      if (adminUserIds.length === 0) {
        console.warn('No administrator user IDs configured for revenue system notifications');
        return [];
      }

      return await notificationService.notifySystemAlert(
        adminUserIds,
        title,
        message,
        priority
      );
    } catch (error) {
      console.error('Failed to notify administrators:', error);
      throw new Error(`Administrator notification failed: ${error.message}`);
    }
  }

  // Get audit logs (for debugging and compliance)
  getAuditLogs(filters = {}) {
    let logs = [...this.auditLogs];

    if (filters.level) {
      logs = logs.filter(log => log.level === filters.level);
    }

    if (filters.operation) {
      logs = logs.filter(log => log.operation.includes(filters.operation));
    }

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  // Create a new revenue rule
  async createRevenueRule(ruleData, userId, user = null) {
    return await this.executeWithErrorHandling(async () => {
      // Check permissions
      if (user && !hasPermission(user, LEDGER_PERMISSIONS.CREATE_REVENUE_RULES)) {
        throw new Error('Insufficient permissions to create revenue rules');
      }

      // Validate the rule before creating
      const validation = this.validateRevenueRule(ruleData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // If this is set as default, unset other default rules
      if (ruleData.isDefault) {
        await this.unsetOtherDefaultRules();
      }

      const rule = createRevenueRule({
        ...ruleData,
        createdBy: userId
      });
      
      const newRule = await revenueRulesService.create(rule);
      
      // Send notification to administrators about new rule
      await notificationService.notifyRevenueRuleCreated(
        { ...newRule, id: newRule.id },
        userId
      );
      
      return newRule;
    }, 'create_revenue_rule', userId);
  }

  // Get all revenue rules
  async getRevenueRules(user = null) {
    try {
      // Check permissions
      if (user && !hasPermission(user, LEDGER_PERMISSIONS.VIEW_REVENUE_RULES)) {
        throw new Error('Insufficient permissions to view revenue rules');
      }

      return await revenueRulesService.getAll({
        orderBy: [['createdAt', 'desc']]
      });
    } catch (error) {
      console.error('Error fetching revenue rules:', error);
      throw error;
    }
  }

  // Get active revenue rules only
  async getActiveRevenueRules() {
    try {
      return await revenueRulesService.getAll({
        where: [['isActive', '==', true]],
        orderBy: [['createdAt', 'desc']]
      });
    } catch (error) {
      console.error('Error fetching active revenue rules:', error);
      throw error;
    }
  }

  // Get a single revenue rule by ID
  async getRevenueRule(ruleId) {
    try {
      return await revenueRulesService.getById(ruleId);
    } catch (error) {
      console.error('Error fetching revenue rule:', error);
      throw error;
    }
  }

  // Get the active revenue rule for a project (or default rule)
  async getActiveRevenueRule(projectId = null) {
    try {
      // For now, we'll use the default rule since project-specific rules aren't implemented yet
      // This can be extended later to support project-specific rules
      const defaultRule = await revenueRulesService.getAll({
        where: [
          ['isDefault', '==', true],
          ['isActive', '==', true]
        ],
        limit: 1
      });

      if (defaultRule.length > 0) {
        return defaultRule[0];
      }

      // If no default rule exists, get the first active rule
      const activeRules = await this.getActiveRevenueRules();
      if (activeRules.length > 0) {
        return activeRules[0];
      }

      throw new Error('No active revenue rule found');
    } catch (error) {
      console.error('Error fetching active revenue rule:', error);
      throw error;
    }
  }

  // Update a revenue rule
  async updateRevenueRule(ruleId, updates, userId, user = null) {
    return await this.executeWithErrorHandling(async () => {
      // Check permissions
      if (user && !hasPermission(user, LEDGER_PERMISSIONS.EDIT_REVENUE_RULES)) {
        throw new Error('Insufficient permissions to update revenue rules');
      }

      // Validate the updates
      const validation = this.validateRevenueRule(updates, true);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // If setting as default, unset other default rules
      if (updates.isDefault) {
        await this.unsetOtherDefaultRules(ruleId);
      }

      const updatedRule = await revenueRulesService.update(ruleId, updates);
      
      // Send notification about rule modification
      await notificationService.notifyRevenueRuleModified(
        { ...updatedRule, id: ruleId },
        userId
      );
      
      return updatedRule;
    }, 'update_revenue_rule', userId);
  }

  // Delete a revenue rule (soft delete by setting inactive)
  async deleteRevenueRule(ruleId, userId) {
    try {
      const rule = await this.getRevenueRule(ruleId);
      
      // Prevent deletion of default rule
      if (rule.isDefault) {
        throw new Error('Cannot delete the default revenue rule');
      }

      // Soft delete by setting inactive
      const updatedRule = await revenueRulesService.update(ruleId, { 
        isActive: false 
      });
      
      return updatedRule;
    } catch (error) {
      console.error('Error deleting revenue rule:', error);
      throw error;
    }
  }

  // Calculate revenue split based on rule
  calculateRevenueSplit(amount, currency, rule) {
    try {
      if (!amount || amount <= 0) {
        throw new Error('Amount must be positive');
      }

      if (!rule) {
        throw new Error('Revenue rule is required');
      }

      // Validate rule percentages
      const validation = this.validateRevenueRule(rule);
      if (!validation.isValid) {
        throw new Error(`Invalid revenue rule: ${validation.errors.join(', ')}`);
      }

      // Calculate splits with proper rounding to avoid floating point issues
      const adminAmount = Math.round((amount * rule.adminPercent / 100) * 100) / 100;
      const teamAmount = Math.round((amount * rule.teamPercent / 100) * 100) / 100;
      const vendorAmount = rule.vendorPercent > 0 
        ? Math.round((amount * rule.vendorPercent / 100) * 100) / 100 
        : 0;

      // Ensure total equals original amount (handle rounding differences)
      const calculatedTotal = adminAmount + teamAmount + vendorAmount;
      const difference = Math.round((amount - calculatedTotal) * 100) / 100;
      
      // Adjust admin amount for any rounding difference
      const adjustedAdminAmount = adminAmount + difference;

      const split = {
        admin: { amount: adjustedAdminAmount, currency },
        team: { amount: teamAmount, currency }
      };

      // Only include vendor if percentage > 0
      if (rule.vendorPercent > 0) {
        split.vendor = { amount: vendorAmount, currency };
      }

      // Log successful calculation for audit
      this.logAuditEvent(AUDIT_LOG_LEVELS.INFO, 'revenue_split_calculated', {
        originalAmount: amount,
        currency,
        ruleId: rule.id,
        ruleName: rule.ruleName,
        split: {
          admin: split.admin.amount,
          team: split.team.amount,
          vendor: split.vendor?.amount || 0
        },
        totalCalculated: adjustedAdminAmount + teamAmount + vendorAmount
      });

      return split;
    } catch (error) {
      // Log calculation error
      this.logAuditEvent(AUDIT_LOG_LEVELS.ERROR, 'revenue_split_calculation_failed', {
        amount,
        currency,
        ruleId: rule?.id,
        errorMessage: error.message
      }, null, error);
      
      console.error('Error calculating revenue split:', error);
      throw error;
    }
  }

  // Validate revenue rule data
  validateRevenueRule(ruleData, isUpdate = false) {
    const errors = [];

    // Rule name validation (required for new rules)
    if (!isUpdate && (!ruleData.ruleName || typeof ruleData.ruleName !== 'string' || ruleData.ruleName.trim().length === 0)) {
      errors.push('Rule name is required');
    }

    // Check for valid rule name (must have at least 3 non-whitespace characters)
    if (ruleData.ruleName !== undefined && ruleData.ruleName !== null && typeof ruleData.ruleName === 'string' && ruleData.ruleName.trim().length < 3) {
      errors.push('Rule name must be at least 3 characters long');
    }

    // Use validation service for percentage validation
    if (ruleData.adminPercent !== undefined && ruleData.teamPercent !== undefined) {
      const vendorPercent = ruleData.vendorPercent || 0;
      const percentageValidation = validationService.validateRevenueRulePercentages(
        ruleData.adminPercent,
        ruleData.teamPercent,
        vendorPercent
      );
      
      if (!percentageValidation.isValid) {
        errors.push(...percentageValidation.errors.map(error => error.message));
      }
    } else {
      // Individual percentage validation if not all are provided
      if (ruleData.adminPercent !== undefined) {
        const validation = validationService.validateField('percentage', ruleData.adminPercent, { field: 'adminPercent' });
        if (!validation.isValid) {
          errors.push(...validation.errors.map(error => error.message));
        }
      }

      if (ruleData.teamPercent !== undefined) {
        const validation = validationService.validateField('percentage', ruleData.teamPercent, { field: 'teamPercent' });
        if (!validation.isValid) {
          errors.push(...validation.errors.map(error => error.message));
        }
      }

      if (ruleData.vendorPercent !== undefined) {
        const validation = validationService.validateField('percentage', ruleData.vendorPercent, { field: 'vendorPercent' });
        if (!validation.isValid) {
          errors.push(...validation.errors.map(error => error.message));
        }
      }
    }

    // Boolean validation
    if (ruleData.isDefault !== undefined && typeof ruleData.isDefault !== 'boolean') {
      errors.push('isDefault must be a boolean value');
    }

    if (ruleData.isActive !== undefined && typeof ruleData.isActive !== 'boolean') {
      errors.push('isActive must be a boolean value');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper method to unset other default rules
  async unsetOtherDefaultRules(excludeRuleId = null) {
    try {
      const defaultRules = await revenueRulesService.getAll({
        where: [['isDefault', '==', true]]
      });

      const updatePromises = defaultRules
        .filter(rule => rule.id !== excludeRuleId)
        .map(rule => revenueRulesService.update(rule.id, { isDefault: false }));

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error unsetting other default rules:', error);
      throw error;
    }
  }

  // Search revenue rules
  async searchRevenueRules(searchTerm, filters = {}) {
    try {
      let rules = await this.getRevenueRules();

      // Apply active filter
      if (filters.activeOnly) {
        rules = rules.filter(rule => rule.isActive);
      }

      // Apply search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        rules = rules.filter(rule => 
          rule.ruleName.toLowerCase().includes(term)
        );
      }

      return rules;
    } catch (error) {
      console.error('Error searching revenue rules:', error);
      throw error;
    }
  }

  // Get revenue rule statistics
  async getRevenueRuleStats() {
    try {
      const rules = await this.getRevenueRules();
      
      const stats = {
        total: rules.length,
        active: rules.filter(rule => rule.isActive).length,
        inactive: rules.filter(rule => !rule.isActive).length,
        hasDefault: rules.some(rule => rule.isDefault && rule.isActive)
      };

      return stats;
    } catch (error) {
      console.error('Error calculating revenue rule stats:', error);
      throw error;
    }
  }

  // Subscribe to real-time revenue rule updates
  subscribeToRevenueRules(callback) {
    return revenueRulesService.subscribe(callback, {
      orderBy: [['createdAt', 'desc']]
    });
  }

  // Subscribe to active revenue rules only
  subscribeToActiveRevenueRules(callback) {
    return revenueRulesService.subscribe(callback, {
      where: [['isActive', '==', true]],
      orderBy: [['createdAt', 'desc']]
    });
  }
}

export const revenueService = new RevenueService();