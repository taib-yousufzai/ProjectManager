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
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadProjectData = async () => {
      setLoading(true);
      setError(null);
      try {
        const projectData = await projectService.getProject(id);
        if (!projectData) {
          setError({ type: 'not_found' });
          return;
        }
        setProject(projectData);
      } catch (err) {
        console.error('Error loading project:', err);

        // Detect network/blocking errors
        const errorMessage = err.message?.toLowerCase() || '';
        const isNetworkError =
          errorMessage.includes('network') ||
          errorMessage.includes('failed to fetch') ||
          errorMessage.includes('blocked') ||
          err.code === 'unavailable';

        setError({
          type: isNetworkError ? 'network' : 'unknown',
          message: err.message
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProjectData();
    }
  }, [id]);

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

  if (!project && error) {
    return (
      <div className={styles.projectDetailsPage}>
        <div className={styles.notFound}>
          {error.type === 'network' ? (
            <>
              <h2>⚠️ Connection Blocked</h2>
              <p>Unable to load project data. This is usually caused by:</p>
              <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '1rem auto' }}>
                <li>Ad-blocker or privacy extension blocking Firebase</li>
                <li>Network connectivity issues</li>
                <li>Firewall restrictions</li>
              </ul>
              <p><strong>Try:</strong> Disabling your ad-blocker for this site or checking your internet connection.</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                <Button variant="primary" onClick={() => window.location.reload()}>
                  Retry
                </Button>
                <Button variant="secondary" onClick={() => navigate('/projects')}>
                  Back to Projects
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2>Project Not Found</h2>
              <p>The project you're looking for doesn't exist or you don't have access to it.</p>
              <Button variant="primary" onClick={() => navigate('/projects')}>
                Back to Projects
              </Button>
            </>
          )}
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