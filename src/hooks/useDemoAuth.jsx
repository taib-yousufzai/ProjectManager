import { useState, useEffect, createContext, useContext } from 'react';

// Demo Auth Context for testing when Firebase is not accessible
const DemoAuthContext = createContext();

// Demo user data
const DEMO_USER = {
  id: 'demo-user-123',
  email: 'demo@example.com',
  firstName: 'Demo',
  lastName: 'User',
  role: 'admin',
  permissions: ['all'],
  createdAt: new Date(),
  lastLoginAt: new Date()
};

// Demo Auth Provider Component
export const DemoAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email, password) => {
    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple demo validation
    if (email === 'demo@example.com' && password === 'demo123') {
      setUser(DEMO_USER);
      localStorage.setItem('demoUser', JSON.stringify(DEMO_USER));
      setIsLoading(false);
      return { success: true };
    }
    
    setIsLoading(false);
    return { 
      success: false, 
      error: 'Demo credentials: demo@example.com / demo123' 
    };
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('demoUser');
    return { success: true };
  };

  const register = async (userData) => {
    // Demo registration always succeeds
    const newUser = {
      ...DEMO_USER,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName
    };
    
    setUser(newUser);
    localStorage.setItem('demoUser', JSON.stringify(newUser));
    return { success: true };
  };

  // Check for existing demo session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('demoUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved demo user:', error);
        localStorage.removeItem('demoUser');
      }
    }
  }, []);

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
    isAuthenticated: !!user,
  };

  return (
    <DemoAuthContext.Provider value={value}>
      {children}
    </DemoAuthContext.Provider>
  );
};

// Custom hook to use demo auth context
export const useDemoAuth = () => {
  const context = useContext(DemoAuthContext);
  if (!context) {
    throw new Error('useDemoAuth must be used within a DemoAuthProvider');
  }
  return context;
};