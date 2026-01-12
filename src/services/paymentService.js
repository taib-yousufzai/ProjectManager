import { paymentsService, projectsService } from './firestore';
import { createPayment, PAYMENT_STATUSES, APPROVAL_STATUSES } from '../models';
import { notificationService } from './notificationService';
import { revenueService, AUDIT_LOG_LEVELS } from './revenueService';
import { ledgerService } from './ledgerService';

export class PaymentService {
  // Create a new payment
  async createPayment(paymentData, userId) {
    try {
      const payment = createPayment({
        ...paymentData,
        createdBy: userId
      });

      const newPayment = await paymentsService.create(payment);

      // Get project data for notifications (non-blocking)
      try {
        const project = await projectsService.getById(payment.projectId);

        // Send notification to team members
        if (project) {
          await notificationService.notifyPaymentAdded(
            { ...newPayment, id: newPayment.id },
            project,
            userId
          );
        }
      } catch (projectError) {
        console.warn('Could not fetch project for notifications:', projectError.message);
        // Continue anyway - payment was created successfully
      }

      // Update project's totalPaid if payment is completed
      if (payment.status === PAYMENT_STATUSES.COMPLETED) {
        try {
          await this.updateProjectTotalPaid(payment.projectId);
        } catch (updateError) {
          console.warn('Could not update project totalPaid:', updateError.message);
          // Continue anyway - payment was created successfully
        }
      }

      return newPayment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  // Get all payments for a user (across all their projects)
  async getUserPayments(userId) {
    try {
      // First get user's projects
      const userProjects = await projectsService.getAll({
        where: [['teamMembers', 'array-contains', userId]]
      });

      const projectIds = userProjects.map(p => p.id);

      if (projectIds.length === 0) {
        return [];
      }

      // Get payments for all user projects
      const payments = await paymentsService.getAll({
        where: [['projectId', 'in', projectIds]],
        orderBy: [['paymentDate', 'desc']]
      });

      // Enrich payments with project information
      return payments.map(payment => {
        const project = userProjects.find(p => p.id === payment.projectId);
        return {
          ...payment,
          projectName: project?.name || 'Unknown Project',
          clientName: project?.clientName || 'Unknown Client'
        };
      });
    } catch (error) {
      console.error('Error fetching user payments:', error);
      throw error;
    }
  }

  // Get payments for a specific project
  async getProjectPayments(projectId) {
    try {
      return await paymentsService.getAll({
        where: [['projectId', '==', projectId]],
        orderBy: [['paymentDate', 'desc']]
      });
    } catch (error) {
      console.error('Error fetching project payments:', error);
      throw error;
    }
  }

  // Get a single payment by ID
  async getPayment(paymentId) {
    try {
      return await paymentsService.getById(paymentId);
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  // Update a payment
  async updatePayment(paymentId, updates) {
    try {
      const payment = await paymentsService.getById(paymentId);
      const updatedPayment = await paymentsService.update(paymentId, updates);

      // Update project's totalPaid if status changed
      if (updates.status && updates.status !== payment.status) {
        await this.updateProjectTotalPaid(payment.projectId);
      }

      return updatedPayment;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  // Delete a payment
  async deletePayment(paymentId) {
    try {
      const payment = await paymentsService.getById(paymentId);
      await paymentsService.delete(paymentId);

      // Update project's totalPaid
      await this.updateProjectTotalPaid(payment.projectId);

      return paymentId;
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }

  // Search and filter payments
  async searchPayments(userId, filters = {}) {
    try {
      let payments = await this.getUserPayments(userId);

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        payments = payments.filter(p => p.status === filters.status);
      }

      if (filters.projectId && filters.projectId !== 'all') {
        payments = payments.filter(p => p.projectId === filters.projectId);
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        payments = payments.filter(p => new Date(p.paymentDate) >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        payments = payments.filter(p => new Date(p.paymentDate) <= toDate);
      }

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        payments = payments.filter(p =>
          p.description.toLowerCase().includes(term) ||
          p.projectName.toLowerCase().includes(term) ||
          p.clientName.toLowerCase().includes(term)
        );
      }

      return payments;
    } catch (error) {
      console.error('Error searching payments:', error);
      throw error;
    }
  }

  // Get payment statistics
  async getPaymentStats(userId) {
    try {
      const payments = await this.getUserPayments(userId);

      const stats = {
        total: payments.length,
        completed: payments.filter(p => p.status === PAYMENT_STATUSES.COMPLETED).length,
        pending: payments.filter(p => p.status === PAYMENT_STATUSES.PENDING).length,
        failed: payments.filter(p => p.status === PAYMENT_STATUSES.FAILED).length,
        totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        completedAmount: payments
          .filter(p => p.status === PAYMENT_STATUSES.COMPLETED)
          .reduce((sum, p) => sum + (p.amount || 0), 0),
        pendingAmount: payments
          .filter(p => p.status === PAYMENT_STATUSES.PENDING)
          .reduce((sum, p) => sum + (p.amount || 0), 0)
      };

      return stats;
    } catch (error) {
      console.error('Error calculating payment stats:', error);
      throw error;
    }
  }

  // Get payment analytics by month
  async getPaymentAnalytics(userId, months = 12) {
    try {
      const payments = await this.getUserPayments(userId);
      const now = new Date();
      const analytics = [];

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthPayments = payments.filter(p => {
          const paymentDate = new Date(p.paymentDate);
          return paymentDate >= monthStart && paymentDate <= monthEnd;
        });

        analytics.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          totalAmount: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
          completedAmount: monthPayments
            .filter(p => p.status === PAYMENT_STATUSES.COMPLETED)
            .reduce((sum, p) => sum + (p.amount || 0), 0),
          count: monthPayments.length,
          completedCount: monthPayments.filter(p => p.status === PAYMENT_STATUSES.COMPLETED).length
        });
      }

      return analytics;
    } catch (error) {
      console.error('Error calculating payment analytics:', error);
      throw error;
    }
  }

  // Update project's totalPaid based on completed payments
  async updateProjectTotalPaid(projectId) {
    try {
      const projectPayments = await this.getProjectPayments(projectId);
      const totalPaid = projectPayments
        .filter(p => p.status === PAYMENT_STATUSES.COMPLETED)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      await projectsService.update(projectId, { totalPaid });

      return totalPaid;
    } catch (error) {
      console.error('Error updating project totalPaid:', error);
      throw error;
    }
  }

  // Subscribe to real-time payment updates for user projects
  subscribeToUserPayments(userId, callback) {
    // Note: This is a simplified version. In a real app, you'd want to 
    // subscribe to payments for specific projects the user has access to
    return paymentsService.subscribe(callback, {
      orderBy: [['paymentDate', 'desc']]
    });
  }

  // Subscribe to payments for a specific project
  subscribeToProjectPayments(projectId, callback) {
    return paymentsService.subscribe(callback, {
      where: [['projectId', '==', projectId]],
      orderBy: [['paymentDate', 'desc']]
    });
  }

  // Approval workflow methods

  // Mark payment as received (approve)
  async approvePayment(paymentId, userId) {
    try {
      const payment = await paymentsService.getById(paymentId);

      // Check if user already approved
      if (payment.approvedBy.includes(userId)) {
        throw new Error('You have already approved this payment');
      }

      const updatedApprovedBy = [...payment.approvedBy, userId];
      const isVerified = updatedApprovedBy.length >= 3; // Exactly 3 approvals needed

      const updates = {
        approvedBy: updatedApprovedBy,
        verified: isVerified
      };

      const updatedPayment = await paymentsService.update(paymentId, updates);

      // Get project data for notifications
      const project = await projectsService.getById(payment.projectId);

      // Send verification notification if payment is now verified
      if (isVerified && project) {
        await notificationService.notifyPaymentVerified(
          { ...updatedPayment, id: paymentId },
          project
        );

        // Trigger revenue processing when payment becomes verified (with backward compatibility)
        try {
          await this.processPaymentRevenue(paymentId);
        } catch (revenueError) {
          console.warn('Revenue processing failed for payment', paymentId, revenueError);
          // Don't fail the approval if revenue processing fails - ensures backward compatibility
        }
      }

      // Update project totals if payment became verified
      if (isVerified) {
        await this.updateProjectTotalPaid(payment.projectId);
      }

      return updatedPayment;
    } catch (error) {
      console.error('Error approving payment:', error);
      throw error;
    }
  }

  // Remove approval from payment
  async removeApproval(paymentId, userId) {
    try {
      const payment = await paymentsService.getById(paymentId);

      // Check if user has approved
      if (!payment.approvedBy.includes(userId)) {
        throw new Error('You have not approved this payment');
      }

      const updatedApprovedBy = payment.approvedBy.filter(id => id !== userId);
      const isVerified = updatedApprovedBy.length >= 3; // Exactly 3 approvals needed

      const updates = {
        approvedBy: updatedApprovedBy,
        verified: isVerified
      };

      const updatedPayment = await paymentsService.update(paymentId, updates);

      // Update project totals
      await this.updateProjectTotalPaid(payment.projectId);

      return updatedPayment;
    } catch (error) {
      console.error('Error removing approval:', error);
      throw error;
    }
  }

  // Get approval status for a payment
  getApprovalStatus(payment) {
    if (payment.verified) {
      return APPROVAL_STATUSES.VERIFIED;
    }

    if (payment.approvedBy.length > 0) {
      return APPROVAL_STATUSES.PARTIAL;
    }

    return APPROVAL_STATUSES.PENDING;
  }

  // Get approval progress
  getApprovalProgress(payment) {
    return {
      current: payment.approvedBy.length,
      required: 3 // Always 3 approvals required
    };
  }

  // Get payments requiring approval
  async getPaymentsRequiringApproval(userId) {
    try {
      const userPayments = await this.getUserPayments(userId);

      return userPayments.filter(payment =>
        !payment.verified &&
        !payment.approvedBy.includes(userId)
      );
    } catch (error) {
      console.error('Error getting payments requiring approval:', error);
      throw error;
    }
  }

  // Get approval analytics
  async getApprovalAnalytics(userId) {
    try {
      const payments = await this.getUserPayments(userId);

      const stats = {
        total: payments.length,
        verified: payments.filter(p => p.verified).length,
        pendingApproval: payments.filter(p =>
          !p.verified && p.approvedBy.length === 0
        ).length,
        partialApproval: payments.filter(p =>
          !p.verified && p.approvedBy.length > 0
        ).length
      };

      return stats;
    } catch (error) {
      console.error('Error calculating approval analytics:', error);
      throw error;
    }
  }

  // Notify proof upload (called when proof files are uploaded)
  async notifyProofUpload(paymentId, uploadedBy) {
    try {
      const payment = await paymentsService.getById(paymentId);
      const project = await projectsService.getById(payment.projectId);

      if (project) {
        await notificationService.notifyProofUploaded(
          { ...payment, id: paymentId },
          project,
          uploadedBy
        );
      }
    } catch (error) {
      console.error('Error sending proof upload notification:', error);
      throw error;
    }
  }

  // Send payment reminders for pending payments
  async sendPaymentReminders(daysPending = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysPending);

      // Get all payments that are pending approval and older than cutoff
      const allPayments = await paymentsService.getAll({
        where: [
          ['verified', '==', false],
          ['createdAt', '<=', cutoffDate]
        ]
      });

      const reminderPromises = allPayments.map(async (payment) => {
        try {
          const project = await projectsService.getById(payment.projectId);
          if (project) {
            const daysPendingActual = Math.floor(
              (new Date() - payment.createdAt.toDate()) / (1000 * 60 * 60 * 24)
            );

            await notificationService.notifyPaymentReminder(
              payment,
              project,
              daysPendingActual
            );
          }
        } catch (error) {
          console.error(`Error sending reminder for payment ${payment.id}:`, error);
        }
      });

      await Promise.all(reminderPromises);
      return allPayments.length;
    } catch (error) {
      console.error('Error sending payment reminders:', error);
      throw error;
    }
  }

  // Revenue processing methods

  // Process payment revenue when verified
  async processPaymentRevenue(paymentId) {
    const startTime = new Date();
    let auditDetails = {
      paymentId,
      startTime: startTime.toISOString(),
      success: false
    };

    try {
      const payment = await paymentsService.getById(paymentId);
      auditDetails.paymentAmount = payment.amount;
      auditDetails.paymentCurrency = payment.currency;
      auditDetails.projectId = payment.projectId;

      // Check if payment is verified and not already processed
      if (!payment.verified) {
        auditDetails.skipReason = 'payment_not_verified';
        console.log(`Skipping revenue processing for payment ${paymentId}: not verified`);
        return null;
      }

      if (payment.revenueProcessed) {
        auditDetails.skipReason = 'already_processed';
        console.log(`Skipping revenue processing for payment ${paymentId}: already processed`);
        return null;
      }

      // Get the active revenue rule for this project
      let revenueRule;
      try {
        revenueRule = await revenueService.getActiveRevenueRule(payment.projectId);
        auditDetails.revenueRuleId = revenueRule.id;
        auditDetails.revenueRuleName = revenueRule.ruleName;
      } catch (ruleError) {
        auditDetails.error = 'revenue_rule_not_found';
        auditDetails.errorMessage = ruleError.message;

        // Log the error but don't throw - this prevents revenue processing failures from breaking payment verification
        console.error(`Revenue processing failed for payment ${paymentId}: No active revenue rule found`, ruleError);

        // For backward compatibility, create a default rule if none exists
        try {
          const { dataMigrationService } = await import('./dataMigrationService');
          revenueRule = await dataMigrationService.createDefaultRevenueRule();
          auditDetails.revenueRuleId = revenueRule.id;
          auditDetails.revenueRuleName = revenueRule.ruleName;
          auditDetails.createdDefaultRule = true;

          console.log(`Created default revenue rule for payment ${paymentId} processing`);
        } catch (defaultRuleError) {
          console.error('Failed to create default revenue rule:', defaultRuleError);

          // Notify administrators about missing revenue rule
          try {
            await revenueService.notifyAdministrators(
              'Revenue Processing Failed: No Active Rule',
              `Payment ID: ${paymentId}\nProject ID: ${payment.projectId}\nAmount: ${payment.amount} ${payment.currency}\nError: ${ruleError.message}\nTime: ${new Date().toISOString()}`,
              'high'
            );
          } catch (notificationError) {
            console.error('Failed to notify administrators:', notificationError);
          }

          // Return gracefully without processing revenue
          return null;
        }
      }

      // Calculate revenue split with error handling
      let revenueSplit;
      try {
        revenueSplit = revenueService.calculateRevenueSplit(
          payment.amount,
          payment.currency,
          revenueRule
        );
        auditDetails.revenueSplit = {
          admin: revenueSplit.admin.amount,
          team: revenueSplit.team.amount,
          vendor: revenueSplit.vendor?.amount || 0
        };
      } catch (splitError) {
        auditDetails.error = 'revenue_split_calculation_failed';
        auditDetails.errorMessage = splitError.message;

        console.error(`Revenue split calculation failed for payment ${paymentId}:`, splitError);

        // Notify administrators about calculation failure
        try {
          await revenueService.notifyAdministrators(
            'Revenue Processing Failed: Split Calculation Error',
            `Payment ID: ${paymentId}\nAmount: ${payment.amount} ${payment.currency}\nRule: ${revenueRule.ruleName}\nError: ${splitError.message}\nTime: ${new Date().toISOString()}`,
            'high'
          );
        } catch (notificationError) {
          console.error('Failed to notify administrators about split calculation error:', notificationError);
        }

        return null;
      }

      // Create ledger entries for each party with error handling
      const ledgerEntries = [];
      const entryDate = new Date();
      const ledgerCreationErrors = [];

      try {
        // Admin entry
        if (revenueSplit.admin.amount > 0) {
          try {
            const adminEntry = await ledgerService.createLedgerEntry({
              paymentId: paymentId,
              projectId: payment.projectId,
              revenueRuleId: revenueRule.id,
              type: 'credit',
              party: 'admin',
              amount: revenueSplit.admin.amount,
              currency: revenueSplit.admin.currency,
              date: entryDate,
              status: 'pending'
            });
            ledgerEntries.push(adminEntry);
          } catch (adminEntryError) {
            ledgerCreationErrors.push({ party: 'admin', error: adminEntryError.message });
          }
        }

        // Team entry
        if (revenueSplit.team.amount > 0) {
          try {
            const teamEntry = await ledgerService.createLedgerEntry({
              paymentId: paymentId,
              projectId: payment.projectId,
              revenueRuleId: revenueRule.id,
              type: 'credit',
              party: 'team',
              amount: revenueSplit.team.amount,
              currency: revenueSplit.team.currency,
              date: entryDate,
              status: 'pending'
            });
            ledgerEntries.push(teamEntry);
          } catch (teamEntryError) {
            ledgerCreationErrors.push({ party: 'team', error: teamEntryError.message });
          }
        }

        // Vendor entry (if applicable)
        if (revenueSplit.vendor && revenueSplit.vendor.amount > 0) {
          try {
            const vendorEntry = await ledgerService.createLedgerEntry({
              paymentId: paymentId,
              projectId: payment.projectId,
              revenueRuleId: revenueRule.id,
              type: 'credit',
              party: 'vendor',
              amount: revenueSplit.vendor.amount,
              currency: revenueSplit.vendor.currency,
              date: entryDate,
              status: 'pending'
            });
            ledgerEntries.push(vendorEntry);
          } catch (vendorEntryError) {
            ledgerCreationErrors.push({ party: 'vendor', error: vendorEntryError.message });
          }
        }

        // Check if any ledger entries failed to create
        if (ledgerCreationErrors.length > 0) {
          auditDetails.ledgerCreationErrors = ledgerCreationErrors;
          auditDetails.partialSuccess = true;
          auditDetails.createdEntries = ledgerEntries.length;

          const errorMessage = `Partial ledger entry creation failure for payment ${paymentId}: ${ledgerCreationErrors.map(e => `${e.party}: ${e.error}`).join(', ')}`;
          console.error(errorMessage);

          // Notify administrators about partial failure
          try {
            await revenueService.notifyAdministrators(
              'Revenue Processing Partial Failure: Ledger Entry Creation',
              `Payment ID: ${paymentId}\nSuccessful Entries: ${ledgerEntries.length}\nFailed Entries: ${ledgerCreationErrors.length}\nErrors: ${JSON.stringify(ledgerCreationErrors, null, 2)}\nTime: ${new Date().toISOString()}`,
              'high'
            );
          } catch (notificationError) {
            console.error('Failed to notify administrators about partial ledger creation failure:', notificationError);
          }
        }

        // Only update payment if at least some ledger entries were created
        if (ledgerEntries.length > 0) {
          const updates = {
            revenueProcessed: true,
            revenueProcessedAt: entryDate,
            revenueRuleId: revenueRule.id,
            ledgerEntryIds: ledgerEntries.map(entry => entry.id)
          };

          try {
            await paymentsService.update(paymentId, updates);
            auditDetails.paymentUpdated = true;
          } catch (updateError) {
            auditDetails.paymentUpdateError = updateError.message;
            console.error(`Failed to update payment ${paymentId} with revenue processing status:`, updateError);

            // This is a critical error - notify administrators
            try {
              await revenueService.notifyAdministrators(
                'Critical Revenue Processing Error: Payment Update Failed',
                `Payment ID: ${paymentId}\nLedger Entries Created: ${ledgerEntries.length}\nUpdate Error: ${updateError.message}\nTime: ${new Date().toISOString()}\n\nThis requires manual intervention to maintain data consistency.`,
                'critical'
              );
            } catch (notificationError) {
              console.error('Failed to notify administrators about critical payment update error:', notificationError);
            }
          }
        }

        auditDetails.success = ledgerEntries.length > 0;
        auditDetails.ledgerEntriesCreated = ledgerEntries.length;
        auditDetails.endTime = new Date().toISOString();
        auditDetails.processingTimeMs = new Date() - startTime;

        // Log successful processing
        if (auditDetails.success) {
          console.log(`Revenue processed for payment ${paymentId}: ${ledgerEntries.length} ledger entries created`);

          // Log audit event for successful processing
          await revenueService.logAuditEvent(
            auditDetails.partialSuccess ? AUDIT_LOG_LEVELS.WARNING : AUDIT_LOG_LEVELS.INFO,
            'payment_revenue_processed',
            auditDetails
          );
        }

        return {
          payment: { ...payment, ...updates },
          ledgerEntries,
          revenueRule,
          revenueSplit,
          auditDetails
        };

      } catch (ledgerError) {
        auditDetails.error = 'ledger_creation_failed';
        auditDetails.errorMessage = ledgerError.message;
        auditDetails.endTime = new Date().toISOString();

        console.error(`Ledger entry creation failed for payment ${paymentId}:`, ledgerError);

        // Notify administrators about ledger creation failure
        try {
          await revenueService.notifyAdministrators(
            'Revenue Processing Failed: Ledger Entry Creation Error',
            `Payment ID: ${paymentId}\nAmount: ${payment.amount} ${payment.currency}\nError: ${ledgerError.message}\nTime: ${new Date().toISOString()}`,
            'high'
          );
        } catch (notificationError) {
          console.error('Failed to notify administrators about ledger creation error:', notificationError);
        }

        return null;
      }

    } catch (error) {
      auditDetails.error = 'general_processing_error';
      auditDetails.errorMessage = error.message;
      auditDetails.endTime = new Date().toISOString();

      console.error('Error processing payment revenue:', error);

      // Log the error but don't throw it to avoid affecting payment verification
      // This ensures revenue processing failures don't break the payment workflow
      console.error(`Revenue processing failed for payment ${paymentId}:`, error.message);

      // Log audit event for failed processing
      await revenueService.logAuditEvent(
        AUDIT_LOG_LEVELS.ERROR,
        'payment_revenue_processing_failed',
        auditDetails,
        null,
        error
      );

      // Notify administrators about general processing failure
      try {
        await revenueService.notifyAdministrators(
          'Revenue Processing Failed: General Error',
          `Payment ID: ${paymentId}\nError: ${error.message}\nStack: ${error.stack}\nTime: ${new Date().toISOString()}`,
          'high'
        );
      } catch (notificationError) {
        console.error('Failed to notify administrators about general processing error:', notificationError);
      }

      return null;
    }
  }

  // Get payment with revenue information
  async getPaymentWithRevenue(paymentId) {
    try {
      const payment = await this.getPayment(paymentId);

      if (!payment.revenueProcessed) {
        return payment;
      }

      // Get associated ledger entries
      const ledgerEntries = await ledgerService.getPaymentLedgerEntries(paymentId);

      // Get revenue rule
      let revenueRule = null;
      if (payment.revenueRuleId) {
        revenueRule = await revenueService.getRevenueRule(payment.revenueRuleId);
      }

      return {
        ...payment,
        ledgerEntries,
        revenueRule
      };
    } catch (error) {
      console.error('Error fetching payment with revenue:', error);
      throw error;
    }
  }

  // Check if payment can be processed for revenue
  canProcessRevenue(payment) {
    return payment.verified && !payment.revenueProcessed;
  }

  // Get revenue processing status
  getRevenueProcessingStatus(payment) {
    if (!payment.verified) {
      return 'not_verified';
    }

    if (payment.revenueProcessed) {
      return 'processed';
    }

    return 'pending_processing';
  }
}

export const paymentService = new PaymentService();