import { useState, useEffect, useCallback } from 'react';
import { ledgerService } from '../services/ledgerService';
import { useToast } from './useToast';

export const useLedgerEntries = (initialFilters = {}) => {
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const { showToast } = useToast();

  // Fetch ledger entries
  const fetchLedgerEntries = useCallback(async (currentFilters = filters) => {
    try {
      setIsLoading(true);
      setError(null);
      const entries = await ledgerService.getLedgerEntries(currentFilters);
      setLedgerEntries(entries);
    } catch (err) {
      console.error('Error fetching ledger entries:', err);
      setError(err.message);
      showToast('Failed to load ledger entries', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filters, showToast]);

  // Update filters and refetch
  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    fetchLedgerEntries(newFilters);
  }, [fetchLedgerEntries]);

  // Clear filters
  const clearFilters = useCallback(() => {
    const clearedFilters = {};
    setFilters(clearedFilters);
    fetchLedgerEntries(clearedFilters);
  }, [fetchLedgerEntries]);

  // Update ledger entry status
  const updateEntryStatus = useCallback(async (entryId, status) => {
    try {
      await ledgerService.updateLedgerEntryStatus(entryId, status);
      showToast('Entry status updated successfully', 'success');
      
      // Update local state
      setLedgerEntries(prev => 
        prev.map(entry => 
          entry.id === entryId ? { ...entry, status } : entry
        )
      );
      
      return { success: true };
    } catch (err) {
      console.error('Error updating entry status:', err);
      showToast('Failed to update entry status', 'error');
      return { success: false, error: err.message };
    }
  }, [showToast]);

  // Get party balance
  const getPartyBalance = useCallback(async (party, currency = null) => {
    try {
      return await ledgerService.getPartyBalance(party, currency);
    } catch (err) {
      console.error('Error fetching party balance:', err);
      showToast('Failed to load party balance', 'error');
      return null;
    }
  }, [showToast]);

  // Get pending entries for settlement
  const getPendingEntriesForSettlement = useCallback(async (party, currency = null) => {
    try {
      return await ledgerService.getPendingEntriesForSettlement(party, currency);
    } catch (err) {
      console.error('Error fetching pending entries:', err);
      showToast('Failed to load pending entries', 'error');
      return [];
    }
  }, [showToast]);

  // Create settlement
  const createSettlement = useCallback(async (settlementData, userId) => {
    try {
      const settlement = await ledgerService.createSettlement(settlementData, userId);
      showToast('Settlement created successfully', 'success');
      
      // Refresh ledger entries to reflect status changes
      await fetchLedgerEntries();
      
      return { success: true, settlement };
    } catch (err) {
      console.error('Error creating settlement:', err);
      showToast('Failed to create settlement', 'error');
      return { success: false, error: err.message };
    }
  }, [showToast, fetchLedgerEntries]);

  // Get ledger entries by payment ID
  const getLedgerEntriesByPayment = useCallback(async (paymentId) => {
    try {
      return await ledgerService.getLedgerEntriesByPayment(paymentId);
    } catch (err) {
      console.error('Error fetching ledger entries by payment:', err);
      showToast('Failed to load payment ledger entries', 'error');
      return [];
    }
  }, [showToast]);

  // Refresh data
  const refreshLedgerEntries = useCallback(() => {
    fetchLedgerEntries();
  }, [fetchLedgerEntries]);

  // Initial load
  useEffect(() => {
    fetchLedgerEntries();
  }, [fetchLedgerEntries]);

  return {
    ledgerEntries,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    updateEntryStatus,
    getPartyBalance,
    getPendingEntriesForSettlement,
    createSettlement,
    getLedgerEntriesByPayment,
    refreshLedgerEntries
  };
};