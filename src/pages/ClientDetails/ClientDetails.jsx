import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientService } from '../../services/clientService';
import ProjectTable from '../../components/features/ProjectTable';
import StatsCard from '../../components/common/StatsCard'; // Reusing existing component
import Button from '../../components/common/Button/Button';
import { LayoutDashboard, CreditCard, CheckCircle2, Factory, Mail, Phone, MapPin, ArrowLeft } from 'lucide-react';
import styles from './ClientDetails.module.css';

const ClientDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [clientData, setClientData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchClientData();
    }, [id]);

    const fetchClientData = async () => {
        try {
            setLoading(true);
            const data = await clientService.getClientDashboardData(id);
            setClientData(data);
        } catch (err) {
            console.error('Error fetching client details:', err);
            setError('Failed to load client details.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading client dashboard...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!clientData) return <div className={styles.error}>Client not found</div>;

    const { client, projects, stats } = clientData;

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Button variant="ghost" onClick={() => navigate('/clients')} className={styles.backButton}>
                    <ArrowLeft size={16} /> Back to Clients
                </Button>
                <div className={styles.headerContent}>
                    <div>
                        <h1 className={styles.title}>{client.companyName}</h1>
                        <div className={styles.metaInfo}>
                            <span className={styles.metaItem}><UsersIcon size={14} /> {client.contactPerson}</span>
                            {client.email && <span className={styles.metaItem}><Mail size={14} /> {client.email}</span>}
                        </div>
                    </div>
                    <Button variant="primary" onClick={() => navigate(`/projects/add?clientId=${client.id}`)}>
                        New Project
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatsCard
                    title="Total Revenue"
                    value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
                    icon={<CreditCard size={20} />}
                    changeType="neutral"
                />
                <StatsCard
                    title="Active Projects"
                    value={stats.activeProjects}
                    icon={<Factory size={20} />}
                    changeType="positive"
                    subtitle={`${stats.totalProjects} Total`}
                />
                <StatsCard
                    title="Outstanding"
                    value={`₹${stats.totalOutstanding.toLocaleString('en-IN')}`}
                    icon={<CreditCard size={20} />}
                    changeType={stats.totalOutstanding > 0 ? "warning" : "positive"}
                    subtitle="Pending Payment"
                />
            </div>

            {/* Projects List */}
            <div className={styles.projectsSection}>
                <h2 className={styles.sectionTitle}>Projects</h2>
                <div className={styles.tableWrapper}>
                    <ProjectTable
                        projects={projects}
                        loading={false}
                        hideFilters={true} // Simplified view
                    />
                </div>
            </div>
        </div>
    );
};

// Simple Icon wrapper if needed, or allow direct usage
const UsersIcon = ({ size }) => <Users size={size} />;
import { Users } from 'lucide-react';

export default ClientDetails;
