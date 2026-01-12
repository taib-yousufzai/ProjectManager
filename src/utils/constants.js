// Application constants
export const APP_NAME = 'ProjectTracker';
export const APP_VERSION = '1.0.0';

// API endpoints (placeholder)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
};

// Route paths
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  ADD_PROJECT: '/projects/add',
  PROJECT_DETAILS: '/projects/:id',
  PAYMENTS: '/payments',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  REVENUE_RULES: '/revenue-rules',
  LEDGER: '/ledger',
};

// Breakpoints (matching CSS variables)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
};

// Status options
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ON_HOLD: 'on-hold',
  CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};