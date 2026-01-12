import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { paymentService } from '../../../services/paymentService';
import Button from '../../common/Button';
import { APPROVAL_STATUSES } from '../../../models';
import styles from './PaymentApproval.module.css';

const PaymentApproval = ({ payment, onApprovalChange }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const approvalStatus = paymentService.getApprovalStatus(payment);
  const approvalProgress = paymentService.getApprovalProgress(payment);
  const hasUserApproved = payment.approvedBy?.includes(user?.id);
  
  const handleApprove = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      await paymentService.approvePayment(payment.id, user.id);
      onApprovalChange?.();
    } catch (error) {
      console.error('Error approving payment:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveApproval = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      await paymentService.removeApproval(payment.id, user.id);
      onApprovalChange?.();
    } catch (error) {
      console.error('Error removing approval:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStatusBadge = () => {
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
    return (
      <span className={`${styles.statusBadge} ${config.class}`}>
        <span className={styles.statusIcon}>{config.icon}</span>
        {config.label}
      </span>
    );
  };
  
  return (
    <div className={styles.approvalSection}>
      <div className={styles.approvalHeader}>
        <h4>Payment Approval</h4>
        {getStatusBadge()}
      </div>
      
      <div className={styles.approvalProgress}>
        <div className={styles.progressInfo}>
          <span className={styles.progressText}>
            {approvalProgress.current} of {approvalProgress.required} approvals
          </span>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ 
                width: `${(approvalProgress.current / approvalProgress.required) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>
      
      {payment.approvedBy?.length > 0 && (
        <div className={styles.approversList}>
          <h5>Approved by:</h5>
          <div className={styles.approvers}>
            {payment.approvedBy.map((approverId, index) => (
              <div key={approverId} className={styles.approver}>
                <div className={styles.approverAvatar}>
                  {approverId.charAt(0).toUpperCase()}
                </div>
                <span className={styles.approverId}>
                  {approverId === user?.id ? 'You' : `User ${index + 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className={styles.approvalActions}>
        {!hasUserApproved ? (
          <Button
            variant="success"
            onClick={handleApprove}
            loading={isLoading}
            disabled={isLoading || approvalStatus === APPROVAL_STATUSES.VERIFIED}
          >
            Mark as Received
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={handleRemoveApproval}
            loading={isLoading}
            disabled={isLoading}
          >
            Remove Approval
          </Button>
        )}
      </div>
      
      {approvalStatus === APPROVAL_STATUSES.VERIFIED && (
        <div className={styles.verifiedMessage}>
          <span className={styles.verifiedIcon}>🎉</span>
          This payment has been verified by {approvalProgress.required} team members
        </div>
      )}
    </div>
  );
};

export default PaymentApproval;