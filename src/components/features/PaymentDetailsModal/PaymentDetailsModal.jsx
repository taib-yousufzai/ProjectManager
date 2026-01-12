import { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import PaymentApproval from '../PaymentApproval/PaymentApproval';
import ProofUpload from '../ProofUpload/ProofUpload';
import RevenuePieChart from '../RevenuePieChart';
import { storageService } from '../../../services/storageService';
import { useRevenueRules } from '../../../hooks/useRevenueRules';
import { useLedgerEntries } from '../../../hooks/useLedgerEntries';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { PAYMENT_STATUSES, APPROVAL_STATUSES } from '../../../models';
import { paymentService } from '../../../services/paymentService';
import styles from './PaymentDetailsModal.module.css';

const PaymentDetailsModal = ({ 
  isOpen, 
  onClose, 
  payment, 
  onPaymentUpdate 
}) => {
  const [proofFiles, setProofFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [revenueRule, setRevenueRule] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(false);
  
  const { getRevenueRuleById } = useRevenueRules();
  const { getLedgerEntriesByPayment } = useLedgerEntries();
  
  // Load proof files and revenue data when modal opens
  useEffect(() => {
    if (isOpen && payment?.id) {
      loadProofFiles();
      loadRevenueData();
    }
  }, [isOpen, payment?.id]);
  
  const loadProofFiles = async () => {
    if (!payment?.id) return;
    
    setIsLoadingFiles(true);
    try {
      // Get files from Firestore
      const files = await storageService.getPaymentFiles(payment.id);
      
      // Also include proof URLs from payment record if they exist
      const proofUrlFiles = (payment.proofUrls || []).map((url, index) => ({
        id: `proof-url-${index}`,
        url: url,
        name: `Proof ${index + 1}`,
        type: url.includes('.pdf') ? 'application/pdf' : 'image/jpeg',
        size: 0,
        createdAt: payment.createdAt || new Date()
      }));
      
      // Combine both sources, removing duplicates by URL
      const allFiles = [...files, ...proofUrlFiles];
      const uniqueFiles = allFiles.filter((file, index, self) => 
        index === self.findIndex(f => f.url === file.url)
      );
      
      setProofFiles(uniqueFiles);
    } catch (error) {
      console.error('Error loading proof files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };
  
  const loadRevenueData = async () => {
    if (!payment?.id) return;
    
    setIsLoadingRevenue(true);
    try {
      // Load revenue rule if payment has been processed
      if (payment.revenueRuleId) {
        const rule = await getRevenueRuleById(payment.revenueRuleId);
        setRevenueRule(rule);
      }
      
      // Load ledger entries for this payment
      const entries = await getLedgerEntriesByPayment(payment.id);
      setLedgerEntries(entries);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setIsLoadingRevenue(false);
    }
  };
  
  const handleApprovalChange = () => {
    // Refresh payment data in parent component
    onPaymentUpdate?.();
    // Reload revenue data as it might have changed
    loadRevenueData();
  };
  
  const handleFilesChange = (newFiles) => {
    setProofFiles(newFiles);
    // Reload files to get the updated list including new proof URLs
    loadProofFiles();
  };
  
  const getStatusBadge = (status) => {
    const statusConfig = {
      [PAYMENT_STATUSES.COMPLETED]: { class: 'success', label: 'Completed' },
      [PAYMENT_STATUSES.PENDING]: { class: 'warning', label: 'Pending' },
      [PAYMENT_STATUSES.FAILED]: { class: 'danger', label: 'Failed' },
      [PAYMENT_STATUSES.REFUNDED]: { class: 'info', label: 'Refunded' }
    };

    const config = statusConfig[status] || { class: 'default', label: status };
    return (
      <span className={`${styles.statusBadge} ${styles[config.class]}`}>
        {config.label}
      </span>
    );
  };
  
  const getApprovalStatusBadge = () => {
    if (!payment) return null;
    
    const approvalStatus = paymentService.getApprovalStatus(payment);
    const statusConfig = {
      [APPROVAL_STATUSES.VERIFIED]: { 
        class: styles.verified, 
        label: 'Verified', 
        icon: '✅' 
      },
      [APPROVAL_STATUSES.PARTIAL]: { 
        class: styles.partial, 
        label: 'Partial Approval', 
        icon: '⏳' 
      },
      [APPROVAL_STATUSES.PENDING]: { 
        class: styles.pending, 
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
  
  const getRevenueProcessingBadge = () => {
    if (!payment) return null;
    
    if (payment.revenueProcessed) {
      return (
        <span className={`${styles.revenueBadge} ${styles.processed}`}>
          <span className={styles.badgeIcon}>✅</span>
          Revenue Processed
        </span>
      );
    } else if (payment.verified) {
      return (
        <span className={`${styles.revenueBadge} ${styles.pending}`}>
          <span className={styles.badgeIcon}>⏳</span>
          Processing Revenue
        </span>
      );
    } else {
      return (
        <span className={`${styles.revenueBadge} ${styles.notStarted}`}>
          <span className={styles.badgeIcon}>⏸️</span>
          Awaiting Verification
        </span>
      );
    }
  };
  
  if (!payment) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Details"
      size="large"
    >
      <div className={styles.paymentDetails}>
        {/* Payment Header */}
        <div className={styles.paymentHeader}>
          <div className={styles.headerInfo}>
            <h3>{payment.description}</h3>
            <div className={styles.headerMeta}>
              <span className={styles.amount}>
                {formatCurrency(payment.amount, payment.currency)}
              </span>
              <span className={styles.date}>
                {formatDate(payment.paymentDate)}
              </span>
            </div>
          </div>
          <div className={styles.headerBadges}>
            {getStatusBadge(payment.status)}
            {getApprovalStatusBadge()}
            {getRevenueProcessingBadge()}
          </div>
        </div>
        
        {/* Payment Information */}
        <div className={styles.paymentInfo}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Project</label>
              <span>{payment.projectName || 'Unknown Project'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Client</label>
              <span>{payment.clientName || 'Unknown Client'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Payment Method</label>
              <span>{payment.paymentMethod || 'Not specified'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Transaction ID</label>
              <span>{payment.transactionId || 'Not provided'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Created By</label>
              <span>{payment.createdBy}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Created Date</label>
              <span>{formatDate(payment.createdAt)}</span>
            </div>
          </div>
          
          {payment.description && (
            <div className={styles.description}>
              <label>Description</label>
              <p>{payment.description}</p>
            </div>
          )}
        </div>
        
        {/* Approval Section */}
        <div className={styles.section}>
          <PaymentApproval 
            payment={payment}
            onApprovalChange={handleApprovalChange}
          />
        </div>
        
        {/* Revenue Information Section */}
        {(payment.revenueProcessed || payment.verified) && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4>Revenue Information</h4>
              {isLoadingRevenue && <div className={styles.loading}>Loading revenue data...</div>}
            </div>
            
            {payment.revenueProcessed && revenueRule && (
              <div className={styles.revenueContent}>
                <div className={styles.revenueInfo}>
                  <div className={styles.infoItem}>
                    <label>Revenue Rule</label>
                    <span>{revenueRule.ruleName}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Processing Date</label>
                    <span>{formatDate(payment.revenueProcessedAt)}</span>
                  </div>
                </div>
                
                {/* Revenue Pie Chart */}
                <div className={styles.revenueChart}>
                  <RevenuePieChart
                    revenueRule={revenueRule}
                    amount={payment.amount}
                    currency={payment.currency}
                    size="medium"
                    showChart={true}
                    showBreakdown={true}
                  />
                </div>
                
                {/* Associated Ledger Entries */}
                {ledgerEntries.length > 0 && (
                  <div className={styles.ledgerSection}>
                    <h5>Associated Ledger Entries</h5>
                    <div className={styles.ledgerEntries}>
                      {ledgerEntries.map(entry => (
                        <div key={entry.id} className={styles.ledgerEntry}>
                          <div className={styles.entryInfo}>
                            <span className={styles.entryParty}>{entry.party}</span>
                            <span className={styles.entryType}>{entry.type}</span>
                          </div>
                          <div className={styles.entryAmount}>
                            {formatCurrency(entry.amount, entry.currency)}
                          </div>
                          <div className={`${styles.entryStatus} ${styles[entry.status]}`}>
                            {entry.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!payment.revenueProcessed && payment.verified && (
              <div className={styles.pendingRevenue}>
                <div className={styles.pendingIcon}>⏳</div>
                <div className={styles.pendingText}>
                  <h5>Revenue Processing Pending</h5>
                  <p>This payment has been verified and revenue processing will begin shortly.</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Proof Upload Section */}
        <div className={styles.section}>
          {isLoadingFiles ? (
            <div className={styles.loading}>Loading proof files...</div>
          ) : (
            <ProofUpload
              paymentId={payment.id}
              existingFiles={proofFiles}
              onFilesChange={handleFilesChange}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PaymentDetailsModal;