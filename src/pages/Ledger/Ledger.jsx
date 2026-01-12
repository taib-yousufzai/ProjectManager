import { useState, useEffect } from 'react';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import Input from '../../components/common/Input/Input';
import LoadingSkeleton from '../../components/common/LoadingSkeleton/LoadingSkeleton';
import StatsCard from '../../components/common/StatsCard/StatsCard';
import { useLedgerEntries } from '../../hooks/useLedgerEntries';
import { useAuth } from '../../hooks/useAuth';
import { exportLedgerData } from '../../utils/exportUtils';
import { ledgerService } from '../../services/ledgerService';
import { PARTY_TYPES, LEDGER_ENTRY_STATUSES, LEDGER_ENTRY_TYPES } from '../../models';
import styles from './Ledger.module.css';

const Ledger = () => {
  const { user } = useAuth();
  const {
    ledgerEntries,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    updateEntryStatus,
    getPartyBalance,
    refreshLedgerEntries
  } = useLedgerEntries();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [partyBalances, setPartyBalances] = useState({});
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // Load party balances
  useEffect(() => {
    const loadBalances = async () => {
      setBalancesLoading(true);
      try {
        const balances = {};
        for (const party of Object.values(PARTY_TYPES)) {
          const balance = await getPartyBalance(party);
          if (balance) {
            balances[party] = balance;
          }
        }
        setPartyBalances(balances);
      } catch (err) {
        console.error('Error loading balances:', err);
      } finally {
        setBalancesLoading(false);
      }
    };

    loadBalances();
  }, [getPartyBalance, ledgerEntries]); // Reload when entries change

  const handleSearch = (term) => {
    setSearchTerm(term);
    // Filter entries locally by project ID or remarks
    // Note: For production, consider server-side search
  };

  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...filters };
    
    if (value === '' || value === null) {
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = value;
    }
    
    updateFilters(newFilters);
  };

  const handleDateRangeFilter = (startDate, endDate) => {
    if (startDate && endDate) {
      updateFilters({
        ...filters,
        dateRange: {
          start: new Date(startDate),
          end: new Date(endDate)
        }
      });
    } else {
      const newFilters = { ...filters };
      delete newFilters.dateRange;
      updateFilters(newFilters);
    }
  };

  const handleEntrySelection = (entryId, isSelected) => {
    if (isSelected) {
      setSelectedEntries(prev => [...prev, entryId]);
    } else {
      setSelectedEntries(prev => prev.filter(id => id !== entryId));
    }
  };

  const handleSelectAll = () => {
    const pendingEntries = filteredEntries.filter(entry => 
      entry.status === LEDGER_ENTRY_STATUSES.PENDING
    );
    
    if (selectedEntries.length === pendingEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(pendingEntries.map(entry => entry.id));
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedEntries.length === 0) return;

    const promises = selectedEntries.map(entryId => 
      updateEntryStatus(entryId, status)
    );

    await Promise.all(promises);
    setSelectedEntries([]);
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
    return date.toLocaleDateString();
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

  // Filter entries based on search term
  const filteredEntries = ledgerEntries.filter(entry => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.projectId?.toLowerCase().includes(searchLower) ||
      entry.paymentId?.toLowerCase().includes(searchLower) ||
      entry.remarks?.toLowerCase().includes(searchLower) ||
      entry.party.toLowerCase().includes(searchLower)
    );
  });

  // Handle export functionality
  const handleExport = async (format, type = 'comprehensive') => {
    try {
      setExportLoading(true);
      
      let exportData = {};
      
      if (type === 'entries' || type === 'comprehensive') {
        exportData.ledgerEntries = filteredEntries;
      }
      
      if (type === 'settlements' || type === 'comprehensive') {
        // Fetch settlements data
        const settlements = await ledgerService.getSettlements();
        exportData.settlements = settlements;
      }
      
      if (type === 'balances' || type === 'comprehensive') {
        // Convert party balances to array format
        exportData.balances = Object.values(partyBalances);
      }
      
      // Add summary statistics for comprehensive reports
      if (type === 'comprehensive') {
        const totalPending = filteredEntries
          .filter(e => e.status === LEDGER_ENTRY_STATUSES.PENDING)
          .reduce((sum, e) => sum + (e.type === LEDGER_ENTRY_TYPES.CREDIT ? e.amount : -e.amount), 0);
          
        const totalCleared = filteredEntries
          .filter(e => e.status === LEDGER_ENTRY_STATUSES.CLEARED)
          .reduce((sum, e) => sum + (e.type === LEDGER_ENTRY_TYPES.CREDIT ? e.amount : -e.amount), 0);
        
        exportData.summaryStats = {
          totalEntries: filteredEntries.length,
          pendingEntries: filteredEntries.filter(e => e.status === LEDGER_ENTRY_STATUSES.PENDING).length,
          clearedEntries: filteredEntries.filter(e => e.status === LEDGER_ENTRY_STATUSES.CLEARED).length,
          totalSettlements: exportData.settlements?.length || 0,
          totalPendingAmount: Math.round(totalPending * 100) / 100,
          totalClearedAmount: Math.round(totalCleared * 100) / 100
        };
      }
      
      // Include current filters for context
      const currentFilters = {
        ...filters,
        searchTerm: searchTerm || undefined,
        dateRange: filters.dateRange ? {
          start: filters.dateRange.start,
          end: filters.dateRange.end
        } : undefined
      };
      
      await exportLedgerData(exportData, format, type, currentFilters);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const showExportMenu = () => {
    const exportChoice = window.prompt(
      'Choose export type:\n' +
      '1. Current filtered entries only\n' +
      '2. All settlements\n' +
      '3. Party balances\n' +
      '4. Comprehensive report (all data)\n' +
      'Enter 1, 2, 3, or 4:'
    );
    
    if (exportChoice) {
      const formatChoice = window.prompt(
        'Choose format:\n' +
        '1. CSV\n' +
        '2. PDF\n' +
        'Enter 1 or 2:'
      );
      
      if (formatChoice) {
        const format = formatChoice === '1' ? 'CSV' : formatChoice === '2' ? 'PDF' : null;
        const typeMap = {
          '1': 'entries',
          '2': 'settlements', 
          '3': 'balances',
          '4': 'comprehensive'
        };
        
        const type = typeMap[exportChoice];
        
        if (format && type) {
          handleExport(format, type);
        } else {
          alert('Invalid format selection');
        }
      }
    }
  };

  return (
    <div className={styles.ledgerPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Ledger Management</h1>
          <p className={styles.subtitle}>
            Track financial obligations and manage payout settlements
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            onClick={showExportMenu}
            disabled={isLoading || exportLoading}
            className={styles.exportButton}
          >
            {exportLoading ? 'Exporting...' : '📊 Export'}
          </Button>
          <Button
            variant="secondary"
            onClick={refreshLedgerEntries}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <p>Error loading ledger entries: {error}</p>
          <Button variant="secondary" onClick={refreshLedgerEntries}>
            Retry
          </Button>
        </div>
      )}

      {/* Party Balance Cards */}
      <div className={styles.balanceSection}>
        <h2 className={styles.sectionTitle}>Party Balances</h2>
        <div className={styles.balanceGrid}>
          {balancesLoading ? (
            Array.from({ length: 3 }, (_, index) => (
              <LoadingSkeleton key={index} />
            ))
          ) : (
            Object.entries(partyBalances).map(([party, balance]) => (
              <StatsCard
                key={party}
                title={`${party.charAt(0).toUpperCase() + party.slice(1)} Balance`}
                value={formatCurrency(balance.netBalance, balance.currency)}
                subtitle={`Pending: ${formatCurrency(balance.totalPending, balance.currency)}`}
                trend={balance.netBalance > 0 ? 'up' : balance.netBalance < 0 ? 'down' : 'neutral'}
                className={styles.balanceCard}
              />
            ))
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className={styles.controls}>
        <div className={styles.searchSection}>
          <Input
            type="text"
            placeholder="Search by project, payment ID, or remarks..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterSection}>
          <select
            value={filters.party || ''}
            onChange={(e) => handleFilterChange('party', e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Parties</option>
            {Object.values(PARTY_TYPES).map(party => (
              <option key={party} value={party}>
                {party.charAt(0).toUpperCase() + party.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            {Object.values(LEDGER_ENTRY_STATUSES).map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Types</option>
            {Object.values(LEDGER_ENTRY_TYPES).map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            onClick={clearFilters}
            className={styles.clearFiltersBtn}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedEntries.length > 0 && (
        <div className={styles.bulkActions}>
          <span className={styles.selectionCount}>
            {selectedEntries.length} entries selected
          </span>
          <div className={styles.bulkActionButtons}>
            <Button
              variant="success"
              size="small"
              onClick={() => handleBulkStatusUpdate(LEDGER_ENTRY_STATUSES.CLEARED)}
            >
              Mark as Cleared
            </Button>
            <Button
              variant="warning"
              size="small"
              onClick={() => handleBulkStatusUpdate(LEDGER_ENTRY_STATUSES.PENDING)}
            >
              Mark as Pending
            </Button>
            <Button
              variant="outline"
              size="small"
              onClick={() => setSelectedEntries([])}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Ledger Entries Table */}
      <Card className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3>Ledger Entries</h3>
          <div className={styles.tableActions}>
            <Button
              variant="outline"
              size="small"
              onClick={handleSelectAll}
            >
              {selectedEntries.length === filteredEntries.filter(e => 
                e.status === LEDGER_ENTRY_STATUSES.PENDING
              ).length ? 'Deselect All' : 'Select All Pending'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            {Array.from({ length: 5 }, (_, index) => (
              <LoadingSkeleton key={index} />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📊</div>
            <h3>No Ledger Entries Found</h3>
            <p>
              {Object.keys(filters).length > 0 || searchTerm
                ? 'No entries match your current filters.'
                : 'Ledger entries will appear here when payments are processed.'}
            </p>
            {(Object.keys(filters).length > 0 || searchTerm) && (
              <Button variant="outline" onClick={() => {
                clearFilters();
                setSearchTerm('');
              }}>
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.ledgerTable}>
              <thead>
                <tr>
                  <th className={styles.checkboxColumn}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedEntries.length > 0 && 
                        selectedEntries.length === filteredEntries.filter(e => 
                          e.status === LEDGER_ENTRY_STATUSES.PENDING
                        ).length}
                    />
                  </th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Party</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Project</th>
                  <th>Payment</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className={styles.tableRow}>
                    <td className={styles.checkboxColumn}>
                      <input
                        type="checkbox"
                        checked={selectedEntries.includes(entry.id)}
                        onChange={(e) => handleEntrySelection(entry.id, e.target.checked)}
                        disabled={entry.status === LEDGER_ENTRY_STATUSES.CLEARED}
                      />
                    </td>
                    <td>{formatDate(entry.date)}</td>
                    <td>
                      <span className={`${styles.badge} ${getTypeBadgeClass(entry.type)}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getPartyBadgeClass(entry.party)}`}>
                        {entry.party}
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
                        {entry.status}
                      </span>
                    </td>
                    <td className={styles.projectCell}>
                      {entry.projectId ? (
                        <span className={styles.projectId}>{entry.projectId}</span>
                      ) : (
                        <span className={styles.noProject}>Manual Entry</span>
                      )}
                    </td>
                    <td className={styles.paymentCell}>
                      {entry.paymentId ? (
                        <span className={styles.paymentId}>{entry.paymentId}</span>
                      ) : (
                        <span className={styles.noPayment}>-</span>
                      )}
                    </td>
                    <td className={styles.remarksCell}>
                      {entry.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Ledger;