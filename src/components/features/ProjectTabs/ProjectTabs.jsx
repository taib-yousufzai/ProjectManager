import React, { useState } from 'react';
import Card from '../../common/Card/Card';
import Button from '../../common/Button/Button';
import Modal from '../../common/Modal';
import FileUpload from '../FileUpload';
import FilePreview from '../FilePreview';
import PaymentForm from '../PaymentForm/PaymentForm';
import PaymentList from '../PaymentList';
import RevenueBreakdown from '../RevenueBreakdown';
import ProjectTasks from '../ProjectTasks/ProjectTasks';
import ProjectMilestones from '../ProjectMilestones/ProjectMilestones';
import { usePayments } from '../../../hooks/usePayments';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { PROJECT_STATUSES } from '../../../models';
import styles from './ProjectTabs.module.css';

const ProjectTabs = ({ project, files = [], notes = [] }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [projectFiles, setProjectFiles] = useState(files);
  const [paymentFiles, setPaymentFiles] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadContext, setUploadContext] = useState(null);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);

  const { createPayment, payments } = usePayments(project?.id);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'tasks', label: 'Tasks', icon: '✓' },
    { id: 'milestones', label: 'Milestones', icon: '🚩' },
    { id: 'payments', label: 'Payments', icon: '💰' },
    { id: 'revenue', label: 'Revenue', icon: '📊' },
    { id: 'files', label: 'Files', icon: '📁' },
  ];

  const getStatusBadge = (status) => {
    const statusClasses = {
      [PROJECT_STATUSES.ACTIVE]: styles.statusActive,
      [PROJECT_STATUSES.COMPLETED]: styles.statusCompleted,
      [PROJECT_STATUSES.ON_HOLD]: styles.statusOnHold,
      [PROJECT_STATUSES.CANCELLED]: styles.statusCancelled,
    };

    return (
      <span className={`${styles.statusBadge} ${statusClasses[status]}`}>
        {status.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  const calculateProgress = () => {
    // If Manual progress is set
    if (project.progressMethod === 'manual') return project.manualProgress || 0;

    // Default financial progress
    if (!project.budget || project.budget === 0) return 0;
    return Math.min((project.totalPaid / project.budget) * 100, 100);
  };

  const handleCreatePayment = async (paymentData) => {
    const result = await createPayment({
      ...paymentData,
      projectId: project.id,
      clientId: project.clientId
    });
    if (result.success) {
      setIsAddPaymentModalOpen(false);
    }
  };

  // ... (File management functions)
  const handleFileUpload = (file) => {
    if (uploadContext === 'project') {
      setProjectFiles(prev => [...prev, file]);
    } else if (uploadContext) {
      setPaymentFiles(prev => ({
        ...prev,
        [uploadContext]: [...(prev[uploadContext] || []), file]
      }));
    }
  };

  const handleFileRemove = (fileId) => {
    if (uploadContext === 'project') {
      setProjectFiles(prev => prev.filter(f => f.id !== fileId));
    } else if (uploadContext) {
      setPaymentFiles(prev => ({
        ...prev,
        [uploadContext]: (prev[uploadContext] || []).filter(f => f.id !== fileId)
      }));
    }
  };

  const openFilePreview = (file) => {
    setPreviewFile(file);
    setShowFilePreview(true);
  };

  const closeFilePreview = () => {
    setShowFilePreview(false);
    setPreviewFile(null);
  };

  const openFileUpload = (context) => {
    setUploadContext(context);
    setShowFileUpload(true);
  };

  const closeFileUpload = () => {
    setShowFileUpload(false);
    setUploadContext(null);
  };

  const renderOverviewTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.overviewGrid}>
        <Card title="Project Summary" className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Status:</span>
              {getStatusBadge(project.status)}
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Client:</span>
              <span className={styles.summaryValue}>{project.clientName}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Start Date:</span>
              <span className={styles.summaryValue}>{formatDate(project.startDate, 'long')}</span>
            </div>
            {project.endDate && (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>End Date:</span>
                <span className={styles.summaryValue}>{formatDate(project.endDate, 'long')}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Financial Overview" className={styles.financialCard}>
          <div className={styles.financialContent}>
            <div className={styles.financialItem}>
              <span className={styles.financialLabel}>Total Budget:</span>
              <span className={styles.financialValue}>{formatCurrency(project.budget)}</span>
            </div>
            <div className={styles.financialItem}>
              <span className={styles.financialLabel}>Amount Paid:</span>
              <span className={styles.financialValue}>{formatCurrency(project.totalPaid)}</span>
            </div>
            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>Progress:</span>
                <span className={styles.progressPercentage}>{calculateProgress().toFixed(1)}%</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${calculateProgress()}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Description">
        <p className={styles.description}>{project.description}</p>
      </Card>
    </div>
  );

  const renderTasksTab = () => (
    <div className={styles.tabContent}>
      <ProjectTasks projectId={project.id} />
    </div>
  );

  const renderMilestonesTab = () => (
    <div className={styles.tabContent}>
      <ProjectMilestones projectId={project.id} />
    </div>
  );

  const renderPaymentsTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.paymentsHeader}>
        <h3>Payment History</h3>
        <Button
          variant="primary"
          size="small"
          onClick={() => setIsAddPaymentModalOpen(true)}
        >
          Add Payment
        </Button>
      </div>
      <PaymentList projectId={project.id} />
    </div>
  );

  const renderRevenueTab = () => (
    <div className={styles.tabContent}>
      <RevenueBreakdown
        projectId={project.id}
        payments={payments || []}
      />
    </div>
  );

  const renderFilesTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.filesHeader}>
        <h3>Project Files</h3>
        <Button onClick={() => openFileUpload('project')} size="small">Upload File</Button>
      </div>
      <div className={styles.filesGrid}>
        {projectFiles.map(file => (
          <div key={file.id} className={styles.fileItem}>
            <div className={styles.fileName}>{file.name}</div>
            <Button size="small" variant="secondary" onClick={() => window.open(file.url)}>Download</Button>
          </div>
        ))}
        {projectFiles.length === 0 && <p className={styles.emptyState}>No files uploaded.</p>}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'tasks': return renderTasksTab();
      case 'milestones': return renderMilestonesTab();
      case 'payments': return renderPaymentsTab();
      case 'revenue': return renderRevenueTab();
      case 'files': return renderFilesTab();
      default: return renderOverviewTab();
    }
  };

  return (
    <div className={styles.projectTabs}>
      <div className={styles.tabNav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.tabContentContainer}>
        {renderTabContent()}
      </div>

      <Modal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        title="Add Payment"
        size="large"
      >
        <PaymentForm
          onSubmit={handleCreatePayment}
          projectId={project.id}
        />
      </Modal>

      {showFileUpload && (
        <div className={styles.uploadModal}>
          <div className={styles.uploadModalContent}>
            <div className={styles.uploadModalHeader}>
              <h3>Upload Files</h3>
              <Button variant="secondary" onClick={closeFileUpload}>✕</Button>
            </div>
            <FileUpload
              onFileUpload={handleFileUpload}
              onFileRemove={handleFileRemove}
              multiple={true}
              existingFiles={uploadContext === 'project' ? projectFiles : []}
            />
            <div className={styles.uploadModalActions}>
              <Button onClick={closeFileUpload}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTabs;