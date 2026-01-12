import { useState, useEffect } from 'react';
import { projectService } from '../services/projectService';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { showToast } = useToast();

  // Load projects
  const loadProjects = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userProjects = await projectService.getUserProjects(user.id);
      setProjects(userProjects);
    } catch (err) {
      setError(err.message);
      showToast('Failed to load projects', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create project
  const createProject = async (projectData) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };
    
    setIsLoading(true);
    try {
      const newProject = await projectService.createProject(projectData, user.id);
      setProjects(prev => [newProject, ...prev]);
      showToast('Project created successfully', 'success');
      return { success: true, project: newProject };
    } catch (err) {
      const errorMessage = err.message || 'Failed to create project';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Update project
  const updateProject = async (projectId, updates) => {
    setIsLoading(true);
    try {
      const updatedProject = await projectService.updateProject(projectId, updates);
      setProjects(prev => 
        prev.map(p => p.id === projectId ? updatedProject : p)
      );
      showToast('Project updated successfully', 'success');
      return { success: true, project: updatedProject };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update project';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Delete project
  const deleteProject = async (projectId) => {
    setIsLoading(true);
    try {
      await projectService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      showToast('Project deleted successfully', 'success');
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete project';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Search projects
  const searchProjects = async (searchTerm, filters = {}) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const results = await projectService.searchProjects(user.id, searchTerm, filters);
      setProjects(results);
    } catch (err) {
      setError(err.message);
      showToast('Failed to search projects', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Get single project
  const getProject = async (projectId) => {
    setIsLoading(true);
    try {
      const project = await projectService.getProject(projectId);
      return { success: true, project };
    } catch (err) {
      const errorMessage = err.message || 'Failed to load project';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Load projects on mount and when user changes
  useEffect(() => {
    loadProjects();
  }, [user?.id]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = projectService.subscribeToUserProjects(user.id, (updatedProjects) => {
      setProjects(updatedProjects);
    });

    return () => unsubscribe();
  }, [user?.id]);

  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    searchProjects,
    getProject,
    refreshProjects: loadProjects
  };
};