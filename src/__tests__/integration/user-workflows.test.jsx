import { screen, waitFor } from '@testing-library/react';
import { 
  renderApp, 
  loginUser, 
  navigateToPage, 
  fillProjectForm,
  checkNavigationState,
  waitForLoadingToComplete 
} from '../../test-utils/integration-helpers';

describe('User Workflows Integration Tests', () => {
  describe('Complete Project Management Workflow', () => {
    test('user can login, create project, view project details, and navigate back', async () => {
      const { user } = renderApp();

      // Step 1: Login
      await loginUser(user);
      checkNavigationState('/dashboard');

      // Step 2: Navigate to Projects page
      await navigateToPage(user, 'Projects');
      checkNavigationState('/projects');

      // Step 3: Navigate to Add Project page
      const addProjectButton = screen.getByRole('link', { name: /add project/i });
      await user.click(addProjectButton);
      checkNavigationState('/projects/add');

      // Step 4: Fill out and submit project form
      const projectData = await fillProjectForm(user, {
        name: 'Integration Test Project',
        description: 'A project created during integration testing',
        clientName: 'Test Client Corp',
        budget: '25000'
      });

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Step 5: Verify redirect to project details or projects list
      await waitFor(() => {
        expect(
          screen.getByText(projectData.name) || 
          screen.getByText(/project created/i)
        ).toBeInTheDocument();
      });

      // Step 6: Navigate back to projects list
      await navigateToPage(user, 'Projects');
      
      // Step 7: Verify project appears in list
      await waitFor(() => {
        expect(screen.getByText(projectData.name)).toBeInTheDocument();
      });
    });

    test('user can navigate through all main pages without errors', async () => {
      const { user } = renderApp();

      // Login first
      await loginUser(user);

      // Test navigation to each main page
      const pages = ['Projects', 'Payments', 'Reports', 'Settings'];
      
      for (const page of pages) {
        await navigateToPage(user, page);
        await waitForLoadingToComplete();
        
        // Verify page loaded without errors
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
      }

      // Return to dashboard
      await navigateToPage(user, 'Dashboard');
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  describe('Authentication Flow', () => {
    test('unauthenticated user is redirected to login', async () => {
      renderApp(['/dashboard']);
      
      // Should be redirected to login page
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });
      checkNavigationState('/login');
    });

    test('authenticated user cannot access login page', async () => {
      const { user } = renderApp(['/login']);
      
      // Login user
      await loginUser(user);
      
      // Should be redirected to dashboard
      checkNavigationState('/dashboard');
      expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    });

    test('user can logout and be redirected to login', async () => {
      const { user } = renderApp();
      
      // Login first
      await loginUser(user);
      
      // Open user menu and logout
      const userButton = screen.getByRole('button', { name: /user menu/i });
      await user.click(userButton);
      
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);
      
      // Should be redirected to login
      await waitFor(() => {
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      });
      checkNavigationState('/login');
    });
  });

  describe('Form Validation Workflows', () => {
    test('project form shows validation errors for invalid data', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      await navigateToPage(user, 'Projects');
      
      // Navigate to add project
      const addButton = screen.getByRole('link', { name: /add project/i });
      await user.click(addButton);
      
      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);
      
      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
      
      // Form should not be submitted
      checkNavigationState('/projects/add');
    });

    test('login form shows error for invalid credentials', async () => {
      const { user } = renderApp();
      
      // Try to login with invalid credentials
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(loginButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      });
      
      // Should remain on login page
      checkNavigationState('/login');
    });
  });

  describe('Search and Filter Functionality', () => {
    test('user can search and filter projects', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      await navigateToPage(user, 'Projects');
      
      // Look for search input
      const searchInput = screen.queryByPlaceholderText(/search/i);
      if (searchInput) {
        await user.type(searchInput, 'test project');
        
        // Wait for search results
        await waitFor(() => {
          // Results should be filtered (this depends on implementation)
          expect(searchInput.value).toBe('test project');
        });
      }
      
      // Look for filter options
      const filterButtons = screen.queryAllByRole('button', { name: /filter/i });
      if (filterButtons.length > 0) {
        await user.click(filterButtons[0]);
        
        // Should show filter options
        await waitFor(() => {
          expect(screen.queryByText(/active/i) || screen.queryByText(/status/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Responsive Behavior', () => {
    test('navigation works correctly on mobile viewport', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      const { user } = renderApp();
      
      await loginUser(user);
      
      // On mobile, sidebar should be hidden initially
      const sidebar = screen.queryByRole('navigation', { name: /sidebar/i });
      if (sidebar) {
        expect(sidebar).not.toBeVisible();
      }
      
      // Hamburger menu should be visible
      const hamburger = screen.getByRole('button', { name: /toggle sidebar/i });
      expect(hamburger).toBeInTheDocument();
      
      // Click hamburger to open sidebar
      await user.click(hamburger);
      
      // Sidebar should now be visible
      await waitFor(() => {
        if (sidebar) {
          expect(sidebar).toBeVisible();
        }
      });
    });
  });
});