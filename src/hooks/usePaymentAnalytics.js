import { useState, useEffect } from 'react';
import { paymentService } from '../services/paymentService';
import { useAuth } from './useAuth';

export const usePaymentAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    stats: null,
    approvalStats: null,
    monthlyData: [],
    verificationData: [],
    isLoading: true,
    error: null
  });
  const { user } = useAuth();

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user?.id) return;

      try {
        setAnalytics(prev => ({ ...prev, isLoading: true, error: null }));

        // Load payment statistics, monthly analytics, and approval analytics
        const [stats, monthlyData, approvalStats] = await Promise.all([
          paymentService.getPaymentStats(user.id),
          paymentService.getPaymentAnalytics(user.id, 12),
          paymentService.getApprovalAnalytics(user.id)
        ]);

        // Create verification chart data
        const verificationData = [
          {
            name: 'Verified',
            value: approvalStats.verified,
            color: '#22C55E'
          },
          {
            name: 'Pending Approval',
            value: approvalStats.pendingApproval,
            color: '#6B7280'
          },
          {
            name: 'Partial Approval',
            value: approvalStats.partialApproval,
            color: '#F59E0B'
          }
        ];

        setAnalytics({
          stats,
          approvalStats,
          monthlyData,
          verificationData,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('Error loading payment analytics:', error);
        setAnalytics(prev => ({
          ...prev,
          isLoading: false,
          error: error.message
        }));
      }
    };

    loadAnalytics();
  }, [user?.id]);

  return analytics;
};