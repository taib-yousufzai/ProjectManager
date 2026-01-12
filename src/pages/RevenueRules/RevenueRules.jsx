import { useState } from 'react';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import Input from '../../components/common/Input/Input';
import LoadingSkeleton from '../../components/common/LoadingSkeleton/LoadingSkeleton';
import RevenueRuleForm from '../../components/features/RevenueRuleForm/RevenueRuleForm';
import { useRevenueRules } from '../../hooks/useRevenueRules';
import styles from './RevenueRules.module.css';

const RevenueRules = () => {
  const { 
    revenueRules, 
    isLoading, 
    error, 
    createRevenueRule,
    updateRevenueRule,
    deleteRevenueRule,
    searchRevenueRules,
    refreshRevenueRules 
  } = useRevenueRules();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ activeOnly: false });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const handleSearch = (term) => {
    setSearchTerm(term);
    searchRevenueRules(term, filters);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    searchRevenueRules(searchTerm, newFilters);
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowCreateForm(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setShowCreateForm(true);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setEditingRule(null);
  };

  const handleSaveRule = async (ruleData) => {
    setFormLoading(true);
    try {
      if (editingRule) {
        // Update existing rule
        const result = await updateRevenueRule(editingRule.id, ruleData);
        if (result.success) {
          handleCloseForm();
        }
      } else {
        // Create new rule
        const result = await createRevenueRule(ruleData);
        if (result.success) {
          handleCloseForm();
        }
      }
    } catch (error) {
      console.error('Error saving revenue rule:', error);
      // Error handling is managed by the useRevenueRules hook
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('Are you sure you want to delete this revenue rule? This action cannot be undone.')) {
      await deleteRevenueRule(ruleId);
    }
  };

  const handleToggleRuleStatus = async (rule) => {
    const newStatus = !rule.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (window.confirm(`Are you sure you want to ${action} this revenue rule?`)) {
      const result = await updateRevenueRule(rule.id, { isActive: newStatus });
      if (!result.success) {
        console.error(`Failed to ${action} rule:`, result.error);
      }
    }
  };

  const handleSetDefaultRule = async (rule) => {
    if (rule.isDefault) {
      // Cannot unset default rule directly
      return;
    }
    
    if (window.confirm('Are you sure you want to set this as the default revenue rule? This will unset any other default rule.')) {
      const result = await updateRevenueRule(rule.id, { isDefault: true, isActive: true });
      if (!result.success) {
        console.error('Failed to set default rule:', result.error);
      }
    }
  };

  const formatPercentage = (value) => {
    return `${value}%`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className={styles.revenueRulesPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Revenue Rules</h1>
          <p className={styles.subtitle}>
            Manage how payments are automatically split between different parties
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="primary"
            onClick={handleCreateRule}
          >
            Create New Rule
          </Button>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <p>Error loading revenue rules: {error}</p>
          <Button variant="secondary" onClick={refreshRevenueRules}>
            Retry
          </Button>
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.searchSection}>
          <Input
            type="text"
            placeholder="Search revenue rules..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterSection}>
          <label className={styles.filterLabel}>
            <input
              type="checkbox"
              checked={filters.activeOnly}
              onChange={(e) => handleFilterChange({ ...filters, activeOnly: e.target.checked })}
            />
            Show active rules only
          </label>
        </div>
      </div>

      <div className={styles.rulesGrid}>
        {isLoading ? (
          // Show loading skeletons
          Array.from({ length: 3 }, (_, index) => (
            <LoadingSkeleton key={index} />
          ))
        ) : revenueRules.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📊</div>
            <h3>No Revenue Rules Found</h3>
            <p>Create your first revenue rule to start automatically splitting payments.</p>
            <Button variant="primary" onClick={handleCreateRule}>
              Create Revenue Rule
            </Button>
          </div>
        ) : (
          revenueRules.map((rule) => (
            <Card key={rule.id} className={styles.ruleCard}>
              <div className={styles.ruleHeader}>
                <div className={styles.ruleTitle}>
                  <h3>{rule.ruleName}</h3>
                  <div className={styles.ruleBadges}>
                    {rule.isDefault && (
                      <span className={`${styles.badge} ${styles.defaultBadge}`}>
                        Default
                      </span>
                    )}
                    <span className={`${styles.badge} ${rule.isActive ? styles.activeBadge : styles.inactiveBadge}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className={styles.ruleActions}>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleEditRule(rule)}
                  >
                    Edit
                  </Button>
                  
                  {!rule.isDefault && (
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handleSetDefaultRule(rule)}
                      disabled={!rule.isActive}
                    >
                      Set Default
                    </Button>
                  )}
                  
                  <Button
                    variant={rule.isActive ? "warning" : "success"}
                    size="small"
                    onClick={() => handleToggleRuleStatus(rule)}
                  >
                    {rule.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  
                  {!rule.isDefault && (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <div className={styles.ruleContent}>
                <div className={styles.percentageBreakdown}>
                  <div className={styles.percentageItem}>
                    <span className={styles.percentageLabel}>Admin</span>
                    <span className={styles.percentageValue}>
                      {formatPercentage(rule.adminPercent)}
                    </span>
                  </div>
                  <div className={styles.percentageItem}>
                    <span className={styles.percentageLabel}>Team</span>
                    <span className={styles.percentageValue}>
                      {formatPercentage(rule.teamPercent)}
                    </span>
                  </div>
                  {rule.vendorPercent > 0 && (
                    <div className={styles.percentageItem}>
                      <span className={styles.percentageLabel}>Vendor</span>
                      <span className={styles.percentageValue}>
                        {formatPercentage(rule.vendorPercent)}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.ruleMetadata}>
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Created:</span>
                    <span className={styles.metadataValue}>
                      {formatDate(rule.createdAt)}
                    </span>
                  </div>
                  {rule.updatedAt && rule.updatedAt !== rule.createdAt && (
                    <div className={styles.metadataItem}>
                      <span className={styles.metadataLabel}>Updated:</span>
                      <span className={styles.metadataValue}>
                        {formatDate(rule.updatedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Revenue Rule Form Modal */}
      {showCreateForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingRule ? 'Edit Revenue Rule' : 'Create Revenue Rule'}</h2>
              <Button
                variant="secondary"
                size="small"
                onClick={handleCloseForm}
                disabled={formLoading}
                className={styles.closeButton}
              >
                ✕
              </Button>
            </div>
            <RevenueRuleForm
              rule={editingRule}
              onSave={handleSaveRule}
              onCancel={handleCloseForm}
              isLoading={formLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueRules;