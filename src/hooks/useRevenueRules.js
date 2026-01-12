import { useState, useEffect } from 'react';
import { revenueService } from '../services/revenueService';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export const useRevenueRules = () => {
  const [revenueRules, setRevenueRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { showToast } = useToast();

  // Load revenue rules
  const loadRevenueRules = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const rules = await revenueService.getRevenueRules();
      setRevenueRules(rules);
    } catch (err) {
      setError(err.message);
      showToast('Failed to load revenue rules', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create revenue rule
  const createRevenueRule = async (ruleData) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };
    
    setIsLoading(true);
    try {
      const newRule = await revenueService.createRevenueRule(ruleData, user.id);
      setRevenueRules(prev => [newRule, ...prev]);
      showToast('Revenue rule created successfully', 'success');
      return { success: true, rule: newRule };
    } catch (err) {
      const errorMessage = err.message || 'Failed to create revenue rule';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Update revenue rule
  const updateRevenueRule = async (ruleId, updates) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };
    
    setIsLoading(true);
    try {
      const updatedRule = await revenueService.updateRevenueRule(ruleId, updates, user.id);
      setRevenueRules(prev => 
        prev.map(r => r.id === ruleId ? { ...updatedRule, id: ruleId } : r)
      );
      showToast('Revenue rule updated successfully', 'success');
      return { success: true, rule: updatedRule };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update revenue rule';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Delete revenue rule
  const deleteRevenueRule = async (ruleId) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };
    
    setIsLoading(true);
    try {
      await revenueService.deleteRevenueRule(ruleId, user.id);
      setRevenueRules(prev => prev.filter(r => r.id !== ruleId));
      showToast('Revenue rule deleted successfully', 'success');
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete revenue rule';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Search revenue rules
  const searchRevenueRules = async (searchTerm, filters = {}) => {
    setIsLoading(true);
    try {
      const results = await revenueService.searchRevenueRules(searchTerm, filters);
      setRevenueRules(results);
    } catch (err) {
      setError(err.message);
      showToast('Failed to search revenue rules', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Get single revenue rule by ID
  const getRevenueRuleById = async (ruleId) => {
    try {
      const rule = await revenueService.getRevenueRule(ruleId);
      return rule;
    } catch (err) {
      console.error('Error fetching revenue rule by ID:', err);
      showToast('Failed to load revenue rule', 'error');
      return null;
    }
  };

  // Get single revenue rule
  const getRevenueRule = async (ruleId) => {
    setIsLoading(true);
    try {
      const rule = await revenueService.getRevenueRule(ruleId);
      return { success: true, rule };
    } catch (err) {
      const errorMessage = err.message || 'Failed to load revenue rule';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Get revenue rule statistics
  const getRevenueRuleStats = async () => {
    try {
      const stats = await revenueService.getRevenueRuleStats();
      return { success: true, stats };
    } catch (err) {
      const errorMessage = err.message || 'Failed to load revenue rule statistics';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Load revenue rules on mount
  useEffect(() => {
    loadRevenueRules();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const unsubscribe = revenueService.subscribeToRevenueRules((updatedRules) => {
      setRevenueRules(updatedRules);
    });

    return () => unsubscribe();
  }, []);

  return {
    revenueRules,
    isLoading,
    error,
    createRevenueRule,
    updateRevenueRule,
    deleteRevenueRule,
    searchRevenueRules,
    getRevenueRule,
    getRevenueRuleById,
    getRevenueRuleStats,
    refreshRevenueRules: loadRevenueRules
  };
};