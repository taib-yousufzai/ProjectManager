import { projectsService, usersService } from './firestore';
import { createProject, PROJECT_STATUSES, PROGRESS_METHODS } from '../models';
import { notificationService } from './notificationService';

export class ProjectService {
  // Create a new project
  async createProject(projectData, userId) {
    try {
      const project = createProject({
        ...projectData,
        ownerId: userId,
        teamMembers: [userId, ...(projectData.teamMembers || [])]
      });

      const newProject = await projectsService.create(project);

      // Send notification to team members (non-blocking)
      this.notifyTeamMembersAsync(newProject, userId).catch(error => {
        console.warn('Failed to send project creation notifications:', error);
      });

      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Helper method to send notifications asynchronously
  async notifyTeamMembersAsync(newProject, userId) {
    try {
      // Resolve team member emails to user IDs
      const validTeamMemberIds = await this.resolveTeamMemberIds(newProject.teamMembers);

      // Only send notifications to valid user IDs
      if (validTeamMemberIds.length > 0) {
        await notificationService.notifyProjectCreated(
          { ...newProject, id: newProject.id, teamMembers: validTeamMemberIds },
          userId
        );
      }
    } catch (error) {
      console.error('Error in notifyTeamMembersAsync:', error);
      throw error;
    }
  }

  // Resolve team member emails to user IDs
  async resolveTeamMemberIds(teamMembers) {
    const validIds = [];

    for (const member of teamMembers) {
      // Check if it's already a valid UID (Firebase UIDs are 28 chars)
      if (member && typeof member === 'string' && member.length >= 20 && !member.includes('@')) {
        validIds.push(member);
      } else if (member && member.includes('@')) {
        // It's an email - try to resolve to UID
        try {
          const users = await usersService.getAll({
            where: [['email', '==', member]]
          });
          if (users.length > 0) {
            validIds.push(users[0].id);
          } else {
            console.warn(`No user found for email: ${member}`);
          }
        } catch (error) {
          console.warn(`Error resolving email ${member}:`, error);
        }
      }
    }

    return validIds;
  }

  // Get all projects for a user
  // Helper to fetch projects with fallback if index is missing
  async getUserProjects(userId) {
    try {
      // Try with orderBy first
      try {
        return await projectsService.getAll({
          where: [['teamMembers', 'array-contains', userId]],
          orderBy: [['createdAt', 'desc']]
        });
      } catch (err) {
        // Fallback without orderBy if index is missing
        if (err.message && err.message.includes('index')) {
          console.warn('Missing index for projects query. Falling back to client-side sorting.');
          const projects = await projectsService.getAll({
            where: [['teamMembers', 'array-contains', userId]]
          });
          return projects.sort((a, b) => b.createdAt - a.createdAt);
        }
        throw err;
      }
    } catch (error) {
      console.error('Error fetching user projects:', error);
      throw error;
    }
  }

  // Get a single project by ID
  async getProject(projectId) {
    try {
      return await projectsService.getById(projectId);
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }

  // Update a project
  async updateProject(projectId, updates) {
    try {
      return await projectsService.update(projectId, updates);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Update progress based on method
  async updateProjectProgress(projectId, method, data) {
    // data can be: { completedTasks, totalTasks } or { completedMilestones, totalMilestones } or { value: 50 }
    let progress = 0;

    if (method === PROGRESS_METHODS.TASK) {
      if (data.totalTasks > 0) {
        progress = Math.round((data.completedTasks / data.totalTasks) * 100);
      }
    } else if (method === PROGRESS_METHODS.MILESTONE) {
      // Could be count based or amount based
      if (data.totalMilestones > 0) {
        progress = Math.round((data.completedMilestones / data.totalMilestones) * 100);
      }
    } else if (method === PROGRESS_METHODS.MANUAL) {
      progress = data.value;
    } else if (method === PROGRESS_METHODS.TIME) {
      // Logic handled usually by a cron or on-load calc, but here if data passed
      progress = data.value;
    }

    // Ensure 0-100 range
    progress = Math.min(100, Math.max(0, progress));

    return await this.updateProject(projectId, {
      progress,
      updatedAt: new Date()
    });
  }

  // Delete a project
  async deleteProject(projectId) {
    try {
      return await projectsService.delete(projectId);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // Search projects
  async searchProjects(userId, searchTerm, filters = {}) {
    try {
      let queryOptions = {
        where: [
          ['teamMembers', 'array-contains', userId]
        ]
        // Removed orderBy to avoid multi-field index complex requirements for dynamic search
      };

      // Add status filter if provided
      if (filters.status && filters.status !== 'all') {
        queryOptions.where.push(['status', '==', filters.status]);
      }

      // Add client filter if provided
      if (filters.clientId) {
        queryOptions.where.push(['clientId', '==', filters.clientId]);
      }

      const projects = await projectsService.getAll(queryOptions);

      // Filter by search term (client-side)
      let filtered = projects;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(project =>
          project.name.toLowerCase().includes(term) ||
          project.description.toLowerCase().includes(term) ||
          project.clientName.toLowerCase().includes(term)
        );
      }

      // Client-side sort since we dropped it from query
      return filtered.sort((a, b) => b.createdAt - a.createdAt);

    } catch (error) {
      console.error('Error searching projects:', error);
      throw error;
    }
  }

  // Get project statistics
  async getProjectStats(userId) {
    try {
      const projects = await this.getUserProjects(userId);

      const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === PROJECT_STATUSES.ACTIVE).length,
        completed: projects.filter(p => p.status === PROJECT_STATUSES.COMPLETED).length,
        onHold: projects.filter(p => p.status === PROJECT_STATUSES.ON_HOLD).length,
        totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
        totalPaid: projects.reduce((sum, p) => sum + (p.totalPaid || 0), 0)
      };

      return stats;
    } catch (error) {
      console.error('Error calculating project stats:', error);
      throw error;
    }
  }

  // Subscribe to real-time project updates
  subscribeToUserProjects(userId, callback) {
    return projectsService.subscribe(callback, {
      where: [
        ['teamMembers', 'array-contains', userId]
      ],
      orderBy: [['createdAt', 'desc']]
    });
  }
}

export const projectService = new ProjectService();