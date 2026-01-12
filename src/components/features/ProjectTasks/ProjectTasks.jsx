import React, { useState } from 'react';
import { useTasks } from '../../../hooks/useTasks';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import { CheckCircle2, Circle, Trash2, Plus } from 'lucide-react';
import styles from './ProjectTasks.module.css';

const ProjectTasks = ({ projectId }) => {
    const { tasks, loading, addTask, updateTask, deleteTask } = useTasks(projectId);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            setIsAdding(true);
            await addTask({
                title: newTaskTitle,
                status: 'todo',
                priority: 'medium'
            });
            setNewTaskTitle('');
        } catch (error) {
            // Log error
        } finally {
            setIsAdding(false);
        }
    };

    const toggleTask = (task) => {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed';
        updateTask(task.id, {
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date() : null
        });
    };

    if (loading) return <div className={styles.loading}>Loading tasks...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Tasks</h3>
                <span className={styles.count}>{tasks.filter(t => t.status === 'completed').length} / {tasks.length} Completed</span>
            </div>

            <form onSubmit={handleAddTask} className={styles.addForm}>
                <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new task..."
                    className={styles.addInput}
                />
                <Button size="small" variant="primary" type="submit" loading={isAdding} disabled={!newTaskTitle.trim()}>
                    <Plus size={16} /> Add
                </Button>
            </form>

            <div className={styles.taskList}>
                {tasks.map(task => (
                    <div key={task.id} className={`${styles.taskItem} ${task.status === 'completed' ? styles.completed : ''}`}>
                        <button className={styles.checkBtn} onClick={() => toggleTask(task)}>
                            {task.status === 'completed' ?
                                <CheckCircle2 size={20} className={styles.checkIcon} /> :
                                <Circle size={20} className={styles.uncheckedIcon} />
                            }
                        </button>
                        <span className={styles.taskTitle}>{task.title}</span>
                        <button className={styles.deleteBtn} onClick={() => deleteTask(task.id)}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className={styles.empty}>No tasks yet. Add one above!</div>
                )}
            </div>
        </div>
    );
};

export default ProjectTasks;
