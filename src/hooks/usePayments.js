import { useState, useEffect } from 'react';
import { paymentService } from '../services/paymentService';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export const usePayments = (projectId = null) => {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { showToast } = useToast();

  // Load payments
  const loadPayments = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let userPayments;
      if (projectId) {
        userPayments = await paymentService.getProjectPayments(projectId);
      } else {
        userPayments = await paymentService.getUserPayments(user.id);
      }
      setPayments(userPayments);
    } catch (err) {
      setError(err.message);
      showToast('Failed to load payments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create payment
  const createPayment = async (paymentData) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };
    
    setIsLoading(true);
    try {
      const newPayment = await paymentService.createPayment(paymentData, user.id);
      setPayments(prev => [newPayment, ...prev]);
      showToast('Payment created successfully', 'success');
      return { success: true, payment: newPayment };
    } catch (err) {
      const errorMessage = err.message || 'Failed to create payment';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Update payment
  const updatePayment = async (paymentId, updates) => {
    setIsLoading(true);
    try {
      const updatedPayment = await paymentService.updatePayment(paymentId, updates);
      setPayments(prev => 
        prev.map(p => p.id === paymentId ? updatedPayment : p)
      );
      showToast('Payment updated successfully', 'success');
      return { success: true, payment: updatedPayment };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update payment';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Delete payment
  const deletePayment = async (paymentId) => {
    setIsLoading(true);
    try {
      await paymentService.deletePayment(paymentId);
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      showToast('Payment deleted successfully', 'success');
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete payment';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Search payments
  const searchPayments = async (filters = {}) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const results = await paymentService.searchPayments(user.id, filters);
      setPayments(results);
    } catch (err) {
      setError(err.message);
      showToast('Failed to search payments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Get single payment
  const getPayment = async (paymentId) => {
    setIsLoading(true);
    try {
      const payment = await paymentService.getPayment(paymentId);
      return { success: true, payment };
    } catch (err) {
      const errorMessage = err.message || 'Failed to load payment';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Approve payment
  const approvePayment = async (paymentId) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };
    
    setIsLoading(true);
    try {
      const updatedPayment = await paymentService.approvePayment(paymentId, user.id);
      setPayments(prev => 
        prev.map(p => p.id === paymentId ? updatedPayment : p)
      );
      showToast('Payment approved successfully', 'success');
      return { success: true, payment: updatedPayment };
    } catch (err) {
      const errorMessage = err.message || 'Failed to approve payment';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Remove approval
  const removeApproval = async (paymentId) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };
    
    setIsLoading(true);
    try {
      const updatedPayment = await paymentService.removeApproval(paymentId, user.id);
      setPayments(prev => 
        prev.map(p => p.id === paymentId ? updatedPayment : p)
      );
      showToast('Approval removed successfully', 'success');
      return { success: true, payment: updatedPayment };
    } catch (err) {
      const errorMessage = err.message || 'Failed to remove approval';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Get approval status
  const getApprovalStatus = (payment) => {
    return paymentService.getApprovalStatus(payment);
  };

  // Get approval progress
  const getApprovalProgress = (payment) => {
    return paymentService.getApprovalProgress(payment);
  };

  // Load payments on mount and when user/project changes
  useEffect(() => {
    loadPayments();
  }, [user?.id, projectId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    let unsubscribe;
    
    if (projectId) {
      unsubscribe = paymentService.subscribeToProjectPayments(projectId, (updatedPayments) => {
        setPayments(updatedPayments);
      });
    } else {
      unsubscribe = paymentService.subscribeToUserPayments(user.id, (updatedPayments) => {
        // Filter payments for user's projects (simplified)
        setPayments(updatedPayments);
      });
    }

    return () => unsubscribe();
  }, [user?.id, projectId]);

  return {
    payments,
    isLoading,
    error,
    createPayment,
    updatePayment,
    deletePayment,
    searchPayments,
    getPayment,
    approvePayment,
    removeApproval,
    getApprovalStatus,
    getApprovalProgress,
    refreshPayments: loadPayments
  };
};