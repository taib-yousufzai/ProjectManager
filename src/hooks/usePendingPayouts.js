import { useState, useEffect } from 'react';
import { ledgerService } from '../services/ledgerService';
import { PARTY_TYPES, LEDGER_ENTRY_STATUSES } from '../models';

export const usePendingPayouts = (refreshInterval = 30000) => {
  const [payouts, setPayouts] = useState({
    admin: { amount: 0, currency: 'USD', entryCount: 0 },
    team: { amount: 0, currency: 'USD', entryCount: 0 },
    vendor: { amount: 0, currency: 'USD', entryCount: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPendingPayouts = async () => {
    try {
      setError(null);
      
      // Fetch pending balances for each party
      const balancePromises = Object.values(PARTY_TYPES).map(async (party) => {
        try {
          const balance = await ledgerService.getPartyBalance(party);
          const pendingEntries = await ledgerService.getPendingEntriesForSettlement(party);
          
          return {
            party,
            amount: balance.totalPending,
            currency: balance.currency,
            entryCount: pendingEntries.length,
            lastUpdated: balance.lastUpdated
          };
        } catch (err) {
          console.error(`Error fetching balance for ${party}:`, err);
          return {
            party,
            amount: 0,
            currency: 'USD',
            entryCount: 0,
            lastUpdated: new Date(),
            error: err.message
          };
        }
      });

      const balances = await Promise.all(balancePromises);
      
      // Convert array to object keyed by party
      const payoutData = {};
      balances.forEach(balance => {
        payoutData[balance.party] = {
          amount: balance.amount,
          currency: balance.currency,
          entryCount: balance.entryCount,
          error: balance.error || null
        };
      });

      setPayouts(payoutData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching pending payouts:', err);
      setError('Failed to load pending payout data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPendingPayouts();
  }, []);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchPendingPayouts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  // Calculate total pending across all parties
  const totalPending = Object.values(payouts).reduce((sum, payout) => sum + payout.amount, 0);

  // Get party with highest pending amount
  const highestPendingParty = Object.entries(payouts).reduce((highest, [party, data]) => {
    return data.amount > highest.amount ? { party, ...data } : highest;
  }, { party: null, amount: 0 });

  // Check if any party has pending payouts
  const hasPendingPayouts = totalPending > 0;

  // Get parties that need attention (have pending amounts)
  const partiesNeedingAttention = Object.entries(payouts)
    .filter(([_, data]) => data.amount > 0)
    .map(([party, data]) => ({ party, ...data }));

  return {
    payouts,
    loading,
    error,
    lastUpdated,
    totalPending: Math.round(totalPending * 100) / 100,
    highestPendingParty,
    hasPendingPayouts,
    partiesNeedingAttention,
    refresh: fetchPendingPayouts
  };
};