import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import Button from '../../common/Button/Button';
import { LEDGER_ENTRY_STATUSES, LEDGER_ENTRY_TYPES, PARTY_TYPES } from '../../../models';
import styles from './LedgerTable.module.css';

const LedgerTable = ({
  entries = [],
  onStatusChange,
  onSettlement,
  loading = false,
  selectedEntries = [],
  onEntrySelection,
  onSelectAll
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Sort entries based on current sort configuration
  const sortedEntries = useMemo(() => {
    if (!entries.length) return [];

    return [...entries].sort((a, b) => {
      const { key, direction } = sortConfig;
      let aValue = a[key];
      let bValue = b[key];

      // Handle date sorting
      if (key === 'date') {
        aValue = aValue?.toDate ? aValue.toDate() : new Date(aValue);
        bValue = bValue?.toDate ? bValue.toDate() : new Date(bValue);
      }

      // Handle numeric sorting
      if (key === 'amount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [entries, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEntrySelection = (entryId, isSelected) => {
    if (onEntrySelection) {
      onEntrySelection(entryId, isSelected);
    }
  };

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll();
    }
  };

  const handleStatusChange = async (entryId, newStatus) => {
    if (onStatusChange) {
      await onStatusChange(entryId, newStatus);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    return status === LEDGER_ENTRY_STATUSES.PENDING 
      ? styles.pendingBadge 
      : styles.clearedBadge;
  };

  const getTypeBadgeClass = (type) => {
    return type === LEDGER_ENTRY_TYPES.CREDIT 
      ? styles.creditBadge 
      : styles.debitBadge;
  };

  const getPartyBadgeClass = (party) => {
    switch (party) {
      case PARTY_TYPES.ADMIN:
        return styles.adminBadge;
      case PARTY_TYPES.TEAM:
        return styles.teamBadge;
      case PARTY_TYPES.VENDOR:
        return styles.vendorBadge;
      default:
        return styles.defaultBadge;
    }
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span className={styles.sortIcon}>↕️</span>;
    }
    return sortConfig.direction === 'asc' 
      ? <span className={styles.sortIcon}>↑</span>
      : <span className={styles.sortIcon}>↓</span>;
  };

  const pendingEntries = sortedEntries.filter(entry => 
    entry.status === LEDGER_ENTRY_STATUSES.PENDING
  );

  const allPendingSelected = pendingEntries.length > 0 && 
    pendingEntries.every(entry => selectedEntries.includes(entry.id));

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>Loading ledger entries...</div>
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>📊</div>
        <h3>No Ledger Entries</h3>
        <p>Ledger entries will appear here when payments are processed.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div className={styles.tableTitle}>
          <h3>Ledger Entries ({entries.length})</h3>
        </div>
        <div className={styles.tableActions}>
          {selectedEntries.length > 0 && (
            <div className={styles.bulkActions}>
              <span className={styles.selectionCount}>
                {selectedEntries.length} selected
              </span>
              <Button
                variant="success"
                size="small"
                onClick={() => onSettlement && onSettlement(selectedEntries)}
                disabled={selectedEntries.length === 0}
              >
                Create Settlement
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.ledgerTable}>
          <thead>
            <tr>
              <th className={styles.checkboxColumn}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={allPendingSelected}
                  disabled={pendingEntries.length === 0}
                  title="Select all pending entries"
                />
              </th>
              <th 
                className={styles.sortableColumn}
                onClick={() => handleSort('date')}
              >
                Date {getSortIcon('date')}
              </th>
              <th 
                className={styles.sortableColumn}
                onClick={() => handleSort('type')}
              >
                Type {getSortIcon('type')}
              </th>
              <th 
                className={styles.sortableColumn}
                onClick={() => handleSort('party')}
              >
                Party {getSortIcon('party')}
              </th>
              <th 
                className={styles.sortableColumn}
                onClick={() => handleSort('amount')}
              >
                Amount {getSortIcon('amount')}
              </th>
              <th 
                className={styles.sortableColumn}
                onClick={() => handleSort('status')}
              >
                Status {getSortIcon('status')}
              </th>
              <th>Project</th>
              <th>Payment</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry) => (
              <tr key={entry.id} className={styles.tableRow}>
                <td className={styles.checkboxColumn}>
                  <input
                    type="checkbox"
                    checked={selectedEntries.includes(entry.id)}
                    onChange={(e) => handleEntrySelection(entry.id, e.target.checked)}
                    disabled={entry.status === LEDGER_ENTRY_STATUSES.CLEARED}
                    title={entry.status === LEDGER_ENTRY_STATUSES.CLEARED ? 'Cannot select cleared entries' : 'Select entry'}
                  />
                </td>
                <td className={styles.dateCell}>
                  {formatDate(entry.date)}
                </td>
                <td>
                  <span className={`${styles.badge} ${getTypeBadgeClass(entry.type)}`}>
                    {entry.type.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className={`${styles.badge} ${getPartyBadgeClass(entry.party)}`}>
                    {entry.party.toUpperCase()}
                  </span>
                </td>
                <td className={styles.amountCell}>
                  <span className={entry.type === LEDGER_ENTRY_TYPES.CREDIT ? styles.creditAmount : styles.debitAmount}>
                    {entry.type === LEDGER_ENTRY_TYPES.CREDIT ? '+' : '-'}
                    {formatCurrency(entry.amount, entry.currency)}
                  </span>
                </td>
                <td>
                  <span className={`${styles.badge} ${getStatusBadgeClass(entry.status)}`}>
                    {entry.status.toUpperCase()}
                  </span>
                </td>
                <td className={styles.projectCell}>
                  {entry.projectId ? (
                    <span className={styles.projectId} title={entry.projectId}>
                      {entry.projectId.length > 8 ? `${entry.projectId.substring(0, 8)}...` : entry.projectId}
                    </span>
                  ) : (
                    <span className={styles.noProject}>Manual</span>
                  )}
                </td>
                <td className={styles.paymentCell}>
                  {entry.paymentId ? (
                    <span className={styles.paymentId} title={entry.paymentId}>
                      {entry.paymentId.length > 8 ? `${entry.paymentId.substring(0, 8)}...` : entry.paymentId}
                    </span>
                  ) : (
                    <span className={styles.noPayment}>-</span>
                  )}
                </td>
                <td className={styles.remarksCell}>
                  <span title={entry.remarks}>
                    {entry.remarks ? (
                      entry.remarks.length > 20 ? `${entry.remarks.substring(0, 20)}...` : entry.remarks
                    ) : '-'}
                  </span>
                </td>
                <td className={styles.actionsCell}>
                  {entry.status === LEDGER_ENTRY_STATUSES.PENDING && (
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handleStatusChange(entry.id, LEDGER_ENTRY_STATUSES.CLEARED)}
                    >
                      Mark Cleared
                    </Button>
                  )}
                  {entry.status === LEDGER_ENTRY_STATUSES.CLEARED && entry.settlementId && (
                    <span className={styles.settlementInfo} title={`Settlement: ${entry.settlementId}`}>
                      Settled
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

LedgerTable.propTypes = {
  entries: PropTypes.array,
  onStatusChange: PropTypes.func,
  onSettlement: PropTypes.func,
  loading: PropTypes.bool,
  selectedEntries: PropTypes.array,
  onEntrySelection: PropTypes.func,
  onSelectAll: PropTypes.func
};

export default LedgerTable;