import React, { useState } from 'react';
import { useMilestones } from '../../../hooks/useMilestones';
import Button from '../../common/Button/Button';
import { Flag, CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import styles from './ProjectMilestones.module.css';

const ProjectMilestones = ({ projectId }) => {
    const { milestones, loading, addMilestone, updateMilestone, deleteMilestone } = useMilestones(projectId);
    const [isAdding, setIsAdding] = useState(false);
    const [newMilestone, setNewMilestone] = useState({ title: '', amount: '', date: '' });

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newMilestone.title.trim()) return;

        try {
            setIsAdding(true);
            await addMilestone({
                title: newMilestone.title,
                amount: parseFloat(newMilestone.amount) || 0,
                dueDate: newMilestone.date ? new Date(newMilestone.date) : null,
                status: 'pending'
            });
            setNewMilestone({ title: '', amount: '', date: '' });
        } catch (error) {
            // Log error
        } finally {
            setIsAdding(false);
        }
    };

    const toggleStatus = (milestone) => {
        // Cycle: pending -> completed -> paid
        let newStatus = 'completed';
        if (milestone.status === 'completed') newStatus = 'paid';
        else if (milestone.status === 'paid') newStatus = 'pending';

        updateMilestone(milestone.id, { status: newStatus });
    };

    if (loading) return <div className={styles.loading}>Loading milestones...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Milestones</h3>
            </div>

            <div className={styles.milestoneList}>
                {milestones.map((ms, index) => (
                    <div key={ms.id} className={styles.milestoneItem}>
                        <div className={styles.timeline}>
                            <div className={styles.line}></div>
                            <button
                                className={`${styles.marker} ${styles[ms.status]}`}
                                onClick={() => toggleStatus(ms)}
                            >
                                {ms.status === 'paid' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </button>
                        </div>

                        <div className={styles.content}>
                            <div className={styles.msHeader}>
                                <span className={styles.msTitle}>{ms.title}</span>
                                <span className={`${styles.msStatus} ${styles[ms.status + 'Badge']}`}>
                                    {ms.status.toUpperCase()}
                                </span>
                            </div>
                            <div className={styles.msDetails}>
                                {ms.amount > 0 && <span className={styles.amount}>{formatCurrency(ms.amount)}</span>}
                                {ms.dueDate && (
                                    <span className={styles.date}>Due: {formatDate(ms.dueDate)}</span>
                                )}
                            </div>
                        </div>

                        <button className={styles.deleteBtn} onClick={() => deleteMilestone(ms.id)}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <form onSubmit={handleAdd} className={styles.addForm}>
                <h4>Add Milestone</h4>
                <div className={styles.formRow}>
                    <input
                        type="text"
                        placeholder="Milestone Title"
                        value={newMilestone.title}
                        onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })}
                        className={styles.input}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Amount"
                        value={newMilestone.amount}
                        onChange={e => setNewMilestone({ ...newMilestone, amount: e.target.value })}
                        className={styles.input}
                    />
                    <input
                        type="date"
                        value={newMilestone.date}
                        onChange={e => setNewMilestone({ ...newMilestone, date: e.target.value })}
                        className={styles.input}
                    />
                </div>
                <Button variant="secondary" size="small" type="submit" loading={isAdding} disabled={!newMilestone.title}>
                    <Plus size={16} /> Add Milestone
                </Button>
            </form>
        </div>
    );
};

export default ProjectMilestones;
