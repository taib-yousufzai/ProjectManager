import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import { clientService } from '../../services/clientService';
import { ROUTES } from '../../utils/constants'; // Need to update constants too
import { Plus, Search, Building2, Users, FileText, CreditCard } from 'lucide-react';
import styles from './Clients.module.css';

const Clients = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const data = await clientService.getAllClients();
            setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(client =>
        client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.clientsPage}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>Clients</h1>
                    <p className={styles.subtitle}>Manage your client portfolio</p>
                </div>
                <Button variant="primary" onClick={() => navigate('/clients/add')}>
                    <Plus size={18} />
                    Add Client
                </Button>
            </div>

            <div className={styles.searchBar}>
                <Search className={styles.searchIcon} size={20} />
                <input
                    type="text"
                    placeholder="Search clients..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className={styles.loading}>Loading clients...</div>
            ) : (
                <div className={styles.grid}>
                    {filteredClients.map(client => (
                        <div key={client.id} className={styles.clientCard} onClick={() => navigate(`/clients/${client.id}`)}>
                            <div className={styles.cardHeader}>
                                <div className={styles.iconWrapper}>
                                    <Building2 size={24} />
                                </div>
                                <div className={styles.clientInfo}>
                                    <h3>{client.companyName}</h3>
                                    <p>{client.contactPerson}</p>
                                </div>
                            </div>

                            <div className={styles.statsRow}>
                                <div className={styles.stat}>
                                    <FileText size={16} />
                                    <span>{client.totalProjects || 0} Projects</span>
                                </div>
                                <div className={styles.stat}>
                                    <CreditCard size={16} />
                                    <span>₹{(client.totalRevenue || 0).toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            <div className={styles.statusBadge}>
                                {client.activeProjects > 0 ? `${client.activeProjects} Active` : 'No Active Projects'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Clients;
