import { useCallback } from 'react';
import { useApp } from '../contexts/AppContext';

export const useToast = () => {
  const { ui, showToast, hideToast } = useApp();

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const toast = {
      message,
      type,
      duration: options.duration || 4000,
      position: options.position || 'top-right',
      ...options
    };

    showToast(toast);
  }, [showToast]);

  const removeToast = useCallback(() => {
    hideToast();
  }, [hideToast]);

  // Convenience methods
  const success = useCallback((message, options) => {
    return addToast(message, 'success', options);
  }, [addToast]);

  const error = useCallback((message, options) => {
    return addToast(message, 'error', { duration: 6000, ...options });
  }, [addToast]);

  const warning = useCallback((message, options) => {
    return addToast(message, 'warning', options);
  }, [addToast]);

  const info = useCallback((message, options) => {
    return addToast(message, 'info', options);
  }, [addToast]);

  return {
    toast: ui.toast,
    showToast: addToast, // Expose showToast as an alias for compatibility
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
};

export default useToast;