import { useState, useEffect } from 'react';
import { tasksService } from '../services/firestore';

export const useTasks = (projectId) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!projectId) return;

        setLoading(true);
        const unsubscribe = tasksService.subscribe(
            (data) => {
                setTasks(data);
                setLoading(false);
            },
            {
                where: [['projectId', '==', projectId]],
                orderBy: [['createdAt', 'desc']]
            }
        );

        return () => unsubscribe();
    }, [projectId]);

    const addTask = async (taskData) => {
        try {
            await tasksService.create({ ...taskData, projectId });
        } catch (err) {
            console.error('Error adding task:', err);
            throw err;
        }
    };

    const updateTask = async (taskId, updates) => {
        try {
            await tasksService.update(taskId, updates);
        } catch (err) {
            console.error('Error updating task:', err);
            throw err;
        }
    };

    const deleteTask = async (taskId) => {
        try {
            await tasksService.delete(taskId);
        } catch (err) {
            console.error('Error deleting task:', err);
            throw err;
        }
    };

    return { tasks, loading, error, addTask, updateTask, deleteTask };
};
