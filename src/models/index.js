// User model
export const createUser = (userData) => ({
  email: userData.email,
  firstName: userData.firstName || '',
  lastName: userData.lastName || '',
  role: userData.role || 'member',
  avatar: userData.avatar || null,
  permissions: userData.permissions || [],
  lastLoginAt: null,
  isActive: true,
  ...userData
});

// Client model (NEW)
export const createClient = (clientData) => ({
  companyName: clientData.companyName,
  contactPerson: clientData.contactPerson || '',
  email: clientData.email || '',
  phone: clientData.phone || '',
  address: clientData.address || '',
  // Aggregated stats (denormalized for performance)
  totalProjects: clientData.totalProjects || 0,
  activeProjects: clientData.activeProjects || 0,
  totalRevenue: clientData.totalRevenue || 0,
  totalOutstanding: clientData.totalOutstanding || 0,
  tags: clientData.tags || [],

  // Timestamps
  createdBy: clientData.createdBy,
  createdAt: clientData.createdAt || new Date(),
  updatedAt: new Date(),
  ...clientData
});

// Project model (UPDATED)
export const createProject = (projectData) => ({
  name: projectData.name,
  description: projectData.description || '',
  clientId: projectData.clientId || null, // Link to Client
  clientName: projectData.clientName || '', // Kept for display convenience/fallback

  // Classification
  type: projectData.type || 'standard',
  billingModel: projectData.billingModel || 'fixed',
  location: projectData.location || null, // For geo-specific marketing projects

  // Status & Timeline
  status: projectData.status || 'active',
  startDate: projectData.startDate,
  endDate: projectData.endDate || null,

  // Progress Tracking
  progressMethod: projectData.progressMethod || 'task', // task, milestone, manual, time
  progress: projectData.progress || 0,
  manualProgress: projectData.manualProgress || 0, // Used if method is 'manual'

  // Marketing / Recurring specific
  recurringConfig: projectData.recurringConfig || null, // { startDate, monthlyFee, totalMonths, ... }

  // Financials (Isolated)
  budget: projectData.budget || 0,
  totalPaid: projectData.totalPaid || 0,
  currency: projectData.currency || 'INR',

  // Team
  teamMembers: projectData.teamMembers || [],
  ownerId: projectData.ownerId,
  tags: projectData.tags || [],

  createdAt: projectData.createdAt || new Date(),
  updatedAt: new Date(),
  ...projectData
});

// Task model (NEW)
export const createTask = (taskData) => ({
  projectId: taskData.projectId,
  title: taskData.title,
  description: taskData.description || '',
  status: taskData.status || 'todo',
  priority: taskData.priority || 'medium',
  assignedTo: taskData.assignedTo || null,
  dueDate: taskData.dueDate || null,
  createdBy: taskData.createdBy,
  completedAt: taskData.completedAt || null,
  ...taskData
});

// Milestone model (NEW)
export const createMilestone = (milestoneData) => ({
  projectId: milestoneData.projectId,
  title: milestoneData.title,
  description: milestoneData.description || '',
  amount: milestoneData.amount || 0,
  status: milestoneData.status || 'pending', // pending, completed, paid
  dueDate: milestoneData.dueDate || null,
  order: milestoneData.order || 0,
  ...milestoneData
});

// Payment model
export const createPayment = (paymentData) => ({
  projectId: paymentData.projectId,
  clientId: paymentData.clientId || null, // Optional denormalization
  amount: paymentData.amount,
  currency: paymentData.currency || 'INR',
  status: paymentData.status || 'pending',
  paymentDate: paymentData.paymentDate,
  description: paymentData.description || '',
  proofFiles: paymentData.proofFiles || [],
  proofUrls: paymentData.proofUrls || [],
  paymentMethod: paymentData.paymentMethod || '',
  transactionId: paymentData.transactionId || null,
  createdBy: paymentData.createdBy,
  // Approval workflow fields
  approvedBy: paymentData.approvedBy || [],
  verified: paymentData.verified || false,
  // Revenue processing fields
  revenueRuleId: paymentData.revenueRuleId || null,
  ledgerEntryIds: paymentData.ledgerEntryIds || [],
  revenueProcessed: paymentData.revenueProcessed || false,
  revenueProcessedAt: paymentData.revenueProcessedAt || null,
  ...paymentData
});

// Revenue rule model
export const createRevenueRule = (ruleData) => ({
  ruleName: ruleData.ruleName,
  adminPercent: ruleData.adminPercent,
  teamPercent: ruleData.teamPercent,
  vendorPercent: ruleData.vendorPercent || 0,
  isDefault: ruleData.isDefault || false,
  isActive: ruleData.isActive !== undefined ? ruleData.isActive : true,
  createdBy: ruleData.createdBy,
  ...ruleData
});

// Ledger entry model
export const createLedgerEntry = (entryData) => ({
  paymentId: entryData.paymentId,
  projectId: entryData.projectId,
  revenueRuleId: entryData.revenueRuleId,
  type: entryData.type, // 'credit' or 'debit'
  party: entryData.party, // 'admin', 'team', or 'vendor'
  amount: entryData.amount,
  currency: entryData.currency,
  date: entryData.date,
  status: entryData.status || 'pending', // 'pending' or 'cleared'
  remarks: entryData.remarks || null,
  settlementId: entryData.settlementId || null,
  ...entryData
});

// Settlement model
export const createSettlement = (settlementData) => ({
  party: settlementData.party, // 'admin', 'team', or 'vendor'
  ledgerEntryIds: settlementData.ledgerEntryIds || [],
  totalAmount: settlementData.totalAmount,
  currency: settlementData.currency,
  settlementDate: settlementData.settlementDate,
  proofUrls: settlementData.proofUrls || [],
  remarks: settlementData.remarks || null,
  createdBy: settlementData.createdBy,
  ...settlementData
});

// File model
export const createFile = (fileData) => ({
  name: fileData.name,
  size: fileData.size,
  type: fileData.type,
  url: fileData.url,
  uploadedBy: fileData.uploadedBy,
  projectId: fileData.projectId || null,
  paymentId: fileData.paymentId || null,
  ...fileData
});

// Project status options
export const PROJECT_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ON_HOLD: 'on-hold',
  CANCELLED: 'cancelled'
};

// Project Types (NEW)
export const PROJECT_TYPES = {
  STANDARD: 'standard',
  CRM: 'crm',
  WEBSITE: 'website',
  MARKETING: 'marketing',
  MOBILE_APP: 'mobile_app',
  SEO: 'seo'
};

// Billing Models (NEW)
export const BILLING_MODELS = {
  FIXED: 'fixed',
  HOURLY: 'hourly',
  RETAINER: 'retainer', // Recurring
  MILESTONE: 'milestone'
};

// Progress Calculation Methods (NEW)
export const PROGRESS_METHODS = {
  TASK: 'task',          // Based on % of completed tasks
  MILESTONE: 'milestone', // Based on % of completed milestones
  MANUAL: 'manual',      // Manually set by PM
  TIME: 'time'           // Time elapsed (for retainers)
};

// Payment status options
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Payment approval status
export const APPROVAL_STATUSES = {
  PENDING: 'pending_approval',
  PARTIAL: 'partial_approval',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

// Ledger entry statuses
export const LEDGER_ENTRY_STATUSES = {
  PENDING: 'pending',
  CLEARED: 'cleared'
};

// Ledger entry types
export const LEDGER_ENTRY_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit'
};

// Party types
export const PARTY_TYPES = {
  ADMIN: 'admin',
  TEAM: 'team',
  VENDOR: 'vendor'
};

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member'
};

// Notification types
export const NOTIFICATION_TYPES = {
  PAYMENT_ADDED: 'payment_added',
  PAYMENT_REMINDER: 'payment_reminder',
  APPROVAL_PENDING: 'approval_pending',
  PROOF_UPLOADED: 'proof_uploaded',
  PAYMENT_VERIFIED: 'payment_verified',
  PROJECT_CREATED: 'project_created',
  PROJECT_COMPLETED: 'project_completed',
  REVENUE_RULE_CREATED: 'revenue_rule_created',
  REVENUE_RULE_MODIFIED: 'revenue_rule_modified',
  SETTLEMENT_COMPLETED: 'settlement_completed',
  SETTLEMENT_REMINDER: 'settlement_reminder',
  LEDGER_ENTRY_CREATED: 'ledger_entry_created',
  SUMMARY_REPORT: 'summary_report',
  SYSTEM_ALERT: 'system_alert'
};

// Notification priorities
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Notification model
export const createNotification = (notificationData) => ({
  type: notificationData.type,
  userId: notificationData.userId, // Target user
  title: notificationData.title,
  message: notificationData.message,
  read: notificationData.read || false,
  priority: notificationData.priority || NOTIFICATION_PRIORITIES.MEDIUM,
  metadata: notificationData.metadata || {}, // Additional data (projectId, paymentId, etc.)
  actionUrl: notificationData.actionUrl || null, // URL to navigate when clicked
  createdBy: notificationData.createdBy || null, // Who triggered the notification
  expiresAt: notificationData.expiresAt || null, // Optional expiration
  ...notificationData
});

// Audit log model
export const createAuditLog = (auditData) => ({
  eventType: auditData.eventType,
  level: auditData.level,
  riskLevel: auditData.riskLevel,
  userId: auditData.userId,
  sessionId: auditData.sessionId,
  timestamp: auditData.timestamp,
  details: auditData.details,
  resourceType: auditData.resourceType || null,
  resourceId: auditData.resourceId || null,
  ipAddress: auditData.ipAddress || null,
  userAgent: auditData.userAgent || null,
  metadata: auditData.metadata || {},
  ...auditData
});