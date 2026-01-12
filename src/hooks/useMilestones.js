import { useState, useEffect } from 'react';
import { milestonesService } from '../services/firestore';

export const useMilestones = (projectId) => {
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!projectId) return;

        setLoading(true);
        const unsubscribe = milestonesService.subscribe(
            (data) => {
                setMilestones(data);
                setLoading(false);
            },
            {
                where: [['projectId', '==', projectId]],
                orderBy: [['order', 'asc'], ['dueDate', 'asc']]
            }
        );

        return () => unsubscribe();
    }, [projectId]);

    const addMilestone = async (milestoneData) => {
        try {
            await milestonesService.create({ ...milestoneData, projectId });
        } catch (err) {
            console.error('Error adding milestone:', err);
            throw err;
        }
    };

    const updateMilestone = async (milestoneId, updates) => {
        try {
            await milestonesService.update(milestoneId, updates);
        } catch (err) {
            console.error('Error updating milestone:', err);
            throw err;
        }
    };

    const deleteMilestone = async (milestoneId) => {
        try {
            await milestonesService.delete(milestoneId);
        } catch (err) {
            console.error('Error deleting milestone:', err);
            throw err;
        }
    };

    return { milestones, loading, error, addMilestone, updateMilestone, deleteMilestone };
};
