import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../common/Card/Card';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import { PROJECT_STATUS, ROUTES } from '../../../utils/constants';
import { PROJECT_TYPES, BILLING_MODELS, PROGRESS_METHODS } from '../../../models';
import { clientService } from '../../../services/clientService';
import { isValidEmail, generateId } from '../../../utils/helpers';
import styles from './ProjectForm.module.css';

const ProjectForm = ({ initialData = null, onSubmit, loading = false }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');

  const [clients, setClients] = useState([]);
  const [hiddenTeamMembers, setHiddenTeamMembers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    clientId: initialData?.clientId || preselectedClientId || '',
    clientName: initialData?.clientName || '',
    type: initialData?.type || PROJECT_TYPES.STANDARD,
    billingModel: initialData?.billingModel || BILLING_MODELS.FIXED,
    progressMethod: initialData?.progressMethod || PROGRESS_METHODS.TASK,

    budget: initialData?.budget || '',
    monthlyFee: initialData?.recurringConfig?.monthlyFee || '',

    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
    status: initialData?.status || PROJECT_STATUS.ACTIVE,
    teamMembers: '',
    tags: initialData?.tags?.join(', ') || '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    // Initialize team members
    if (initialData?.teamMembers) {
      const visible = initialData.teamMembers.filter(m => m.includes('@'));
      const hidden = initialData.teamMembers.filter(m => !m.includes('@'));

      setFormData(prev => ({ ...prev, teamMembers: visible.join(', ') }));
      setHiddenTeamMembers(hidden);
    } else {
      // Default for new projects
      setFormData(prev => ({ ...prev, teamMembers: 'sumit@gmail.com, yster@gmail.com, taib@gmail.com' }));
    }

    // Fetch clients for dropdown
    const loadClients = async () => {
      try {
        const clientList = await clientService.getAllClients();
        setClients(clientList);

        if (formData.clientId && !formData.clientName) {
          const client = clientList.find(c => c.id === formData.clientId);
          if (client) {
            setFormData(prev => ({ ...prev, clientName: client.companyName }));
          }
        }
      } catch (err) {
        console.error('Failed to load clients', err);
      }
    };
    loadClients();
  }, [initialData, formData.clientId, formData.clientName]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updates = { [field]: value };

      // Auto-update client name if ID changes
      if (field === 'clientId') {
        const client = clients.find(c => c.id === value);
        if (client) updates.clientName = client.companyName;
      }

      // Auto-set defaults based on type/billing
      if (field === 'type' && value === PROJECT_TYPES.MARKETING) {
        updates.billingModel = BILLING_MODELS.RECURRING;
        updates.progressMethod = PROGRESS_METHODS.TIME;
      }

      return { ...prev, ...updates };
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field, value) => {
    let error = '';
    switch (field) {
      case 'name':
        if (!value.trim()) error = 'Project name is required';
        break;
      case 'clientId':
        if (!value) error = 'Client is required';
        break;
      case 'budget':
        if (formData.billingModel === BILLING_MODELS.FIXED && !value) error = 'Budget is required';
        break;
      case 'monthlyFee':
        if (formData.billingModel === BILLING_MODELS.RECURRING && !value) error = 'Monthly Fee is required';
        break;
      case 'startDate':
        if (!value) error = 'Start date is required';
        break;
      // ... other validations
      default: break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
    return error === '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Simple validation check
    const requiredFields = ['name', 'clientId', 'startDate'];
    let valid = true;
    requiredFields.forEach(f => {
      if (!validateField(f, formData[f])) valid = false;
    });

    if (!valid) return;

    // Combine visible emails with hidden UIDs
    const visibleMembers = formData.teamMembers.split(',').map(e => e.trim()).filter(Boolean);
    const finalTeamMembers = [...new Set([...visibleMembers, ...hiddenTeamMembers])]; // Dedupe

    const projectData = {
      id: initialData?.id || generateId(),
      ...formData,
      budget: parseFloat(formData.budget) || 0,
      recurringConfig: formData.billingModel === BILLING_MODELS.RECURRING ? {
        monthlyFee: parseFloat(formData.monthlyFee) || 0,
        startDate: new Date(formData.startDate)
      } : null,
      teamMembers: finalTeamMembers,
      tags: formData.tags.split(',').map(e => e.trim()).filter(Boolean),
      updatedAt: new Date(),
      createdAt: initialData?.createdAt || new Date(),
    };

    try {
      if (onSubmit) {
        await onSubmit(projectData);
      } else {
        console.log('Submitting:', projectData);
        navigate(ROUTES.PROJECTS);
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h3>Basic Info</h3>
          <div className={styles.grid}>
            <Input
              label="Project Name"
              value={formData.name}
              onChange={v => handleChange('name', v)}
              onBlur={() => handleBlur('name')}
              error={errors.name}
              required
            />

            <div className={styles.formGroup}>
              <label>Client</label>
              <select
                value={formData.clientId}
                onChange={e => handleChange('clientId', e.target.value)}
                className={styles.select}
              >
                <option value="">Select a Client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
              {errors.clientId && <div className={styles.error}>{errors.clientId}</div>}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              className={styles.textarea}
              rows={3}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3>Configuration</h3>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>Project Type</label>
              <select
                value={formData.type}
                onChange={e => handleChange('type', e.target.value)}
                className={styles.select}
              >
                <option value={PROJECT_TYPES.STANDARD}>Standard Project</option>
                <option value={PROJECT_TYPES.MARKETING}>Digital Marketing (Retainer)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Billing Model</label>
              <select
                value={formData.billingModel}
                onChange={e => handleChange('billingModel', e.target.value)}
                className={styles.select}
              >
                <option value={BILLING_MODELS.FIXED}>Fixed Price</option>
                <option value={BILLING_MODELS.RECURRING}>Monthly Retainer</option>
                <option value={BILLING_MODELS.HOURLY}>Hourly</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Progress Tracking</label>
              <select
                value={formData.progressMethod}
                onChange={e => handleChange('progressMethod', e.target.value)}
                className={styles.select}
              >
                <option value={PROGRESS_METHODS.TASK}>Task Based (% completed)</option>
                <option value={PROGRESS_METHODS.MILESTONE}>Milestone Based (% value)</option>
                <option value={PROGRESS_METHODS.MANUAL}>Manual Entry</option>
                <option value={PROGRESS_METHODS.TIME}>Time Based (Months)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Financials & Timeline</h3>
          <div className={styles.grid}>
            {formData.billingModel === BILLING_MODELS.RECURRING ? (
              <Input
                label="Monthly Fee"
                type="number"
                value={formData.monthlyFee}
                onChange={v => handleChange('monthlyFee', v)}
                required
              />
            ) : (
              <Input
                label="Total Budget"
                type="number"
                value={formData.budget}
                onChange={v => handleChange('budget', v)}
                required
              />
            )}

            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={v => handleChange('startDate', v)}
              required
            />

            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={v => handleChange('endDate', v)}
              helperText="Optional"
            />
          </div>
        </div>

        <div className={styles.section}>
          <Input
            label="Team Members (emails)"
            value={formData.teamMembers}
            onChange={v => handleChange('teamMembers', v)}
          />
          <Input
            label="Tags"
            value={formData.tags}
            onChange={v => handleChange('tags', v)}
          />
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.PROJECTS)}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading}>
            {initialData ? 'Update Project' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ProjectForm;