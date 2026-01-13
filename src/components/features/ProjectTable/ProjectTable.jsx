import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../common/Card/Card';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import { TableSkeleton } from '../../common/LoadingSkeleton';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { PROJECT_STATUS, ROUTES } from '../../../utils/constants';
import styles from './ProjectTable.module.css';

const ProjectTable = ({ projects = [], loading = false, onDelete }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleDelete = async (e, projectId, projectName) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      if (onDelete) {
        await onDelete(projectId);
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      [PROJECT_STATUS.ACTIVE]: styles.statusActive,
      [PROJECT_STATUS.COMPLETED]: styles.statusCompleted,
      [PROJECT_STATUS.ON_HOLD]: styles.statusOnHold,
      [PROJECT_STATUS.CANCELLED]: styles.statusCancelled,
    };

    return (
      <span className={`${styles.statusBadge} ${statusClasses[status]}`}>
        {status.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={styles.projectTable}>
        <Card className={styles.filtersCard}>
          <div className={styles.filters}>
            <div className={styles.searchSection}>
              <Input
                type="text"
                placeholder="Search projects..."
                value=""
                onChange={() => { }}
                className={styles.searchInput}
                disabled
              />
            </div>

            <div className={styles.filterSection}>
              <label className={styles.filterLabel}>Status:</label>
              <select className={styles.filterSelect} disabled>
                <option>Loading...</option>
              </select>
            </div>

            <div className={styles.resultsCount}>Loading...</div>
          </div>
        </Card>

        <TableSkeleton rows={5} columns={7} />
      </div>
    );
  }

  return (
    <div className={styles.projectTable}>
      {/* Filters and Search */}
      <Card className={styles.filtersCard}>
        <div className={styles.filters}>
          <div className={styles.searchSection}>
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={setSearchTerm}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterSection}>
            <label htmlFor="status-filter" className={styles.filterLabel}>
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value={PROJECT_STATUS.ACTIVE}>Active</option>
              <option value={PROJECT_STATUS.COMPLETED}>Completed</option>
              <option value={PROJECT_STATUS.ON_HOLD}>On Hold</option>
              <option value={PROJECT_STATUS.CANCELLED}>Cancelled</option>
            </select>
          </div>

          <div className={styles.resultsCount}>
            {filteredProjects.length} of {projects.length} projects
          </div>
        </div>
      </Card>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <div className={styles.emptyState}>
            <h3>No projects found</h3>
            <p>
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first project'
              }
            </p>
            <Button
              variant="primary"
              onClick={() => navigate(ROUTES.ADD_PROJECT)}
            >
              Add New Project
            </Button>
          </div>
        </Card>
      ) : (
        <div className={styles.projectGrid}>
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className={styles.projectCard}
            >
              <div
                className={styles.cardHeader}
                onClick={() => handleProjectClick(project.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.cardTitle}>
                  <h3>{project.name}</h3>
                  <p className={styles.clientName}>{project.clientName}</p>
                </div>
                {getStatusBadge(project.status)}
              </div>

              <p className={styles.description}>{project.description}</p>

              <div className={styles.cardDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Start Date:</span>
                  <span className={styles.detailValue}>{formatDate(project.startDate)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Budget:</span>
                  <span className={styles.detailValue}>{formatCurrency(project.budget)}</span>
                </div>
              </div>

              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressLabel}>Payment Progress</span>
                  <span className={styles.progressValue}>
                    {formatCurrency(project.totalPaid)} / {formatCurrency(project.budget)}
                  </span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div
                    className={styles.progressBar}
                    style={{
                      width: `${Math.min((project.totalPaid / project.budget) * 100, 100)}%`
                    }}
                  />
                </div>
                <span className={styles.progressPercentage}>
                  {Math.round((project.totalPaid / project.budget) * 100)}% Paid
                </span>
              </div>

              <div className={styles.cardActions}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectClick(project.id);
                  }}
                >
                  View Details
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(e, project.id, project.name);
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectTable;