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
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort projects
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle date sorting
        if (sortConfig.key === 'startDate' || sortConfig.key === 'endDate') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        // Handle string sorting
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [projects, searchTerm, statusFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleProjectClick = (projectId) => {
    navigate(ROUTES.PROJECT_DETAILS.replace(':id', projectId));
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

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span className={styles.sortIcon}>↕</span>;
    }
    return (
      <span className={styles.sortIcon}>
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
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
            {filteredAndSortedProjects.length} of {projects.length} projects
          </div>
        </div>
      </Card>

      {/* Projects Table */}
      <Card>
        {filteredAndSortedProjects.length === 0 ? (
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
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th
                    className={styles.sortableHeader}
                    onClick={() => handleSort('name')}
                  >
                    Project Name {getSortIcon('name')}
                  </th>
                  <th
                    className={styles.sortableHeader}
                    onClick={() => handleSort('clientName')}
                  >
                    Client {getSortIcon('clientName')}
                  </th>
                  <th
                    className={styles.sortableHeader}
                    onClick={() => handleSort('status')}
                  >
                    Status {getSortIcon('status')}
                  </th>
                  <th
                    className={styles.sortableHeader}
                    onClick={() => handleSort('startDate')}
                  >
                    Start Date {getSortIcon('startDate')}
                  </th>
                  <th
                    className={styles.sortableHeader}
                    onClick={() => handleSort('budget')}
                  >
                    Budget {getSortIcon('budget')}
                  </th>
                  <th
                    className={styles.sortableHeader}
                    onClick={() => handleSort('totalPaid')}
                  >
                    Paid {getSortIcon('totalPaid')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProjects.map((project) => (
                  <tr
                    key={project.id}
                    className={styles.tableRow}
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <td className={styles.projectName}>
                      <div>
                        <strong>{project.name}</strong>
                        <div className={styles.projectDescription}>
                          {project.description}
                        </div>
                      </div>
                    </td>
                    <td>{project.clientName}</td>
                    <td>{getStatusBadge(project.status)}</td>
                    <td>{formatDate(project.startDate)}</td>
                    <td>{formatCurrency(project.budget)}</td>
                    <td>
                      <div className={styles.paymentInfo}>
                        {formatCurrency(project.totalPaid)}
                        <div className={styles.paymentProgress}>
                          <div
                            className={styles.progressBar}
                            style={{
                              width: `${Math.min((project.totalPaid / project.budget) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectClick(project.id);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={(e) => handleDelete(e, project.id, project.name)}
                        >
                          Delete
                        </Button>
                      </div>
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

export default ProjectTable;