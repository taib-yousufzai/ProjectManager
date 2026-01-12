import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { AppProvider } from '../contexts/AppContext';
import { ProtectedRoute } from '../components/auth';
import Layout from '../components/layout/Layout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { 
  Login, 
  Dashboard, 
  Projects, 
  AddProject, 
  ProjectDetails, 
  Payments, 
  Reports, 
  Settings 
} from '../pages';

// App Routes component for testing
const TestAppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public route */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        } 
      />
      
      {/* Protected routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/add" element={<AddProject />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

// Custom render function for integration tests
export const renderApp = (initialEntries = ['/']) => {
  const user = userEvent.setup();
  
  const AppWithProviders = () => (
    <MemoryRouter initialEntries={initialEntries}>
      <ErrorBoundary
        title="Test Application Error"
        message="Something went wrong during testing."
        showReload={false}
      >
        <AppProvider>
          <AuthProvider>
            <TestAppRoutes />
          </AuthProvider>
        </AppProvider>
      </ErrorBoundary>
    </MemoryRouter>
  );

  return {
    user,
    ...render(<AppWithProviders />),
  };
};

// Helper to login a user
export const loginUser = async (user, email = 'admin@example.com', password = 'password') => {
  // Wait for login form to be available
  await waitFor(() => {
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  // Fill in login form
  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);
  const loginButton = screen.getByRole('button', { name: /sign in/i });

  await user.clear(emailInput);
  await user.type(emailInput, email);
  await user.clear(passwordInput);
  await user.type(passwordInput, password);
  await user.click(loginButton);

  // Wait for redirect to dashboard
  await waitFor(() => {
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });
};

// Helper to navigate to a page
export const navigateToPage = async (user, pageName) => {
  const link = screen.getByRole('link', { name: new RegExp(pageName, 'i') });
  await user.click(link);
  
  await waitFor(() => {
    expect(screen.getByText(new RegExp(pageName, 'i'))).toBeInTheDocument();
  });
};

// Helper to wait for loading to complete
export const waitForLoadingToComplete = async () => {
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

// Helper to check responsive behavior
export const testResponsiveBehavior = (breakpoints = [320, 768, 1024, 1280]) => {
  return breakpoints.map(width => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    
    // Trigger resize event
    fireEvent(window, new Event('resize'));
    
    return width;
  });
};

// Helper to check navigation state
export const checkNavigationState = (expectedPath) => {
  expect(window.location.pathname).toBe(expectedPath);
};

// Helper to fill out project form
export const fillProjectForm = async (user, projectData = {}) => {
  const defaultData = {
    name: 'Test Project',
    description: 'Test project description',
    clientName: 'Test Client',
    budget: '10000',
    startDate: '2024-01-01',
    ...projectData
  };

  // Fill form fields
  if (defaultData.name) {
    const nameInput = screen.getByLabelText(/project name/i);
    await user.clear(nameInput);
    await user.type(nameInput, defaultData.name);
  }

  if (defaultData.description) {
    const descInput = screen.getByLabelText(/description/i);
    await user.clear(descInput);
    await user.type(descInput, defaultData.description);
  }

  if (defaultData.clientName) {
    const clientInput = screen.getByLabelText(/client name/i);
    await user.clear(clientInput);
    await user.type(clientInput, defaultData.clientName);
  }

  if (defaultData.budget) {
    const budgetInput = screen.getByLabelText(/budget/i);
    await user.clear(budgetInput);
    await user.type(budgetInput, defaultData.budget);
  }

  if (defaultData.startDate) {
    const dateInput = screen.getByLabelText(/start date/i);
    await user.clear(dateInput);
    await user.type(dateInput, defaultData.startDate);
  }

  return defaultData;
};

// Helper to check accessibility
export const checkAccessibility = () => {
  // Check for proper heading hierarchy
  const headings = screen.getAllByRole('heading');
  expect(headings.length).toBeGreaterThan(0);

  // Check for proper form labels
  const inputs = screen.getAllByRole('textbox');
  inputs.forEach(input => {
    expect(input).toHaveAccessibleName();
  });

  // Check for proper button labels
  const buttons = screen.getAllByRole('button');
  buttons.forEach(button => {
    expect(button).toHaveAccessibleName();
  });
};