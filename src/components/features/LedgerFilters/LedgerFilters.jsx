import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import { PARTY_TYPES, LEDGER_ENTRY_STATUSES, LEDGER_ENTRY_TYPES } from '../../../models';
import styles from './LedgerFilters.module.css';

const LedgerFilters = ({
  filters = {},
  onFiltersChange,
  onClearFilters,
  isLoading = false,
  availableProjects = [],
  availableCurrencies = ['USD', 'EUR', 'GBP']
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters };
    
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    setLocalFilters(newFilters);
    
    // Apply filters immediately for real-time filtering
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const handleDateRangeChange = (startDate, endDate) => {
    const newFilters = { ...localFilters };
    
    if (startDate && endDate) {
      newFilters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    } else {
      delete newFilters.dateRange;
    }
    
    setLocalFilters(newFilters);
    
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const handleClearAll = () => {
    const clearedFilters = {};
    setLocalFilters(clearedFilters);
    
    if (onClearFilters) {
      onClearFilters();
    } else if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    }
  };

  const getActiveFilterCount = () => {
    return Object.keys(localFilters).length;
  };

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  };

  const hasActiveFilters = getActiveFilterCount() > 0;

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersHeader}>
        <div className={styles.filtersTitle}>
          <h3>Filters</h3>
          {hasActiveFilters && (
            <span className={styles.activeCount}>
              {getActiveFilterCount()} active
            </span>
          )}
        </div>
        <div className={styles.filtersActions}>
          <Button
            variant="outline"
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.expandButton}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="small"
              onClick={handleClearAll}
              disabled={isLoading}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className={`${styles.filtersContent} ${isExpanded ? styles.expanded : ''}`}>
        <div className={styles.filtersGrid}>
          {/* Party Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Party</label>
            <select
              value={localFilters.party || ''}
              onChange={(e) => handleFilterChange('party', e.target.value)}
              className={styles.filterSelect}
              disabled={isLoading}
            >
              <option value="">All Parties</option>
              {Object.values(PARTY_TYPES).map(party => (
                <option key={party} value={party}>
                  {party.charAt(0).toUpperCase() + party.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Status</label>
            <select
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={styles.filterSelect}
              disabled={isLoading}
            >
              <option value="">All Statuses</option>
              {Object.values(LEDGER_ENTRY_STATUSES).map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Type</label>
            <select
              value={localFilters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className={styles.filterSelect}
              disabled={isLoading}
            >
              <option value="">All Types</option>
              {Object.values(LEDGER_ENTRY_TYPES).map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Currency Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Currency</label>
            <select
              value={localFilters.currency || ''}
              onChange={(e) => handleFilterChange('currency', e.target.value)}
              className={styles.filterSelect}
              disabled={isLoading}
            >
              <option value="">All Currencies</option>
              {availableCurrencies.map(currency => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Project</label>
            <select
              value={localFilters.projectId || ''}
              onChange={(e) => handleFilterChange('projectId', e.target.value)}
              className={styles.filterSelect}
              disabled={isLoading}
            >
              <option value="">All Projects</option>
              {availableProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name || project.id}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Range Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Min Amount</label>
            <Input
              type="number"
              placeholder="0.00"
              value={localFilters.minAmount || ''}
              onChange={(e) => handleFilterChange('minAmount', e.target.value ? parseFloat(e.target.value) : null)}
              className={styles.filterInput}
              disabled={isLoading}
              min="0"
              step="0.01"
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Max Amount</label>
            <Input
              type="number"
              placeholder="0.00"
              value={localFilters.maxAmount || ''}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value ? parseFloat(e.target.value) : null)}
              className={styles.filterInput}
              disabled={isLoading}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Date Range Filter */}
        <div className={styles.dateRangeSection}>
          <label className={styles.filterLabel}>Date Range</label>
          <div className={styles.dateRangeInputs}>
            <Input
              type="date"
              placeholder="Start Date"
              value={formatDateForInput(localFilters.dateRange?.start)}
              onChange={(e) => handleDateRangeChange(
                e.target.value, 
                formatDateForInput(localFilters.dateRange?.end)
              )}
              className={styles.dateInput}
              disabled={isLoading}
            />
            <span className={styles.dateRangeSeparator}>to</span>
            <Input
              type="date"
              placeholder="End Date"
              value={formatDateForInput(localFilters.dateRange?.end)}
              onChange={(e) => handleDateRangeChange(
                formatDateForInput(localFilters.dateRange?.start),
                e.target.value
              )}
              className={styles.dateInput}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Quick Filter Presets */}
        <div className={styles.quickFilters}>
          <label className={styles.filterLabel}>Quick Filters</label>
          <div className={styles.quickFilterButtons}>
            <Button
              variant="outline"
              size="small"
              onClick={() => handleFilterChange('status', LEDGER_ENTRY_STATUSES.PENDING)}
              className={localFilters.status === LEDGER_ENTRY_STATUSES.PENDING ? styles.activeQuickFilter : ''}
            >
              Pending Only
            </Button>
            <Button
              variant="outline"
              size="small"
              onClick={() => handleFilterChange('status', LEDGER_ENTRY_STATUSES.CLEARED)}
              className={localFilters.status === LEDGER_ENTRY_STATUSES.CLEARED ? styles.activeQuickFilter : ''}
            >
              Cleared Only
            </Button>
            <Button
              variant="outline"
              size="small"
              onClick={() => handleFilterChange('type', LEDGER_ENTRY_TYPES.CREDIT)}
              className={localFilters.type === LEDGER_ENTRY_TYPES.CREDIT ? styles.activeQuickFilter : ''}
            >
              Credits Only
            </Button>
            <Button
              variant="outline"
              size="small"
              onClick={() => handleDateRangeChange(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                new Date().toISOString().split('T')[0]
              )}
            >
              Last 30 Days
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

LedgerFilters.propTypes = {
  filters: PropTypes.object,
  onFiltersChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func,
  isLoading: PropTypes.bool,
  availableProjects: PropTypes.array,
  availableCurrencies: PropTypes.array
};

export default LedgerFilters;