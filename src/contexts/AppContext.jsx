import { createContext, useContext, useReducer, useEffect } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import { reminderService } from '../services/reminderService';

// Initial state
const initialState = {
  theme: 'light',
  sidebarCollapsed: false,
  notifications: [],
  userPreferences: {
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    currency: 'INR',
    emailNotifications: true,
    pushNotifications: true,
  },
  ui: {
    loading: false,
    error: null,
    toast: null,
  },
};

// Action types
const ActionTypes = {
  SET_THEME: 'SET_THEME',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_SIDEBAR_COLLAPSED: 'SET_SIDEBAR_COLLAPSED',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
  UPDATE_USER_PREFERENCES: 'UPDATE_USER_PREFERENCES',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SHOW_TOAST: 'SHOW_TOAST',
  HIDE_TOAST: 'HIDE_TOAST',
  RESET_STATE: 'RESET_STATE',
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_THEME:
      return {
        ...state,
        theme: action.payload,
      };

    case ActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      };

    case ActionTypes.SET_SIDEBAR_COLLAPSED:
      return {
        ...state,
        sidebarCollapsed: action.payload,
      };

    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };

    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.payload
        ),
      };

    case ActionTypes.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
      };

    case ActionTypes.UPDATE_USER_PREFERENCES:
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          ...action.payload,
        },
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: action.payload,
        },
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        ui: {
          ...state.ui,
          error: action.payload,
        },
      };

    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        ui: {
          ...state.ui,
          error: null,
        },
      };

    case ActionTypes.SHOW_TOAST:
      return {
        ...state,
        ui: {
          ...state.ui,
          toast: action.payload,
        },
      };

    case ActionTypes.HIDE_TOAST:
      return {
        ...state,
        ui: {
          ...state.ui,
          toast: null,
        },
      };

    case ActionTypes.RESET_STATE:
      return initialState;

    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// App Provider Component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load saved preferences on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        dispatch({
          type: ActionTypes.UPDATE_USER_PREFERENCES,
          payload: preferences,
        });
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    }

    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) {
      dispatch({
        type: ActionTypes.SET_THEME,
        payload: savedTheme,
      });
    }

    const savedSidebarState = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    if (savedSidebarState) {
      dispatch({
        type: ActionTypes.SET_SIDEBAR_COLLAPSED,
        payload: JSON.parse(savedSidebarState),
      });
    }

    // Initialize reminder services
    reminderService.startAllReminders({
      paymentReminderInterval: 24, // Check every 24 hours
      paymentReminderDays: 7, // Remind for payments pending > 7 days
      cleanupInterval: 24 // Cleanup expired notifications every 24 hours
    });

    // Cleanup on unmount
    return () => {
      reminderService.stopAllReminders();
    };
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.USER_PREFERENCES,
      JSON.stringify(state.userPreferences)
    );
  }, [state.userPreferences]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.SIDEBAR_COLLAPSED,
      JSON.stringify(state.sidebarCollapsed)
    );
  }, [state.sidebarCollapsed]);

  // Action creators
  const actions = {
    setTheme: (theme) => {
      dispatch({ type: ActionTypes.SET_THEME, payload: theme });
    },

    toggleSidebar: () => {
      dispatch({ type: ActionTypes.TOGGLE_SIDEBAR });
    },

    setSidebarCollapsed: (collapsed) => {
      dispatch({ type: ActionTypes.SET_SIDEBAR_COLLAPSED, payload: collapsed });
    },

    addNotification: (notification) => {
      const id = Date.now().toString();
      dispatch({
        type: ActionTypes.ADD_NOTIFICATION,
        payload: { ...notification, id },
      });

      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
      }, 5000);
    },

    removeNotification: (id) => {
      dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
    },

    clearNotifications: () => {
      dispatch({ type: ActionTypes.CLEAR_NOTIFICATIONS });
    },

    updateUserPreferences: (preferences) => {
      dispatch({ type: ActionTypes.UPDATE_USER_PREFERENCES, payload: preferences });
    },

    setLoading: (loading) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
    },

    setError: (error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
    },

    clearError: () => {
      dispatch({ type: ActionTypes.CLEAR_ERROR });
    },

    showToast: (toast) => {
      dispatch({ type: ActionTypes.SHOW_TOAST, payload: toast });

      // Auto-hide toast after 3 seconds
      setTimeout(() => {
        dispatch({ type: ActionTypes.HIDE_TOAST });
      }, 3000);
    },

    hideToast: () => {
      dispatch({ type: ActionTypes.HIDE_TOAST });
    },

    resetState: () => {
      dispatch({ type: ActionTypes.RESET_STATE });
    },
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use app context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export { ActionTypes };