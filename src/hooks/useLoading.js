import { useState, useCallback } from 'react';

/**
 * Custom hook for managing loading states
 * @param {boolean} initialState - Initial loading state
 * @returns {Object} Loading state and control functions
 */
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const setLoadingError = useCallback((error) => {
    setIsLoading(false);
    setError(error);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    reset,
  };
};

/**
 * Custom hook for managing multiple loading states
 * @param {Array<string>} keys - Array of loading state keys
 * @returns {Object} Loading states and control functions
 */
export const useMultipleLoading = (keys = []) => {
  const [loadingStates, setLoadingStates] = useState(
    keys.reduce((acc, key) => ({ ...acc, [key]: false }), {})
  );
  const [errors, setErrors] = useState(
    keys.reduce((acc, key) => ({ ...acc, [key]: null }), {})
  );

  const setLoading = useCallback((key, isLoading) => {
    setLoadingStates(prev => ({ ...prev, [key]: isLoading }));
    if (isLoading) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  }, []);

  const setError = useCallback((key, error) => {
    setLoadingStates(prev => ({ ...prev, [key]: false }));
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);

  const reset = useCallback((key) => {
    if (key) {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
      setErrors(prev => ({ ...prev, [key]: null }));
    } else {
      setLoadingStates(keys.reduce((acc, k) => ({ ...acc, [k]: false }), {}));
      setErrors(keys.reduce((acc, k) => ({ ...acc, [k]: null }), {}));
    }
  }, [keys]);

  const isAnyLoading = Object.values(loadingStates).some(Boolean);

  return {
    loadingStates,
    errors,
    setLoading,
    setError,
    reset,
    isAnyLoading,
  };
};

/**
 * Custom hook for async operations with loading state
 * @param {Function} asyncFunction - The async function to execute
 * @returns {Object} Execute function and loading state
 */
export const useAsyncOperation = (asyncFunction) => {
  const { isLoading, error, startLoading, stopLoading, setLoadingError } = useLoading();

  const execute = useCallback(async (...args) => {
    try {
      startLoading();
      const result = await asyncFunction(...args);
      stopLoading();
      return result;
    } catch (err) {
      setLoadingError(err);
      throw err;
    }
  }, [asyncFunction, startLoading, stopLoading, setLoadingError]);

  return {
    execute,
    isLoading,
    error,
  };
};

export default useLoading;