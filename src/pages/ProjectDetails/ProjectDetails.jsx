import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectTabs from '../../components/features/ProjectTabs';
import Button from '../../components/common/Button/Button';
import { projectService } from '../../services/projectService'; // Real Service
import { ROUTES } from '../../utils/constants'; // Ensure this constant exists or use string
import { Trash2 } from 'lucide-react';
import styles from './ProjectDetails.module.css';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadProjectData = async () => {
      setLoading(true);
      try {
        const projectData = await projectService.getProject(id);
        if (!projectData) {
          navigate(ROUTES.PROJECTS || '/projects');
          return;
        }
        setProject(projectData);
      } catch (error) {
        console.error('Error loading project:', error);
        // navigate('/projects'); // Optional: redirect on error
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProjectData();
    }
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await projectService.deleteProject(id);
      navigate(ROUTES.PROJECTS);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.projectDetailsPage}>
        <div className={styles.loading}>
          Loading project details...
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.projectDetailsPage}>
        <div className={styles.notFound}>
          <h2>Project Not Found</h2>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.projectDetailsPage}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.breadcrumb}>
            <button
              className={styles.breadcrumbLink}
              onClick={() => navigate('/projects')}
            >
              Projects
            </button>
            <span className={styles.breadcrumbSeparator}>›</span>
            {project.clientName && (
              <>
                <button
                  className={styles.breadcrumbLink}
                  onClick={() => navigate(`/clients/${project.clientId}`)}
                >
                  {project.clientName}
                </button>
                <span className={styles.breadcrumbSeparator}>›</span>
              </>
            )}
            <span className={styles.breadcrumbCurrent}>{project.name}</span>
          </div>

          <h1 className={styles.title}>{project.name}</h1>
          <p className={styles.subtitle}>
            {project.description}
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            onClick={() => navigate(`${ROUTES.PROJECTS}/${id}/edit`)} // Fixed path construction
          >
            Edit Project
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={isDeleting}
          >
            <Trash2 size={16} style={{ marginRight: '8px' }} /> Delete
          </Button>
          <Button
            variant="primary"
            onClick={() => {/* Handle add payment */ }}
          >
            Add Payment
          </Button>
        </div>
      </div>

      {/* Project Tabs (handles tasks, milestones, etc.) */}
      <ProjectTabs
        project={project}
        files={[]} // TODO: Fetch real files
        notes={[]} // TODO: Fetch real notes
      />
    </div>
  );
};

export default ProjectDetails;