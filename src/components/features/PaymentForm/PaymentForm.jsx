import { useState, useEffect } from 'react';
import { useProjects } from '../../../hooks/useProjects';
import Input from '../../common/Input';
import Button from '../../common/Button';
import Card from '../../common/Card';
import { PAYMENT_STATUSES } from '../../../models';
import styles from './PaymentForm.module.css';

const PaymentForm = ({
  onSubmit,
  loading = false,
  initialData = null,
  projectId = null // If provided, payment is for specific project
}) => {
  const { projects } = useProjects();
  const [formData, setFormData] = useState({
    projectId: projectId || '',
    amount: '',
    currency: 'INR',
    status: PAYMENT_STATUSES.PENDING,
    paymentDate: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: '',
    transactionId: ''
  });
  const [errors, setErrors] = useState({});

  // Populate form with initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        projectId: initialData.projectId || projectId || '',
        amount: initialData.amount?.toString() || '',
        currency: initialData.currency || 'INR',
        status: initialData.status || PAYMENT_STATUSES.PENDING,
        paymentDate: initialData.paymentDate ?
          new Date(initialData.paymentDate).toISOString().split('T')[0] :
          new Date().toISOString().split('T')[0],
        description: initialData.description || '',
        paymentMethod: initialData.paymentMethod || '',
        transactionId: initialData.transactionId || ''
      });
    }
  }, [initialData, projectId]);

  const validateForm = () => {
    const newErrors = {};

    // Project validation (only if not pre-selected)
    if (!projectId && !formData.projectId) {
      newErrors.projectId = 'Please select a project';
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }

    // Payment date validation
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const paymentData = {
      ...formData,
      amount: parseFloat(formData.amount),
      paymentDate: new Date(formData.paymentDate)
    };

    await onSubmit(paymentData);
  };

  const statusOptions = [
    { value: PAYMENT_STATUSES.PENDING, label: 'Pending' },
    { value: PAYMENT_STATUSES.COMPLETED, label: 'Completed' },
    { value: PAYMENT_STATUSES.FAILED, label: 'Failed' },
    { value: PAYMENT_STATUSES.REFUNDED, label: 'Refunded' }
  ];

  const currencyOptions = [
    { value: 'INR', label: 'INR (₹)' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'CAD', label: 'CAD (C$)' }
  ];

  return (
    <Card title={initialData ? 'Edit Payment' : 'Add New Payment'}>
      <form className={styles.paymentForm} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {/* Project Selection (only show if not pre-selected) */}
          {!projectId && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Project <span className={styles.required}>*</span>
              </label>
              <select
                className={`${styles.select} ${errors.projectId ? styles.error : ''}`}
                value={formData.projectId}
                onChange={(e) => handleInputChange('projectId', e.target.value)}
                disabled={loading}
              >
                <option value="">Select a project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} - {project.clientName}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <span className={styles.errorText}>{errors.projectId}</span>
              )}
            </div>
          )}

          {/* Amount and Currency */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <Input
                type="number"
                label="Amount"
                placeholder="0.00"
                value={formData.amount}
                onChange={(value) => handleInputChange('amount', value)}
                error={errors.amount}
                required
                disabled={loading}
                step="0.01"
                min="0"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Currency</label>
              <select
                className={styles.select}
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                disabled={loading}
              >
                {currencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status and Payment Date */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Status</label>
              <select
                className={styles.select}
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={loading}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <Input
                type="date"
                label="Payment Date"
                value={formData.paymentDate}
                onChange={(value) => handleInputChange('paymentDate', value)}
                error={errors.paymentDate}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Description <span className={styles.required}>*</span>
            </label>
            <textarea
              className={`${styles.textarea} ${errors.description ? styles.error : ''}`}
              placeholder="Enter payment description..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={loading}
              rows={3}
            />
            {errors.description && (
              <span className={styles.errorText}>{errors.description}</span>
            )}
          </div>

          {/* Payment Method and Transaction ID */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <Input
                type="text"
                label="Payment Method"
                placeholder="e.g., Bank Transfer, PayPal, Stripe"
                value={formData.paymentMethod}
                onChange={(value) => handleInputChange('paymentMethod', value)}
                disabled={loading}
              />
            </div>
            <div className={styles.formGroup}>
              <Input
                type="text"
                label="Transaction ID"
                placeholder="Optional transaction reference"
                value={formData.transactionId}
                onChange={(value) => handleInputChange('transactionId', value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className={styles.formActions}>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Saving...' : (initialData ? 'Update Payment' : 'Create Payment')}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default PaymentForm;