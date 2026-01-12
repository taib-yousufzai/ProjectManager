import React, { useState, useEffect } from 'react';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import PercentageSlider from '../../common/PercentageSlider/PercentageSlider';
import { useRevenueRules } from '../../../hooks/useRevenueRules';
import styles from './RevenueRuleForm.module.css';

const RevenueRuleForm = ({
  rule = null,
  onSave,
  onCancel,
  isLoading = false
}) => {
  // Form state
  const [formData, setFormData] = useState({
    ruleName: '',
    adminPercent: 0,
    teamPercent: 0,
    vendorPercent: 0,
    isDefault: false,
    isActive: true
  });

  // Validation errors
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showHistoricalWarning, setShowHistoricalWarning] = useState(false);
  const [hasHistoricalData, setHasHistoricalData] = useState(false);

  // Initialize form data when rule prop changes
  useEffect(() => {
    if (rule) {
      setFormData({
        ruleName: rule.ruleName || '',
        adminPercent: rule.adminPercent || 0,
        teamPercent: rule.teamPercent || 0,
        vendorPercent: rule.vendorPercent || 0,
        isDefault: rule.isDefault || false,
        isActive: rule.isActive !== undefined ? rule.isActive : true
      });
      
      // Check if this rule has historical data (simulated check)
      // In a real implementation, this would query the ledger entries
      setHasHistoricalData(rule.createdAt && new Date(rule.createdAt.toDate ? rule.createdAt.toDate() : rule.createdAt) < new Date(Date.now() - 24 * 60 * 60 * 1000));
    } else {
      // Reset form for new rule
      setFormData({
        ruleName: '',
        adminPercent: 0,
        teamPercent: 0,
        vendorPercent: 0,
        isDefault: false,
        isActive: true
      });
      setHasHistoricalData(false);
    }
    
    // Clear errors and touched state when rule changes
    setErrors({});
    setTouched({});
    setShowHistoricalWarning(false);
  }, [rule]);

  // Handle input changes
  const handleChange = (field, value) => {
    let processedValue = value;
    
    // Convert percentage inputs to numbers
    if (['adminPercent', 'teamPercent', 'vendorPercent'].includes(field)) {
      processedValue = value === '' ? 0 : parseFloat(value) || 0;
      // Ensure percentage is within valid range
      processedValue = Math.max(0, Math.min(100, processedValue));
      
      // Show historical warning if editing percentages on existing rule with historical data
      if (rule && hasHistoricalData && !showHistoricalWarning) {
        const originalValue = rule[field] || 0;
        if (Math.abs(originalValue - processedValue) > 0.01) {
          setShowHistoricalWarning(true);
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Real-time percentage validation
    if (['adminPercent', 'teamPercent', 'vendorPercent'].includes(field)) {
      validatePercentageTotal({ ...formData, [field]: processedValue });
    }
  };

  // Handle field blur (for validation)
  const handleBlur = (field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    validateField(field, formData[field]);
  };

  // Validate individual field
  const validateField = (field, value) => {
    let error = '';

    switch (field) {
      case 'ruleName':
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          error = 'Rule name is required';
        } else if (value.trim().length < 3) {
          error = 'Rule name must be at least 3 characters long';
        }
        break;

      case 'adminPercent':
      case 'teamPercent':
      case 'vendorPercent':
        if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 100) {
          error = 'Percentage must be a number between 0 and 100';
        }
        break;

      default:
        break;
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }));

    return error === '';
  };

  // Validate percentage total
  const validatePercentageTotal = (data = formData) => {
    const total = data.adminPercent + data.teamPercent + data.vendorPercent;
    const isValid = Math.abs(total - 100) < 0.01;
    
    const error = isValid ? '' : `Total percentages must equal 100% (currently ${total.toFixed(1)}%)`;
    
    setErrors(prev => ({
      ...prev,
      percentageTotal: error
    }));

    return isValid;
  };

  // Validate entire form
  const validateForm = () => {
    const fields = ['ruleName', 'adminPercent', 'teamPercent', 'vendorPercent'];
    let isValid = true;

    // Validate individual fields
    fields.forEach(field => {
      const fieldValid = validateField(field, formData[field]);
      if (!fieldValid) {
        isValid = false;
      }
    });

    // Validate percentage total
    const percentageValid = validatePercentageTotal();
    if (!percentageValid) {
      isValid = false;
    }

    // Mark all fields as touched to show errors
    const touchedFields = {};
    fields.forEach(field => {
      touchedFields[field] = true;
    });
    touchedFields.percentageTotal = true;
    setTouched(touchedFields);

    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving revenue rule:', error);
      // Error handling is managed by the parent component through useRevenueRules hook
    }
  };

  // Calculate remaining percentage for visual feedback
  const getRemainingPercentage = () => {
    const total = formData.adminPercent + formData.teamPercent + formData.vendorPercent;
    return 100 - total;
  };

  // Get percentage total status for styling
  const getPercentageTotalStatus = () => {
    const remaining = getRemainingPercentage();
    if (Math.abs(remaining) < 0.01) return 'valid';
    if (remaining > 0) return 'under';
    return 'over';
  };

  return (
    <div className={styles.revenueRuleForm}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Rule Name Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Rule Information</h3>
          
          <div className={styles.formField}>
            <Input
              label="Rule Name"
              type="text"
              value={formData.ruleName}
              onChange={(value) => handleChange('ruleName', value)}
              onBlur={() => handleBlur('ruleName')}
              error={touched.ruleName ? errors.ruleName : ''}
              placeholder="Enter a descriptive name for this rule"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Historical Data Warning */}
        {showHistoricalWarning && rule && hasHistoricalData && (
          <div className={styles.warningSection}>
            <div className={styles.warningIcon}>⚠️</div>
            <div className={styles.warningContent}>
              <h4 className={styles.warningTitle}>Historical Data Preservation</h4>
              <p className={styles.warningText}>
                This rule has been used for previous payments. Modifying percentages will only affect 
                future payments. Existing ledger entries will remain unchanged to preserve historical accuracy.
              </p>
              <div className={styles.warningActions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setShowHistoricalWarning(false)}
                >
                  I Understand
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Percentage Distribution Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Revenue Distribution</h3>
          
          <div className={styles.percentageGrid}>
            <div className={styles.formField}>
              <PercentageSlider
                label="Admin Percentage"
                value={formData.adminPercent}
                onChange={(value) => handleChange('adminPercent', value)}
                error={touched.adminPercent ? errors.adminPercent : ''}
                disabled={isLoading}
                helperText="Percentage allocated to admin/management"
              />
            </div>

            <div className={styles.formField}>
              <PercentageSlider
                label="Team Percentage"
                value={formData.teamPercent}
                onChange={(value) => handleChange('teamPercent', value)}
                error={touched.teamPercent ? errors.teamPercent : ''}
                disabled={isLoading}
                helperText="Percentage allocated to team members"
              />
            </div>

            <div className={styles.formField}>
              <PercentageSlider
                label="Vendor Percentage"
                value={formData.vendorPercent}
                onChange={(value) => handleChange('vendorPercent', value)}
                error={touched.vendorPercent ? errors.vendorPercent : ''}
                disabled={isLoading}
                helperText="Optional - percentage for external vendors"
              />
            </div>
          </div>

          {/* Percentage Total Indicator */}
          <div className={`${styles.percentageTotal} ${styles[`percentageTotal--${getPercentageTotalStatus()}`]}`}>
            <div className={styles.percentageTotalLabel}>
              Total: {(formData.adminPercent + formData.teamPercent + formData.vendorPercent).toFixed(1)}%
            </div>
            <div className={styles.percentageTotalRemaining}>
              Remaining: {getRemainingPercentage().toFixed(1)}%
            </div>
            {touched.percentageTotal && errors.percentageTotal && (
              <div className={styles.percentageTotalError}>
                {errors.percentageTotal}
              </div>
            )}
          </div>
        </div>

        {/* Rule Settings Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Rule Settings</h3>
          
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => handleChange('isDefault', e.target.checked)}
                disabled={isLoading}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>
                Set as default rule
              </span>
              <span className={styles.checkboxHelper}>
                This rule will be used for new payments when no specific rule is assigned. 
                {formData.isDefault && ' Only one rule can be set as default at a time.'}
              </span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                disabled={isLoading}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>
                Active rule
              </span>
              <span className={styles.checkboxHelper}>
                Only active rules can be used for revenue processing. 
                {!formData.isActive && ' Inactive rules are preserved for historical reference.'}
              </span>
            </label>
          </div>

          {/* Rule Management Actions */}
          {rule && (
            <div className={styles.managementSection}>
              <h4 className={styles.managementTitle}>Rule Management</h4>
              <div className={styles.managementGrid}>
                <div className={styles.managementItem}>
                  <span className={styles.managementLabel}>Created:</span>
                  <span className={styles.managementValue}>
                    {rule.createdAt ? new Date(rule.createdAt.toDate ? rule.createdAt.toDate() : rule.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                {rule.updatedAt && rule.updatedAt !== rule.createdAt && (
                  <div className={styles.managementItem}>
                    <span className={styles.managementLabel}>Last Modified:</span>
                    <span className={styles.managementValue}>
                      {new Date(rule.updatedAt.toDate ? rule.updatedAt.toDate() : rule.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className={styles.managementItem}>
                  <span className={styles.managementLabel}>Status:</span>
                  <span className={`${styles.managementValue} ${styles[`status--${rule.isActive ? 'active' : 'inactive'}`]}`}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                    {rule.isDefault && ' • Default'}
                  </span>
                </div>
                {hasHistoricalData && (
                  <div className={styles.managementItem}>
                    <span className={styles.managementLabel}>Historical Data:</span>
                    <span className={styles.managementValue}>
                      ⚠️ Has been used for previous payments
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className={styles.formActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={isLoading}
          >
            {rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RevenueRuleForm;