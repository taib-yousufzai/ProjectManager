import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth.jsx';
import { AppProvider } from '../contexts/AppContext.jsx';

// Custom render function that includes providers
export const renderWithProviders = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <AppProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </AppProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything from testing library
export * from '@testing-library/react';