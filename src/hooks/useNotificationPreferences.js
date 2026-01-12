import { useState, useEffect } from 'react';
import { notificationPreferencesService } from '../services/notificationPreferencesService';

export const useNotificationPreferences = (userId) => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences when userId changes
  useEffect(() => {
    if (userId) {
      loadPreferences();
    }
  }, [userId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const userPreferences = await notificationPreferencesService.getUserPreferences(userId);
      setPreferences(userPreferences);
      setHasChanges(false);
    } catch (err) {
      console.error('Error loading notification preferences:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key, value) => {
    if (!preferences) return;

    setPreferences(prev => {
      const updated = { ...prev };
      
      // Handle nested properties (e.g., 'profitSummary.enabled')
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        updated[parent] = {
          ...updated[parent],
          [child]: value
        };
      } else {
        updated[key] = value;
      }
      
      return updated;
    });
    
    setHasChanges(true);
  };

  const savePreferences = async () => {
    if (!preferences || !userId) {
      throw new Error('No preferences to save or user ID missing');
    }

    try {
      setLoading(true);
      setError(null);
      const savedPreferences = await notificationPreferencesService.updateUserPreferences(userId, preferences);
      setPreferences(savedPreferences);
      setHasChanges(false);
      return savedPreferences;
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    const defaultPreferences = notificationPreferencesService.getDefaultPreferences();
    setPreferences(defaultPreferences);
    setHasChanges(true);
  };

  const checkShouldReceive = async (notificationType) => {
    if (!userId) return true;
    
    try {
      return await notificationPreferencesService.shouldReceiveNotification(userId, notificationType);
    } catch (err) {
      console.error('Error checking notification preference:', err);
      return true; // Default to sending on error
    }
  };

  return {
    preferences,
    loading,
    error,
    hasChanges,
    updatePreference,
    savePreferences,
    resetToDefaults,
    checkShouldReceive,
    reload: loadPreferences
  };
};

export default useNotificationPreferences;