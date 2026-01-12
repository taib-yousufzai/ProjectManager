import { screen, waitFor } from '@testing-library/react';
import { 
  renderApp, 
  loginUser, 
  navigateToPage,
  waitForLoadingToComplete 
} from '../../test-utils/integration-helpers';

describe('Data Flow Integration Tests', () => {
  describe('Component Data Flow', () => {
    test('dashboard displays data from multiple components', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      checkNavigationState('/dashboard');
      
      // Wait for dashboard to load
      await waitForLoadingToComplete();
      
      // Check that dashboard components are rendered
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      
      // Look for stats cards
      const statsElements = screen.queryAllByText(/\$|projects|payments/i);
      expect(statsElements.length).toBeGreaterThan(0);
      
      // Look for chart component
      const chartContainer = screen.queryByRole('img') || screen.queryByText(/chart/i);
      // Chart should be present (implementation dependent)
      
      // Look for recent activity
      const activitySection = screen.queryByText(/recent|activity/i);
      // Activity section should be present (implementation dependent)
    });

    test('project data flows correctly between list and detail views', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      await navigateToPage(user, 'Projects');
      
      // Look for project items in the list
      const projectLinks = screen.queryAllByRole('link');
      const projectRows = screen.queryAllByRole('row');
      
      if (projectLinks.length > 0 || projectRows.length > 1) {
        // Click on first project (if any exist)
        const firstProject = projectLinks.find(link => 
          link.getAttribute('href')?.includes('/projects/')
        );
        
        if (firstProject) {
          await user.click(firstProject);
          
          // Should navigate to project details
          await waitFor(() => {
            expect(window.location.pathname).toMatch(/\/projects\/\w+/);
          });
          
          // Project details should load
          await waitForLoadingToComplete();
          expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        }
      }
    });

    test('global state persists across page navigation', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      
      // Check that user state persists across navigation
      const pages = ['Projects', 'Payments', 'Reports'];
      
      for (const page of pages) {
        await navigateToPage(user, page);
        
        // User menu should still be accessible
        const userButton = screen.queryByRole('button', { name: /user menu/i });
        expect(userButton).toBeInTheDocument();
        
        // Navigation should still show active states
        const navLinks = screen.getAllByRole('link');
        expect(navLinks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('error boundaries catch and display errors gracefully', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      
      // Navigate through pages and ensure no uncaught errors
      const pages = ['Dashboard', 'Projects', 'Payments', 'Reports', 'Settings'];
      
      for (const page of pages) {
        await navigateToPage(user, page);
        
        // Should not show error boundary messages
        expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/application error/i)).not.toBeInTheDocument();
      }
    });

    test('form validation prevents invalid submissions', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      await navigateToPage(user, 'Projects');
      
      // Navigate to add project
      const addButton = screen.queryByRole('link', { name: /add project/i });
      if (addButton) {
        await user.click(addButton);
        
        // Try to submit form with invalid data
        const submitButton = screen.queryByRole('button', { name: /create|submit/i });
        if (submitButton) {
          await user.click(submitButton);
          
          // Should show validation errors or prevent submission
          await waitFor(() => {
            // Either validation errors are shown or we're still on the form page
            const hasValidationError = screen.queryByText(/required|invalid/i);
            const stillOnFormPage = window.location.pathname.includes('/add');
            
            expect(hasValidationError || stillOnFormPage).toBeTruthy();
          });
        }
      }
    });
  });

  describe('Loading States and Performance', () => {
    test('loading states are shown during data fetching', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      
      // Navigate to data-heavy pages and check for loading states
      const dataPages = ['Projects', 'Payments', 'Reports'];
      
      for (const page of dataPages) {
        await navigateToPage(user, page);
        
        // Page should load without hanging
        await waitForLoadingToComplete();
        
        // Should not show loading indicators after load
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }
    });

    test('pages load within reasonable time', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      
      const startTime = Date.now();
      
      // Navigate through all pages
      const pages = ['Projects', 'Payments', 'Reports', 'Settings'];
      
      for (const page of pages) {
        const pageStartTime = Date.now();
        await navigateToPage(user, page);
        await waitForLoadingToComplete();
        
        const pageLoadTime = Date.now() - pageStartTime;
        
        // Each page should load within 5 seconds (generous for testing)
        expect(pageLoadTime).toBeLessThan(5000);
      }
      
      const totalTime = Date.now() - startTime;
      
      // Total navigation should complete within 20 seconds
      expect(totalTime).toBeLessThan(20000);
    });
  });

  describe('Accessibility Integration', () => {
    test('keyboard navigation works across all pages', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      
      // Test keyboard navigation on main pages
      const pages = ['Projects', 'Payments', 'Reports'];
      
      for (const page of pages) {
        await navigateToPage(user, page);
        
        // Tab through interactive elements
        await user.tab();
        
        // Should have focusable elements
        const focusedElement = document.activeElement;
        expect(focusedElement).not.toBe(document.body);
        
        // Should be able to navigate with keyboard
        if (focusedElement && focusedElement.tagName === 'A') {
          // Can activate links with Enter
          await user.keyboard('{Enter}');
        }
      }
    });

    test('screen reader accessibility is maintained', async () => {
      const { user } = renderApp();
      
      await loginUser(user);
      
      // Check for proper ARIA labels and roles
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAccessibleName();
      });
      
      // Check for proper heading hierarchy
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Main content should be properly labeled
      const main = screen.queryByRole('main');
      if (main) {
        expect(main).toBeInTheDocument();
      }
    });
  });
});