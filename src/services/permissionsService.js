import { USER_ROLES, PARTY_TYPES } from '../models';

/**
 * Permission definitions for ledger features
 */
export const LEDGER_PERMISSIONS = {
  // Revenue Rules
  VIEW_REVENUE_RULES: 'view_revenue_rules',
  CREATE_REVENUE_RULES: 'create_revenue_rules',
  EDIT_REVENUE_RULES: 'edit_revenue_rules',
  DELETE_REVENUE_RULES: 'delete_revenue_rules',
  
  // Ledger Entries
  VIEW_LEDGER_ENTRIES: 'view_ledger_entries',
  VIEW_ALL_LEDGER_ENTRIES: 'view_all_ledger_entries',
  CREATE_MANUAL_ENTRIES: 'create_manual_entries',
  EDIT_LEDGER_ENTRIES: 'edit_ledger_entries',
  
  // Settlements
  VIEW_SETTLEMENTS: 'view_settlements',
  CREATE_SETTLEMENTS: 'create_settlements',
  APPROVE_SETTLEMENTS: 'approve_settlements',
  VIEW_ALL_SETTLEMENTS: 'view_all_settlements',
  
  // Financial Data
  VIEW_FINANCIAL_REPORTS: 'view_financial_reports',
  EXPORT_FINANCIAL_DATA: 'export_financial_data',
  VIEW_PARTY_BALANCES: 'view_party_balances',
  VIEW_ALL_PARTY_BALANCES: 'view_all_party_balances',
  
  // Administrative
  MANAGE_AUDIT_LOGS: 'manage_audit_logs',
  MANAGE_FINANCIAL_SETTINGS: 'manage_financial_settings'
};

/**
 * Role-based permission mappings
 */
const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    // Full access to all ledger features
    LEDGER_PERMISSIONS.VIEW_REVENUE_RULES,
    LEDGER_PERMISSIONS.CREATE_REVENUE_RULES,
    LEDGER_PERMISSIONS.EDIT_REVENUE_RULES,
    LEDGER_PERMISSIONS.DELETE_REVENUE_RULES,
    LEDGER_PERMISSIONS.VIEW_ALL_LEDGER_ENTRIES,
    LEDGER_PERMISSIONS.CREATE_MANUAL_ENTRIES,
    LEDGER_PERMISSIONS.EDIT_LEDGER_ENTRIES,
    LEDGER_PERMISSIONS.VIEW_ALL_SETTLEMENTS,
    LEDGER_PERMISSIONS.CREATE_SETTLEMENTS,
    LEDGER_PERMISSIONS.APPROVE_SETTLEMENTS,
    LEDGER_PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    LEDGER_PERMISSIONS.EXPORT_FINANCIAL_DATA,
    LEDGER_PERMISSIONS.VIEW_ALL_PARTY_BALANCES,
    LEDGER_PERMISSIONS.MANAGE_AUDIT_LOGS,
    LEDGER_PERMISSIONS.MANAGE_FINANCIAL_SETTINGS
  ],
  
  [USER_ROLES.MANAGER]: [
    // Limited administrative access
    LEDGER_PERMISSIONS.VIEW_REVENUE_RULES,
    LEDGER_PERMISSIONS.CREATE_REVENUE_RULES,
    LEDGER_PERMISSIONS.EDIT_REVENUE_RULES,
    LEDGER_PERMISSIONS.VIEW_ALL_LEDGER_ENTRIES,
    LEDGER_PERMISSIONS.CREATE_MANUAL_ENTRIES,
    LEDGER_PERMISSIONS.VIEW_ALL_SETTLEMENTS,
    LEDGER_PERMISSIONS.CREATE_SETTLEMENTS,
    LEDGER_PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    LEDGER_PERMISSIONS.EXPORT_FINANCIAL_DATA,
    LEDGER_PERMISSIONS.VIEW_ALL_PARTY_BALANCES
  ],
  
  [USER_ROLES.MEMBER]: [
    // Read-only access to own party data
    LEDGER_PERMISSIONS.VIEW_LEDGER_ENTRIES,
    LEDGER_PERMISSIONS.VIEW_SETTLEMENTS,
    LEDGER_PERMISSIONS.VIEW_PARTY_BALANCES
  ]
};

/**
 * Party-based access control
 * Determines which party data a user can access based on their role and party association
 */
export const getAccessibleParties = (user) => {
  if (!user) return [];
  
  // Admins can access all parties
  if (user.role === USER_ROLES.ADMIN) {
    return [PARTY_TYPES.ADMIN, PARTY_TYPES.TEAM, PARTY_TYPES.VENDOR];
  }
  
  // Managers can access admin and team data
  if (user.role === USER_ROLES.MANAGER) {
    return [PARTY_TYPES.ADMIN, PARTY_TYPES.TEAM];
  }
  
  // Members can only access their own party data
  // Determine user's party based on role or explicit party assignment
  const userParty = user.party || (user.role === USER_ROLES.ADMIN ? PARTY_TYPES.ADMIN : PARTY_TYPES.TEAM);
  return [userParty];
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = (user, permission) => {
  if (!user || !permission) return false;
  
  // Get role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  
  // Check if user has the permission through role
  if (rolePermissions.includes(permission)) {
    return true;
  }
  
  // Check if user has explicit permission
  if (user.permissions && user.permissions.includes(permission)) {
    return true;
  }
  
  return false;
};

/**
 * Check if user can access data for a specific party
 */
export const canAccessParty = (user, party) => {
  if (!user || !party) return false;
  
  const accessibleParties = getAccessibleParties(user);
  return accessibleParties.includes(party);
};

/**
 * Check if user can perform settlement operations
 */
export const canPerformSettlement = (user, party) => {
  if (!user || !party) return false;
  
  // Must have settlement permission
  if (!hasPermission(user, LEDGER_PERMISSIONS.CREATE_SETTLEMENTS)) {
    return false;
  }
  
  // Must have access to the party
  return canAccessParty(user, party);
};

/**
 * Check if user can view financial reports
 */
export const canViewFinancialReports = (user) => {
  return hasPermission(user, LEDGER_PERMISSIONS.VIEW_FINANCIAL_REPORTS);
};

/**
 * Check if user can manage revenue rules
 */
export const canManageRevenueRules = (user) => {
  return hasPermission(user, LEDGER_PERMISSIONS.CREATE_REVENUE_RULES) ||
         hasPermission(user, LEDGER_PERMISSIONS.EDIT_REVENUE_RULES);
};

/**
 * Check if user can export financial data
 */
export const canExportFinancialData = (user) => {
  return hasPermission(user, LEDGER_PERMISSIONS.EXPORT_FINANCIAL_DATA);
};

/**
 * Get filtered ledger entries based on user permissions
 */
export const filterLedgerEntriesByPermissions = (entries, user) => {
  if (!user || !entries) return [];
  
  // Admins and managers can see all entries
  if (hasPermission(user, LEDGER_PERMISSIONS.VIEW_ALL_LEDGER_ENTRIES)) {
    return entries;
  }
  
  // Regular users can only see entries for their accessible parties
  const accessibleParties = getAccessibleParties(user);
  return entries.filter(entry => accessibleParties.includes(entry.party));
};

/**
 * Get filtered settlements based on user permissions
 */
export const filterSettlementsByPermissions = (settlements, user) => {
  if (!user || !settlements) return [];
  
  // Admins and managers can see all settlements
  if (hasPermission(user, LEDGER_PERMISSIONS.VIEW_ALL_SETTLEMENTS)) {
    return settlements;
  }
  
  // Regular users can only see settlements for their accessible parties
  const accessibleParties = getAccessibleParties(user);
  return settlements.filter(settlement => accessibleParties.includes(settlement.party));
};

/**
 * Validate settlement operation permissions
 */
export const validateSettlementPermissions = (user, ledgerEntries) => {
  if (!user || !ledgerEntries || ledgerEntries.length === 0) {
    throw new Error('Invalid settlement request');
  }
  
  // Check if user can create settlements
  if (!hasPermission(user, LEDGER_PERMISSIONS.CREATE_SETTLEMENTS)) {
    throw new Error('Insufficient permissions to create settlements');
  }
  
  // Check if user can access all parties in the settlement
  const parties = [...new Set(ledgerEntries.map(entry => entry.party))];
  const accessibleParties = getAccessibleParties(user);
  
  const unauthorizedParties = parties.filter(party => !accessibleParties.includes(party));
  if (unauthorizedParties.length > 0) {
    throw new Error(`Insufficient permissions to settle for parties: ${unauthorizedParties.join(', ')}`);
  }
  
  return true;
};

/**
 * Permission service class
 */
export class PermissionsService {
  constructor() {
    this.permissions = LEDGER_PERMISSIONS;
    this.rolePermissions = ROLE_PERMISSIONS;
  }
  
  /**
   * Check multiple permissions at once
   */
  hasAnyPermission(user, permissions) {
    if (!Array.isArray(permissions)) return false;
    return permissions.some(permission => hasPermission(user, permission));
  }
  
  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(user, permissions) {
    if (!Array.isArray(permissions)) return false;
    return permissions.every(permission => hasPermission(user, permission));
  }
  
  /**
   * Get all permissions for a user
   */
  getUserPermissions(user) {
    if (!user) return [];
    
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    const explicitPermissions = user.permissions || [];
    
    return [...new Set([...rolePermissions, ...explicitPermissions])];
  }
  
  /**
   * Check if user can access a specific resource
   */
  canAccessResource(user, resourceType, resourceData) {
    switch (resourceType) {
      case 'ledger_entry':
        return canAccessParty(user, resourceData.party);
      case 'settlement':
        return canAccessParty(user, resourceData.party);
      case 'revenue_rule':
        return hasPermission(user, LEDGER_PERMISSIONS.VIEW_REVENUE_RULES);
      default:
        return false;
    }
  }
}

// Export singleton instance
export const permissionsService = new PermissionsService();