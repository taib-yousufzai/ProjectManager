import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../common/Card/Card';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import { clientService } from '../../../services/clientService';
import { useAuth } from '../../../hooks/useAuth';
import styles from './ClientForm.module.css';

const ClientForm = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: ''
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.companyName) return;

        try {
            setLoading(true);
            await clientService.createClient(formData, user.id);
            navigate('/clients');
        } catch (error) {
            console.error('Error creating client:', error);
            alert('Failed to create client');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <form onSubmit={handleSubmit} className={styles.form}>
                <h2 className={styles.title}>Add New Client</h2>

                <div className={styles.grid}>
                    <Input
                        label="Company Name"
                        value={formData.companyName}
                        onChange={(val) => handleChange('companyName', val)}
                        required
                        placeholder="e.g. Acme Corp"
                    />
                    <Input
                        label="Contact Person"
                        value={formData.contactPerson}
                        onChange={(val) => handleChange('contactPerson', val)}
                        placeholder="e.g. John Doe"
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(val) => handleChange('email', val)}
                        placeholder="contact@acme.com"
                    />
                    <Input
                        label="Phone"
                        value={formData.phone}
                        onChange={(val) => handleChange('phone', val)}
                        placeholder="+91 98765 43210"
                    />
                </div>

                <div className={styles.fullWidth}>
                    <label className={styles.label}>Address</label>
                    <textarea
                        className={styles.textarea}
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        rows={3}
                    />
                </div>

                <div className={styles.actions}>
                    <Button variant="secondary" onClick={() => navigate('/clients')} type="button">
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" loading={loading}>
                        Create Client
                    </Button>
                </div>
            </form>
        </Card>
    );
};

export default ClientForm;
