import { auditLogsService } from './firestore';
import { createAuditLog } from '../models';

// Audit event types
export const AUDIT_EVENT_TYPES = {
  // Revenue Rules
  REVENUE_RULE_CREATED: 'revenue_rule_created',
  REVENUE_RULE_UPDATED: 'revenue_rule_updated',
  REVENUE_RULE_DELETED: 'revenue_rule_deleted',
  REVENUE_RULE_ACTIVATED: 'revenue_rule_activated',
  REVENUE_RULE_DEACTIVATED: 'revenue_rule_deactivated',
  
  // Ledger Entries
  LEDGER_ENTRY_CREATED: 'ledger_entry_created',
  LEDGER_ENTRY_UPDATED: 'ledger_entry_updated',
  LEDGER_ENTRY_STATUS_CHANGED: 'ledger_entry_status_changed',
  MANUAL_LEDGER_ENTRY_CREATED: 'manual_ledger_entry_created',
  
  // Settlements
  SETTLEMENT_CREATED: 'settlement_created',
  SETTLEMENT_APPROVED: 'settlement_approved',
  SETTLEMENT_REJECTED: 'settlement_rejected',
  SETTLEMENT_PROOF_UPLOADED: 'settlement_proof_uploaded',
  
  // Revenue Processing
  REVENUE_PROCESSING_STARTED: 'revenue_processing_started',
  REVENUE_PROCESSING_COMPLETED: 'revenue_processing_completed',
  REVENUE_PROCESSING_FAILED: 'revenue_processing_failed',
  
  // Financial Operations
  BALANCE_CALCULATION_PERFORMED: 'balance_calculation_performed',
  FINANCIAL_REPORT_GENERATED: 'financial_report_generated',
  FINANCIAL_DATA_EXPORTED: 'financial_data_exported',
  
  // Security Events
  UNAUTHORIZED_ACCESS_ATTEMPT: 'unauthorized_access_attempt',
  PERMISSION_DENIED: 'permission_denied',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  
  // System Events
  DATA_INTEGRITY_CHECK: 'data_integrity_check',
  BACKUP_CREATED: 'backup_created',
  SYSTEM_MAINTENANCE: 'system_maintenance'
};

// Audit log levels
export const AUDIT_LOG_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Risk levels for compliance
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Comprehensive audit logging service for financial operations
 */
export class AuditService {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.auditBuffer = [];
    this.bufferSize = 100;
    this.flushInterval = 30000; // 30 seconds
    
    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Generate unique session ID for tracking related operations
   */
  generateSessionId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create audit log entry
   */
  async logEvent(eventType, details, options = {}) {
    const {
      userId = null,
      level = AUDIT_LOG_LEVELS.INFO,
      riskLevel = RISK_LEVELS.LOW,
      resourceType = null,
      resourceId = null,
      ipAddress = null,
      userAgent = null,
      metadata = {},
      immediate = false
    } = options;

    const auditEntry = {
      eventType,
      level,
      riskLevel,
      userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      details: typeof details === 'string' ? details : JSON.stringify(details),
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        environment: import.meta.env.MODE || 'development',
        version: import.meta.env.VITE_APP_VERSION || '1.0.0'
      }
    };

    if (immediate || level === AUDIT_LOG_LEVELS.CRITICAL) {
      // Log immediately for critical events
      await this.persistAuditEntry(auditEntry);
    } else {
      // Buffer for batch processing
      this.auditBuffer.push(auditEntry);
      
      if (this.auditBuffer.length >= this.bufferSize) {
        await this.flushBuffer();
      }
    }

    // Also log to console for development
    if (import.meta.env.MODE === 'development') {
      console.log(`[AUDIT] ${level.toUpperCase()}: ${eventType}`, auditEntry);
    }

    return auditEntry;
  }

  /**
   * Log revenue rule operations
   */
  async logRevenueRuleOperation(operation, ruleData, userId, options = {}) {
    const eventType = `REVENUE_RULE_${operation.toUpperCase()}`;
    const details = {
      operation,
      ruleId: ruleData.id,
      ruleName: ruleData.ruleName,
      adminPercent: ruleData.adminPercent,
      teamPercent: ruleData.teamPercent,
      vendorPercent: ruleData.vendorPercent,
      isDefault: ruleData.isDefault,
      isActive: ruleData.isActive
    };

    return await this.logEvent(eventType, details, {
      ...options,
      userId,
      resourceType: 'revenue_rule',
      resourceId: ruleData.id,
      riskLevel: operation === 'DELETED' ? RISK_LEVELS.HIGH : RISK_LEVELS.MEDIUM
    });
  }

  /**
   * Log ledger entry operations
   */
  async logLedgerEntryOperation(operation, entryData, userId, options = {}) {
    const eventType = `LEDGER_ENTRY_${operation.toUpperCase()}`;
    const details = {
      operation,
      entryId: entryData.id,
      party: entryData.party,
      type: entryData.type,
      amount: entryData.amount,
      currency: entryData.currency,
      status: entryData.status,
      paymentId: entryData.paymentId,
      projectId: entryData.projectId
    };

    return await this.logEvent(eventType, details, {
      ...options,
      userId,
      resourceType: 'ledger_entry',
      resourceId: entryData.id,
      riskLevel: entryData.type === 'manual' ? RISK_LEVELS.HIGH : RISK_LEVELS.MEDIUM
    });
  }

  /**
   * Log settlement operations
   */
  async logSettlementOperation(operation, settlementData, userId, options = {}) {
    const eventType = `SETTLEMENT_${operation.toUpperCase()}`;
    const details = {
      operation,
      settlementId: settlementData.id,
      party: settlementData.party,
      totalAmount: settlementData.totalAmount,
      currency: settlementData.currency,
      entryCount: settlementData.ledgerEntryIds?.length || 0,
      hasProof: settlementData.proofUrls?.length > 0
    };

    return await this.logEvent(eventType, details, {
      ...options,
      userId,
      resourceType: 'settlement',
      resourceId: settlementData.id,
      riskLevel: RISK_LEVELS.HIGH // Settlements are high-risk operations
    });
  }

  /**
   * Log revenue processing operations
   */
  async logRevenueProcessing(operation, paymentData, userId, options = {}) {
    const eventType = `REVENUE_PROCESSING_${operation.toUpperCase()}`;
    const details = {
      operation,
      paymentId: paymentData.id,
      projectId: paymentData.projectId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      revenueRuleId: paymentData.revenueRuleId,
      ledgerEntryIds: paymentData.ledgerEntryIds
    };

    return await this.logEvent(eventType, details, {
      ...options,
      userId,
      resourceType: 'payment',
      resourceId: paymentData.id,
      riskLevel: RISK_LEVELS.MEDIUM
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventType, details, userId, options = {}) {
    return await this.logEvent(eventType, details, {
      ...options,
      userId,
      level: AUDIT_LOG_LEVELS.WARNING,
      riskLevel: RISK_LEVELS.HIGH,
      immediate: true // Security events are logged immediately
    });
  }

  /**
   * Log unauthorized access attempts
   */
  async logUnauthorizedAccess(resource, action, userId, options = {}) {
    const details = {
      resource,
      action,
      attemptedBy: userId,
      timestamp: new Date().toISOString()
    };

    return await this.logSecurityEvent(
      AUDIT_EVENT_TYPES.UNAUTHORIZED_ACCESS_ATTEMPT,
      details,
      userId,
      {
        ...options,
        level: AUDIT_LOG_LEVELS.ERROR,
        riskLevel: RISK_LEVELS.CRITICAL
      }
    );
  }

  /**
   * Log data integrity checks
   */
  async logDataIntegrityCheck(checkType, results, userId, options = {}) {
    const details = {
      checkType,
      results,
      timestamp: new Date().toISOString(),
      passed: results.passed,
      issues: results.issues || []
    };

    return await this.logEvent(
      AUDIT_EVENT_TYPES.DATA_INTEGRITY_CHECK,
      details,
      {
        ...options,
        userId,
        level: results.passed ? AUDIT_LOG_LEVELS.INFO : AUDIT_LOG_LEVELS.WARNING,
        riskLevel: results.passed ? RISK_LEVELS.LOW : RISK_LEVELS.MEDIUM
      }
    );
  }

  /**
   * Persist audit entry to Firestore
   */
  async persistAuditEntry(auditEntry) {
    try {
      const auditLog = createAuditLog(auditEntry);
      await auditLogsService.create(auditLog);
    } catch (error) {
      console.error('Failed to persist audit entry:', error);
      // In production, this should trigger an alert
    }
  }

  /**
   * Flush buffered audit entries
   */
  async flushBuffer() {
    if (this.auditBuffer.length === 0) return;

    const entries = [...this.auditBuffer];
    this.auditBuffer = [];

    try {
      // Batch write to Firestore
      const promises = entries.map(entry => this.persistAuditEntry(entry));
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to flush audit buffer:', error);
      // Re-add failed entries to buffer
      this.auditBuffer.unshift(...entries);
    }
  }

  /**
   * Start periodic buffer flush
   */
  startPeriodicFlush() {
    setInterval(async () => {
      await this.flushBuffer();
    }, this.flushInterval);
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters = {}) {
    try {
      let queryOptions = {
        orderBy: [['timestamp', 'desc']]
      };

      const whereConditions = [];

      if (filters.userId) {
        whereConditions.push(['userId', '==', filters.userId]);
      }

      if (filters.eventType) {
        whereConditions.push(['eventType', '==', filters.eventType]);
      }

      if (filters.level) {
        whereConditions.push(['level', '==', filters.level]);
      }

      if (filters.riskLevel) {
        whereConditions.push(['riskLevel', '==', filters.riskLevel]);
      }

      if (filters.resourceType) {
        whereConditions.push(['resourceType', '==', filters.resourceType]);
      }

      if (filters.resourceId) {
        whereConditions.push(['resourceId', '==', filters.resourceId]);
      }

      if (whereConditions.length > 0) {
        queryOptions.where = whereConditions;
      }

      if (filters.limit) {
        queryOptions.limit = filters.limit;
      }

      let logs = await auditLogsService.getAll(queryOptions);

      // Apply date range filter (client-side)
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        logs = logs.filter(log => {
          const logDate = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
          return logDate >= start && logDate <= end;
        });
      }

      return logs;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(dateRange, options = {}) {
    try {
      const logs = await this.getAuditLogs({
        dateRange,
        ...options
      });

      const report = {
        period: dateRange,
        totalEvents: logs.length,
        eventsByType: {},
        eventsByLevel: {},
        eventsByRisk: {},
        securityEvents: [],
        highRiskEvents: [],
        failedOperations: [],
        userActivity: {},
        complianceScore: 0
      };

      logs.forEach(log => {
        // Count by type
        report.eventsByType[log.eventType] = (report.eventsByType[log.eventType] || 0) + 1;
        
        // Count by level
        report.eventsByLevel[log.level] = (report.eventsByLevel[log.level] || 0) + 1;
        
        // Count by risk
        report.eventsByRisk[log.riskLevel] = (report.eventsByRisk[log.riskLevel] || 0) + 1;
        
        // Collect security events
        if (log.eventType.includes('UNAUTHORIZED') || log.eventType.includes('SUSPICIOUS')) {
          report.securityEvents.push(log);
        }
        
        // Collect high-risk events
        if (log.riskLevel === RISK_LEVELS.HIGH || log.riskLevel === RISK_LEVELS.CRITICAL) {
          report.highRiskEvents.push(log);
        }
        
        // Collect failed operations
        if (log.level === AUDIT_LOG_LEVELS.ERROR || log.eventType.includes('FAILED')) {
          report.failedOperations.push(log);
        }
        
        // Track user activity
        if (log.userId) {
          report.userActivity[log.userId] = (report.userActivity[log.userId] || 0) + 1;
        }
      });

      // Calculate compliance score (simplified)
      const totalRiskEvents = report.highRiskEvents.length + report.securityEvents.length;
      const riskRatio = totalRiskEvents / Math.max(logs.length, 1);
      report.complianceScore = Math.max(0, Math.min(100, 100 - (riskRatio * 100)));

      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  async detectSuspiciousActivity(userId, timeWindow = 3600000) { // 1 hour default
    try {
      const startTime = new Date(Date.now() - timeWindow);
      const logs = await this.getAuditLogs({
        userId,
        dateRange: { start: startTime, end: new Date() }
      });

      const suspiciousPatterns = [];

      // Check for rapid successive operations
      const operationCounts = {};
      logs.forEach(log => {
        operationCounts[log.eventType] = (operationCounts[log.eventType] || 0) + 1;
      });

      Object.entries(operationCounts).forEach(([eventType, count]) => {
        if (count > 50) { // Threshold for suspicious activity
          suspiciousPatterns.push({
            type: 'rapid_operations',
            eventType,
            count,
            severity: count > 100 ? 'high' : 'medium'
          });
        }
      });

      // Check for failed access attempts
      const failedAttempts = logs.filter(log => 
        log.eventType === AUDIT_EVENT_TYPES.UNAUTHORIZED_ACCESS_ATTEMPT ||
        log.eventType === AUDIT_EVENT_TYPES.PERMISSION_DENIED
      );

      if (failedAttempts.length > 10) {
        suspiciousPatterns.push({
          type: 'multiple_failed_attempts',
          count: failedAttempts.length,
          severity: failedAttempts.length > 20 ? 'high' : 'medium'
        });
      }

      // Log suspicious activity if detected
      if (suspiciousPatterns.length > 0) {
        await this.logSecurityEvent(
          AUDIT_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
          { patterns: suspiciousPatterns, userId, timeWindow },
          userId,
          { riskLevel: RISK_LEVELS.CRITICAL }
        );
      }

      return suspiciousPatterns;
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      throw error;
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(filters = {}, format = 'json') {
    try {
      const logs = await this.getAuditLogs(filters);
      
      if (format === 'csv') {
        return this.convertToCSV(logs);
      }
      
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  convertToCSV(logs) {
    if (logs.length === 0) return '';

    const headers = [
      'timestamp', 'eventType', 'level', 'riskLevel', 'userId', 
      'resourceType', 'resourceId', 'details', 'ipAddress'
    ];

    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = headers.map(header => {
        const value = log[header] || '';
        // Escape commas and quotes in CSV
        return typeof value === 'string' && value.includes(',') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

// Export singleton instance
export const auditService = new AuditService();