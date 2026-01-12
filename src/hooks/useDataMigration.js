import { useState, useEffect } from 'react';
import { dataMigrationService } from '../services/dataMigrationService';

export const useDataMigration = () => {
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [migrating, setMigrating] = useState(false);

  // Load migration status on mount
  useEffect(() => {
    loadMigrationStatus();
  }, []);

  const loadMigrationStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await dataMigrationService.getMigrationStatus();
      setMigrationStatus(status);
    } catch (err) {
      console.error('Error loading migration status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runFullMigration = async () => {
    try {
      setMigrating(true);
      setError(null);
      const result = await dataMigrationService.runFullMigration();
      
      // Reload status after migration
      await loadMigrationStatus();
      
      return result;
    } catch (err) {
      console.error('Error running migration:', err);
      setError(err.message);
      throw err;
    } finally {
      setMigrating(false);
    }
  };

  const migratePaymentsBatch = async (batchSize = 10) => {
    try {
      setMigrating(true);
      setError(null);
      const result = await dataMigrationService.migratePaymentsBatch(batchSize);
      
      // Reload status after batch migration
      await loadMigrationStatus();
      
      return result;
    } catch (err) {
      console.error('Error migrating payments batch:', err);
      setError(err.message);
      throw err;
    } finally {
      setMigrating(false);
    }
  };

  const migrateUserPartyAssociations = async () => {
    try {
      setMigrating(true);
      setError(null);
      const result = await dataMigrationService.migrateUserPartyAssociations();
      
      // Reload status after user migration
      await loadMigrationStatus();
      
      return result;
    } catch (err) {
      console.error('Error migrating user party associations:', err);
      setError(err.message);
      throw err;
    } finally {
      setMigrating(false);
    }
  };

  const getPaymentRevenueBreakdown = async (paymentId) => {
    try {
      return await dataMigrationService.getPaymentRevenueBreakdown(paymentId);
    } catch (err) {
      console.error('Error getting payment revenue breakdown:', err);
      throw err;
    }
  };

  const checkPaymentCompatibility = (payment) => {
    return {
      needsMigration: dataMigrationService.needsMigration(payment),
      isProcessed: dataMigrationService.isPaymentProcessed(payment),
      hasLegacyData: !payment.revenueProcessed && payment.verified,
      canShowBreakdown: payment.verified // Can show breakdown for any verified payment
    };
  };

  return {
    migrationStatus,
    loading,
    error,
    migrating,
    runFullMigration,
    migratePaymentsBatch,
    migrateUserPartyAssociations,
    getPaymentRevenueBreakdown,
    checkPaymentCompatibility,
    reload: loadMigrationStatus
  };
};

export default useDataMigration;