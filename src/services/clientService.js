import { clientsService, projectsService } from './firestore';
import { createClient } from '../models';

export class ClientService {
    // Create a new client
    async createClient(clientData, userId) {
        try {
            const client = createClient({
                ...clientData,
                createdBy: userId
            });

            return await clientsService.create(client);
        } catch (error) {
            console.error('Error creating client:', error);
            throw error;
        }
    }

    // Get all clients
    async getAllClients() {
        try {
            return await clientsService.getAll({
                orderBy: [['createdAt', 'desc']]
            });
        } catch (error) {
            console.error('Error fetching clients:', error);
            throw error;
        }
    }

    // Get client by ID
    async getClient(clientId) {
        try {
            return await clientsService.getById(clientId);
        } catch (error) {
            console.error('Error fetching client:', error);
            throw error;
        }
    }

    // Update client
    async updateClient(clientId, updates) {
        try {
            return await clientsService.update(clientId, updates);
        } catch (error) {
            console.error('Error updating client:', error);
            throw error;
        }
    }

    // Get detailed client dashboard data (aggregated from projects)
    async getClientDashboardData(clientId) {
        try {
            const client = await this.getClient(clientId);
            const projects = await projectsService.getAll({
                where: [['clientId', '==', clientId]]
            });

            // Calculate aggregates dynamically to ensure accuracy
            const stats = {
                totalProjects: projects.length,
                activeProjects: projects.filter(p => p.status === 'active').length,
                completedProjects: projects.filter(p => p.status === 'completed').length,
                totalRevenue: projects.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
                totalOutstanding: projects.reduce((sum, p) => sum + ((p.budget || 0) - (p.totalPaid || 0)), 0)
            };

            return {
                client,
                projects,
                stats
            };
        } catch (error) {
            console.error('Error fetching client dashboard data:', error);
            throw error;
        }
    }
}

export const clientService = new ClientService();
