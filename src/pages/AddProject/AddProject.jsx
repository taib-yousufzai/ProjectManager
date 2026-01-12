import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectForm from '../../components/features/ProjectForm';
import { useProjects } from '../../hooks/useProjects';
import { ROUTES } from '../../utils/constants';
import styles from './AddProject.module.css';

const AddProject = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // If present, we are editing
  const { createProject, updateProject, getProject, isLoading } = useProjects();
  const [projectData, setProjectData] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    if (id) {
      setLoadingConfig(true);
      getProject(id).then(result => {
        if (result.success) {
          setProjectData(result.project);
        } else {
          navigate(ROUTES.PROJECTS);
        }
        setLoadingConfig(false);
      });
    }
  }, [id]);

  const handleSubmit = async (data) => {
    let result;
    if (id) {
      result = await updateProject(id, data);
    } else {
      result = await createProject(data);
    }

    if (result.success) {
      navigate(`${ROUTES.PROJECTS}/${result.project.id}`);
    }
  };

  if (loadingConfig) return <div className={styles.loading}>Loading project...</div>;

  return (
    <div className={styles.addProjectPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>{id ? 'Edit Project' : 'Add New Project'}</h1>
        <p className={styles.subtitle}>
          {id ? 'Update project details' : 'Create a new project to start tracking progress and payments'}
        </p>
      </div>

      <ProjectForm
        initialData={projectData}
        onSubmit={handleSubmit}
        loading={isLoading}
      />
    </div>
  );
};

export default AddProject;