import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './useAuth';
import { STORAGE_KEYS } from '../utils/constants';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  it('initializes with no user when no token in localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('initializes with user when token exists in localStorage', async () => {
    localStorageMock.getItem.mockReturnValue('mock-token');
    
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual({
      id: '1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('successfully logs in with valid credentials', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('admin@example.com', 'password');
    });

    expect(loginResult.success).toBe(true);
    expect(result.current.user).toEqual({
      id: '1',
      email: 'admin@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.AUTH_TOKEN,
      'mock-jwt-token'
    );
  });

  it('fails login with invalid credentials', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('wrong@example.com', 'wrongpassword');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toContain('Invalid email or password');
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('logs out user and clears localStorage', async () => {
    // Start with authenticated user
    localStorageMock.getItem.mockReturnValue('mock-token');
    
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
  });

  it('throws error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});