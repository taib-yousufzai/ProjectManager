import { useState, useMemo } from 'react';
import { usePayments } from '../../../hooks/usePayments';
import { useProjects } from '../../../hooks/useProjects';
import Card from '../../common/Card';
import Input from '../../common/Input';
import Button from '../../common/Button';
import Modal from '../../common/Modal';
import PaymentForm from '../PaymentForm/PaymentForm';
import PaymentDetailsModal from '../PaymentDetailsModal/PaymentDetailsModal';
import { PAYMENT_STATUSES, APPROVAL_STATUSES } from '../../../models';
import { paymentService } from '../../../services/paymentService';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import styles from './PaymentList.module.css';

const PaymentList = ({ projectId = null }) => {
  const { payments, isLoading, deletePayment, updatePayment } = usePayments(projectId);
  const { projects } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('paymentDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingPayment, setEditingPayment] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    let filtered = payments.filter(payment => {
      const matchesSearch = !searchTerm || 
        payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.projectName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      const matchesProject = projectFilter === 'all' || payment.projectId === projectFilter;
      
      // Add approval status filtering
      const approvalStatus = paymentService.getApprovalStatus(payment);
      const matchesApproval = approvalFilter === 'all' || approvalStatus === approvalFilter;
      
      const matchesDateRange = (!dateRange.start || new Date(payment.paymentDate) >= new Date(dateRange.start)) &&
                              (!dateRange.end || new Date(payment.paymentDate) <= new Date(dateRange.end));

      return matchesSearch && matchesStatus && matchesProject && matchesApproval && matchesDateRange;
    });

    // Sort payments
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'paymentDate' || sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortBy === 'projectName') {
        aValue = a.projectName || '';
        bValue = b.projectName || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [payments, searchTerm, statusFilter, projectFilter, approvalFilter, dateRange, sortBy, sortOrder]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const total = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const completed = filteredPayments.filter(p => p.status === PAYMENT_STATUSES.COMPLETED);
    const pending = filteredPayments.filter(p => p.status === PAYMENT_STATUSES.PENDING);
    const verified = filteredPayments.filter(p => p.verified);
    const pendingApproval = filteredPayments.filter(p => 
      !p.verified && (p.approvedBy?.length || 0) === 0
    );
    
    return {
      totalAmount: total,
      completedAmount: completed.reduce((sum, payment) => sum + payment.amount, 0),
      pendingAmount: pending.reduce((sum, payment) => sum + payment.amount, 0),
      totalCount: filteredPayments.length,
      completedCount: completed.length,
      pendingCount: pending.length,
      verifiedCount: verified.length,
      pendingApprovalCount: pendingApproval.length,
    };
  }, [filteredPayments]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setApprovalFilter('all');
    setProjectFilter('all');
    setDateRange({ start: '', end: '' });
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setIsEditModalOpen(true);
  };

  const handleUpdatePayment = async (paymentData) => {
    const result = await updatePayment(editingPayment.id, paymentData);
    if (result.success) {
      setIsEditModalOpen(false);
      setEditingPayment(null);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      await deletePayment(paymentId);
    }
  };

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setIsDetailsModalOpen(true);
  };

  const handlePaymentUpdate = () => {
    // Refresh payments list - this will be handled by the usePayments hook
    setIsDetailsModalOpen(false);
    setSelectedPayment(null);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      [PAYMENT_STATUSES.COMPLETED]: styles.statusCompleted,
      [PAYMENT_STATUSES.PENDING]: styles.statusPending,
      [PAYMENT_STATUSES.FAILED]: styles.statusFailed,
      [PAYMENT_STATUSES.REFUNDED]: styles.statusRefunded,
    };

    return (
      <span className={`${styles.statusBadge} ${statusClasses[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getApprovalBadge = (payment) => {
    const approvalStatus = paymentService.getApprovalStatus(payment);
    const approvalProgress = paymentService.getApprovalProgress(payment);
    
    const statusConfig = {
      [APPROVAL_STATUSES.VERIFIED]: { 
        class: styles.approvalVerified, 
        label: 'Verified', 
        icon: '✅' 
      },
      [APPROVAL_STATUSES.PARTIAL]: { 
        class: styles.approvalPartial, 
        label: `${approvalProgress.current}/3 Approved`, 
        icon: '⏳' 
      },
      [APPROVAL_STATUSES.PENDING]: { 
        class: styles.approvalPending, 
        label: 'Pending Approval', 
        icon: '⏸️' 
      }
    };
    
    const config = statusConfig[approvalStatus];
    if (!config) return null;
    
    return (
      <span className={`${styles.approvalBadge} ${config.class}`}>
        <span className={styles.badgeIcon}>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getRevenueBadge = (payment) => {
    const revenueStatus = paymentService.getRevenueProcessingStatus(payment);
    
    const statusConfig = {
      'processed': { 
        class: styles.revenueProcessed, 
        label: 'Revenue Processed', 
        icon: '💰' 
      },
      'pending_processing': { 
        class: styles.revenuePending, 
        label: 'Processing Revenue', 
        icon: '⏳' 
      },
      'not_verified': { 
        class: styles.revenueNotStarted, 
        label: 'Awaiting Verification', 
        icon: '⏸️' 
      }
    };
    
    const config = statusConfig[revenueStatus];
    if (!config) return null;
    
    return (
      <span className={`${styles.revenueBadge} ${config.class}`}>
        <span className={styles.badgeIcon}>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.paymentList}>
        <Card>
          <div className={styles.loading}>Loading payments...</div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className={styles.paymentList}>
        {/* Summary Cards */}
        <div className={styles.summaryGrid}>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryContent}>
              <h3>Total Payments</h3>
              <div className={styles.summaryValue}>{formatCurrency(summary.totalAmount)}</div>
              <div className={styles.summaryCount}>{summary.totalCount} transactions</div>
            </div>
          </Card>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryContent}>
              <h3>Verified Payments</h3>
              <div className={styles.summaryValue}>{summary.verifiedCount}</div>
              <div className={styles.summaryCount}>Fully approved</div>
            </div>
          </Card>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryContent}>
              <h3>Pending Approval</h3>
              <div className={styles.summaryValue}>{summary.pendingApprovalCount}</div>
              <div className={styles.summaryCount}>Awaiting approval</div>
            </div>
          </Card>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryContent}>
              <h3>Completed</h3>
              <div className={styles.summaryValue}>{formatCurrency(summary.completedAmount)}</div>
              <div className={styles.summaryCount}>{summary.completedCount} transactions</div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className={styles.filtersCard}>
          <div className={styles.filtersGrid}>
            <div className={styles.searchGroup}>
              <Input
                type="text"
                label="Search payments"
                placeholder="Search by description, transaction ID, or project..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Status</label>
              <select 
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value={PAYMENT_STATUSES.COMPLETED}>Completed</option>
                <option value={PAYMENT_STATUSES.PENDING}>Pending</option>
                <option value={PAYMENT_STATUSES.FAILED}>Failed</option>
                <option value={PAYMENT_STATUSES.REFUNDED}>Refunded</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Approval</label>
              <select 
                className={styles.filterSelect}
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
              >
                <option value="all">All Approvals</option>
                <option value={APPROVAL_STATUSES.VERIFIED}>Verified</option>
                <option value={APPROVAL_STATUSES.PARTIAL}>Partial Approval</option>
                <option value={APPROVAL_STATUSES.PENDING}>Pending Approval</option>
              </select>
            </div>

            {!projectId && (
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Project</label>
                <select 
                  className={styles.filterSelect}
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                >
                  <option value="all">All Projects</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.dateRangeGroup}>
              <label className={styles.filterLabel}>Date Range</label>
              <div className={styles.dateInputs}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  placeholder="Start date"
                />
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  placeholder="End date"
                />
              </div>
            </div>

            <div className={styles.filterActions}>
              <Button variant="secondary" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Payments Table */}
        <Card className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3>Payment Transactions</h3>
            <div className={styles.tableActions}>
              <span className={styles.resultCount}>
                {filteredPayments.length} of {payments.length} payments
              </span>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.paymentsTable}>
              <thead>
                <tr>
                  <th 
                    className={styles.sortableHeader}
                    onClick={() => handleSort('paymentDate')}
                  >
                    Date
                    {sortBy === 'paymentDate' && (
                      <span className={styles.sortIcon}>
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  {!projectId && (
                    <th 
                      className={styles.sortableHeader}
                      onClick={() => handleSort('projectName')}
                    >
                      Project
                      {sortBy === 'projectName' && (
                        <span className={styles.sortIcon}>
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                  )}
                  <th>Description</th>
                  <th 
                    className={styles.sortableHeader}
                    onClick={() => handleSort('amount')}
                  >
                    Amount
                    {sortBy === 'amount' && (
                      <span className={styles.sortIcon}>
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Revenue</th>
                  <th>Method</th>
                  <th>Transaction ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={projectId ? "9" : "10"} className={styles.emptyState}>
                      No payments found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(payment => (
                    <tr key={payment.id} className={styles.paymentRow}>
                      <td>{formatDate(payment.paymentDate)}</td>
                      {!projectId && (
                        <td>
                          <div className={styles.projectCell}>
                            <span className={styles.projectName}>{payment.projectName || 'Unknown Project'}</span>
                            <span className={styles.clientName}>{payment.clientName}</span>
                          </div>
                        </td>
                      )}
                      <td className={styles.descriptionCell}>{payment.description}</td>
                      <td className={styles.amountCell}>
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td>{getStatusBadge(payment.status)}</td>
                      <td>{getApprovalBadge(payment)}</td>
                      <td>{getRevenueBadge(payment)}</td>
                      <td>{payment.paymentMethod || '-'}</td>
                      <td className={styles.transactionCell}>
                        {payment.transactionId || '-'}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => handleViewDetails(payment)}
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleEditPayment(payment)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleDeletePayment(payment.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Edit Payment Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPayment(null);
        }}
        title="Edit Payment"
        size="large"
      >
        {editingPayment && (
          <PaymentForm
            initialData={editingPayment}
            onSubmit={handleUpdatePayment}
            projectId={editingPayment.projectId}
          />
        )}
      </Modal>

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onPaymentUpdate={handlePaymentUpdate}
      />
    </>
  );
};

export default PaymentList;