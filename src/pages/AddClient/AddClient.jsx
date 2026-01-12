import React from 'react';
import ClientForm from '../../components/features/ClientForm/ClientForm';
import styles from './AddClient.module.css';

const AddClient = () => {
    return (
        <div className={styles.container}>
            <ClientForm />
        </div>
    );
};

export default AddClient;
