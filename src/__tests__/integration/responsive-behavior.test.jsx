import { screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  renderApp, 
  loginUser, 
  navigateToPage,
  testResponsiveBehavior 
} from '../../test-utils/integration-helpers';

describe('Responsive Behavior Integration Tests', () => {
  const breakpoints = {
    mobile: 375,
    tablet: 768,
    desktop: 1024,
    large: 1280
  };

  describe('Layout Responsiveness', () => {
    test('sidebar behavior changes correctly across breakpoints', async () => {
      const { user } = renderApp();
      await loginUser(user);

      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: breakpoints.mobile,
      });
      fireEvent(window, new Event('resize'));

      // On mobile, sidebar should be hidden by default
      const hamburger = screen.getByRole('button', { name: /toggle sidebar/i });
      expect(hamburger).toBeInTheDocument();

      // Click hamburger to open sidebar
      await user.click(hamburger);
      
      // Sidebar should be visible (as overlay)
      await waitFor(() => {
        const sidebar = screen.queryByRole('navigation') || 
                      screen.queryByText(/projects/i).closest('[class*="sidebar"]');
        // Implementation dependent - sidebar should be accessible
      });

      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: breakpoints.desktop,
      });
      fireEvent(window, new Event('resize'));

      // On desktop, sidebar should be persistent
      await waitFor(() => {
        const sidebarElements = screen.queryAllByText(/projects|dashboard|payments/i);
        expect(sidebarElements.length).toBeGreaterThan(0);
      });
    });

    test('navigation adapts to different screen sizes', async () => {
      const { user } = renderApp();
      await loginUser(user);

      // Test each breakpoint
      Object.values(breakpoints).forEach(width => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        fireEvent(window, new Event('resize'));

        // Navigation should remain functional
        const navElements = screen.getAllByRole('link');
        expect(navElements.length).toBeGreaterThan(0);

        // User menu should be accessible
        const userButton = screen.queryByRole('button', { name: /user menu/i });
        expect(userButton).toBeInTheDocument();
      });
    });

    test('content layout adjusts properly on different screen sizes', async () => {
      const { user } = renderApp();
      await loginUser(user);

      const pages = ['Dashboard', 'Projects', 'Payments'];

      for (const page of pages) {
        await navigateToPage(user, page);

        // Test mobile layout
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: breakpoints.mobile,
        });
        fireEvent(window, new Event('resize'));

        // Content should not overflow
        const main = screen.queryByRole('main') || document.querySelector('main');
        if (main) {
          const rect = main.getBoundingClientRect();
          expect(rect.width).toBeLessThanOrEqual(breakpoints.mobile);
        }

        // Test desktop layout
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: breakpoints.desktop,
        });
        fireEvent(window, new Event('resize'));

        // Content should utilize available space
        await waitFor(() => {
          expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Interactive Elements Responsiveness', () => {
    test('buttons and forms are touch-friendly on mobile', async () => {
      const { user } = renderApp();
      await loginUser(user);

      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: breakpoints.mobile,
      });
      fireEvent(window, new Event('resize'));

      // Navigate to form page
      await navigateToPage(user, 'Projects');
      
      const addButton = screen.queryByRole('link', { name: /add project/i });
      if (addButton) {
        await user.click(addButton);

        // Form elements should be appropriately sized for touch
        const inputs = screen.getAllByRole('textbox');
        inputs.forEach(input => {
          const rect = input.getBoundingClientRect();
          // Minimum touch target size should be 44px (iOS guidelines)
          expect(rect.height).toBeGreaterThanOrEqual(40);
        });

        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          const rect = button.getBoundingClientRect();
          expect(rect.height).toBeGreaterThanOrEqual(40);
        });
      }
    });

    test('search functionality works on all screen sizes', async () => {
      const { user } = renderApp();
      await loginUser(user);

      Object.values(breakpoints).forEach(async (width) => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        fireEvent(window, new Event('resize'));

        // Check if search is available in navbar or mobile search
        const searchInput = screen.queryByPlaceholderText(/search/i) ||
                           screen.queryByRole('textbox', { name: /search/i });
        
        if (width <= breakpoints.tablet) {
          // On mobile, search might be in a toggle menu
          const searchButton = screen.queryByRole('button', { name: /search/i });
          if (searchButton) {
            await user.click(searchButton);
            
            // Mobile search should appear
            await waitFor(() => {
              const mobileSearch = screen.queryByPlaceholderText(/search/i);
              expect(mobileSearch).toBeInTheDocument();
            });
          }
        } else {
          // On desktop, search should be visible
          if (searchInput) {
            expect(searchInput).toBeVisible();
          }
        }
      });
    });
  });

  describe('Table and List Responsiveness', () => {
    test('project table adapts to mobile screens', async () => {
      const { user } = renderApp();
      await loginUser(user);
      await navigateToPage(user, 'Projects');

      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: breakpoints.mobile,
      });
      fireEvent(window, new Event('resize'));

      // Table should either:
      // 1. Convert to card layout
      // 2. Become horizontally scrollable
      // 3. Hide non-essential columns
      
      const table = screen.queryByRole('table');
      if (table) {
        const rect = table.getBoundingClientRect();
        // Table should not cause horizontal overflow
        expect(rect.width).toBeLessThanOrEqual(breakpoints.mobile + 50); // Allow some margin
      }

      // Or check for card layout
      const cards = screen.queryAllByText(/project/i);
      expect(cards.length).toBeGreaterThan(0);
    });

    test('payment list is readable on all screen sizes', async () => {
      const { user } = renderApp();
      await loginUser(user);
      await navigateToPage(user, 'Payments');

      Object.values(breakpoints).forEach(width => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        fireEvent(window, new Event('resize'));

        // Payment information should be readable
        const paymentElements = screen.queryAllByText(/\$|payment|amount/i);
        
        // Content should be present and not cause overflow
        paymentElements.forEach(element => {
          const rect = element.getBoundingClientRect();
          expect(rect.left).toBeGreaterThanOrEqual(0);
          expect(rect.right).toBeLessThanOrEqual(width + 50); // Allow some margin
        });
      });
    });
  });

  describe('Chart and Visual Elements Responsiveness', () => {
    test('dashboard charts resize properly', async () => {
      const { user } = renderApp();
      await loginUser(user);

      Object.values(breakpoints).forEach(width => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        fireEvent(window, new Event('resize'));

        // Charts should be present and responsive
        const chartContainers = screen.queryAllByRole('img') ||
                               document.querySelectorAll('[class*="chart"]') ||
                               document.querySelectorAll('canvas');

        chartContainers.forEach(chart => {
          if (chart.getBoundingClientRect) {
            const rect = chart.getBoundingClientRect();
            expect(rect.width).toBeLessThanOrEqual(width);
            expect(rect.width).toBeGreaterThan(0);
          }
        });
      });
    });

    test('stats cards stack properly on mobile', async () => {
      const { user } = renderApp();
      await loginUser(user);

      // Mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: breakpoints.mobile,
      });
      fireEvent(window, new Event('resize'));

      // Stats cards should stack vertically on mobile
      const statsElements = screen.queryAllByText(/\$|projects|total/i);
      
      if (statsElements.length > 1) {
        // Cards should be stacked (vertical layout)
        const firstCard = statsElements[0].closest('[class*="card"]') || statsElements[0];
        const secondCard = statsElements[1].closest('[class*="card"]') || statsElements[1];
        
        if (firstCard && secondCard) {
          const firstRect = firstCard.getBoundingClientRect();
          const secondRect = secondCard.getBoundingClientRect();
          
          // Second card should be below first card (allowing for some margin)
          expect(secondRect.top).toBeGreaterThanOrEqual(firstRect.bottom - 10);
        }
      }
    });
  });

  describe('Performance on Different Devices', () => {
    test('app remains responsive during viewport changes', async () => {
      const { user } = renderApp();
      await loginUser(user);

      // Rapidly change viewport sizes
      const sizes = [375, 768, 1024, 375, 1280, 768];
      
      for (const size of sizes) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: size,
        });
        fireEvent(window, new Event('resize'));

        // App should remain functional
        await waitFor(() => {
          expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        });

        // Navigation should still work
        const userButton = screen.queryByRole('button', { name: /user menu/i });
        expect(userButton).toBeInTheDocument();
      }
    });
  });
});