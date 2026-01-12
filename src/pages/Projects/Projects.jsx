import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectTable from '../../components/features/ProjectTable';
import Button from '../../components/common/Button/Button';
import { useProjects } from '../../hooks/useProjects';
import { ROUTES } from '../../utils/constants';
import styles from './Projects.module.css';

const Projects = () => {
  const navigate = useNavigate();
  const { projects, isLoading, error, searchProjects, refreshProjects, deleteProject } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'all' });

  const handleSearch = (term) => {
    setSearchTerm(term);
    searchProjects(term, filters);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    searchProjects(searchTerm, newFilters);
  };

  return (
    <div className={styles.projectsPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.subtitle}>
            Manage and track all your projects in one place
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="primary"
            onClick={() => navigate(ROUTES.ADD_PROJECT)}
          >
            Add New Project
          </Button>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <p>Error loading projects: {error}</p>
          <Button variant="secondary" onClick={refreshProjects}>
            Retry
          </Button>
        </div>
      )}

      <ProjectTable
        projects={projects}
        loading={isLoading}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        searchTerm={searchTerm}
        filters={filters}
        onDelete={deleteProject}
      />
    </div>
  );
};

export default Projects;