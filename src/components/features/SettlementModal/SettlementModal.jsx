import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { settlementService } from '../../../services/settlementService';
import { ledgerService } from '../../../services/ledgerService';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Input from '../../common/Input';
import SettlementProofUpload from '../SettlementProofUpload';
import styles from './SettlementModal.module.css';

const SettlementModal = ({ 
  isOpen, 
  onClose, 
  party, 
  selectedEntries = [], 
  onConfirm 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState({ isValid: true, errors: [], warnings: [] });
  const [remarks, setRemarks] = useState('');
  const [proofFiles, setProofFiles] = useState([]);
  const [settlementData, setSettlementData] = useState(null);

  // Calculate settlement totals
  useEffect(() => {
    if (selectedEntries.length > 0) {
      const totalAmount = selectedEntries.reduce((sum, entry) => {
        const amount = entry.type === 'credit' ? entry.amount : -entry.amount;
        return sum + amount;
      }, 0);

      const currency = selectedEntries[0]?.currency || 'USD';
      const ledgerEntryIds = selectedEntries.map(entry => entry.id);

      setSettlementData({
        party,
        ledgerEntryIds,
        totalAmount: Math.round(totalAmount * 100) / 100,
        currency,
        settlementDate: new Date(),
        remarks: remarks.trim() || undefined,
        createdBy: user?.id
      });
    }
  }, [selectedEntries, party, remarks, user?.id]);

  // Validate settlement when data changes
  useEffect(() => {
    if (settlementData && isOpen) {
      validateSettlement();
    }
  }, [settlementData, isOpen]);

  const validateSettlement = async () => {
    if (!settlementData) return;

    setValidating(true);
    try {
      const result = await settlementService.validateSettlementRequest(settlementData);
      setValidation(result);
    } catch (error) {
      console.error('Error validating settlement:', error);
      setValidation({
        isValid: false,
        errors: ['Failed to validate settlement request'],
        warnings: []
      });
    } finally {
      setValidating(false);
    }
  };

  const handleConfirm = async () => {
    if (!settlementData || !validation.isValid) return;

    setLoading(true);
    try {
      let settlement;
      
      if (proofFiles.length > 0) {
        // Process settlement with proof files
        settlement = await settlementService.processSettlementWithProof(
          settlementData,
          proofFiles,
          user.id
        );
      } else {
        // Process settlement without proof
        settlement = await settlementService.createBulkSettlement(
          settlementData,
          user.id
        );
      }

      // Call parent confirmation handler
      await onConfirm(settlement);
      
      // Reset form and close
      handleClose();
    } catch (error) {
      console.error('Error processing settlement:', error);
      alert(`Settlement failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRemarks('');
    setProofFiles([]);
    setValidation({ isValid: true, errors: [], warnings: [] });
    onClose();
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen || !settlementData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Settle ${party.charAt(0).toUpperCase() + party.slice(1)} Payments`}
      size="large"
      className={styles.settlementModal}
    >
      <div className={styles.modalContent}>
        {/* Settlement Summary */}
        <div className={styles.summarySection}>
          <h3>Settlement Summary</h3>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <label>Party</label>
              <span className={styles.partyBadge}>
                {party.charAt(0).toUpperCase() + party.slice(1)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <label>Total Amount</label>
              <span className={styles.totalAmount}>
                {formatCurrency(settlementData.totalAmount, settlementData.currency)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <label>Entries Count</label>
              <span>{selectedEntries.length} entries</span>
            </div>
            <div className={styles.summaryItem}>
              <label>Settlement Date</label>
              <span>{formatDate(settlementData.settlementDate)}</span>
            </div>
          </div>
        </div>

        {/* Selected Entries */}
        <div className={styles.entriesSection}>
          <h3>Selected Ledger Entries</h3>
          <div className={styles.entriesTable}>
            <div className={styles.tableHeader}>
              <span>Date</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Project</span>
              <span>Status</span>
            </div>
            <div className={styles.tableBody}>
              {selectedEntries.map((entry) => (
                <div key={entry.id} className={styles.tableRow}>
                  <span>{formatDate(entry.date)}</span>
                  <span className={`${styles.entryType} ${styles[entry.type]}`}>
                    {entry.type}
                  </span>
                  <span className={styles.amount}>
                    {entry.type === 'credit' ? '+' : '-'}
                    {formatCurrency(entry.amount, entry.currency)}
                  </span>
                  <span>{entry.projectId}</span>
                  <span className={`${styles.status} ${styles[entry.status]}`}>
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settlement Details */}
        <div className={styles.detailsSection}>
          <h3>Settlement Details</h3>
          
          {/* Remarks */}
          <div className={styles.formGroup}>
            <Input
              label="Remarks (Optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about this settlement..."
              multiline
              rows={3}
            />
          </div>

          {/* Proof Upload */}
          <div className={styles.formGroup}>
            <label className={styles.sectionLabel}>Settlement Proof (Optional)</label>
            <p className={styles.sectionDescription}>
              Upload receipts, transfer confirmations, or other proof of settlement
            </p>
            <SettlementProofUpload
              settlementId={`temp-${Date.now()}`} // Temporary ID for pre-settlement uploads
              existingFiles={proofFiles}
              onFilesChange={setProofFiles}
            />
          </div>
        </div>

        {/* Validation Messages */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className={styles.validationSection}>
            {validation.errors.length > 0 && (
              <div className={styles.errorMessages}>
                <h4>Errors</h4>
                <ul>
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className={styles.warningMessages}>
                <h4>Warnings</h4>
                <ul>
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || validating || !validation.isValid}
            loading={loading}
          >
            {loading ? 'Processing Settlement...' : 'Confirm Settlement'}
          </Button>
        </div>

        {/* Loading Overlay */}
        {(loading || validating) && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner}>
              {validating ? 'Validating...' : 'Processing...'}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SettlementModal;