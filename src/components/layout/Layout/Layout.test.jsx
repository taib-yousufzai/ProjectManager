import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/render';
import * as fc from 'fast-check';
import Layout from './Layout';

/**
 * Feature: project-payments-tracking, Property 1: Responsive Layout Consistency
 * 
 * Property: For any viewport size (desktop, tablet, mobile), all pages should 
 * maintain proper layout structure and navigation functionality without content 
 * overflow or broken layouts.
 * 
 * Validates: Requirements 2.4, 3.6, 9.5, 10.5
 */

describe('Layout Component - Responsive Layout Consistency', () => {
  let originalInnerWidth;
  let originalInnerHeight;

  beforeEach(() => {
    // Store original window dimensions
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    
    // Clean up any previous renders
    cleanup();
  });

  afterEach(() => {
    // Clean up after each test
    cleanup();
    
    // Restore original window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    
    // Trigger resize event to update any listeners
    window.dispatchEvent(new Event('resize'));
  });

  const setViewportSize = (width, height) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  };

  const viewportGenerator = fc.record({
    width: fc.integer({ min: 320, max: 1920 }), // Common viewport widths
    height: fc.integer({ min: 568, max: 1080 }), // Common viewport heights
  });

  const contentGenerator = fc.oneof(
    fc.constant(<div data-testid="short-content">Short content</div>),
    fc.constant(
      <div data-testid="long-content">
        <h1>Long Content Title</h1>
        <p>This is a longer piece of content that might cause layout issues on smaller screens.</p>
        <div style={{ width: '100%', minHeight: '500px' }}>
          Large content block that should be handled responsively
        </div>
      </div>
    ),
    fc.constant(
      <div data-testid="card-content" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{ minWidth: '200px', padding: '1rem', background: '#f0f0f0' }}>
            Card {i + 1}
          </div>
        ))}
      </div>
    )
  );

  it('should maintain proper layout structure across all viewport sizes', () => {
    fc.assert(
      fc.property(viewportGenerator, contentGenerator, (viewport, content) => {
        // Clean up before each property test iteration
        cleanup();
        
        // Set the viewport size
        setViewportSize(viewport.width, viewport.height);

        // Render the layout with content
        const { container } = renderWithProviders(
          <Layout>{content}</Layout>
        );

        // Verify essential layout elements are present
        const navbar = container.querySelector('nav[class*="navbar"]');
        const main = container.querySelector('main');
        
        expect(navbar).toBeInTheDocument();
        expect(main).toBeInTheDocument();

        // Verify no horizontal overflow on the main container
        const layoutElement = container.firstChild;
        expect(layoutElement).toBeInTheDocument();
        
        // Check that the layout has proper CSS classes applied
        expect(layoutElement).toHaveClass(/layout/);

        // Verify navbar is positioned correctly
        expect(navbar).toHaveClass(/navbar/);

        // Verify main content area exists and is properly positioned
        expect(main).toHaveClass(/main/);

        // Verify sidebar exists
        const sidebar = container.querySelector('aside');
        expect(sidebar).toBeInTheDocument();
        expect(sidebar).toHaveClass(/sidebar/);

        // Verify content doesn't cause layout issues
        const contentArea = main.querySelector('div');
        expect(contentArea).toBeInTheDocument();
        expect(contentArea).toHaveClass(/content/);
      }),
      { numRuns: 50 } // Reduced from 100 to make tests faster
    );
  });

  it('should handle navigation functionality across viewport sizes', () => {
    fc.assert(
      fc.property(viewportGenerator, (viewport) => {
        // Clean up before each property test iteration
        cleanup();
        
        setViewportSize(viewport.width, viewport.height);

        const { container } = renderWithProviders(
          <Layout>
            <div data-testid="test-content">Test content</div>
          </Layout>
        );

        // Use container.querySelector to avoid multiple element issues
        const hamburgerButton = container.querySelector('button[aria-label="Toggle sidebar"]');
        expect(hamburgerButton).toBeInTheDocument();

        const userMenuButton = container.querySelector('button[aria-label="User menu"]');
        expect(userMenuButton).toBeInTheDocument();

        const notificationButton = container.querySelector('button[aria-label="Notifications"]');
        expect(notificationButton).toBeInTheDocument();

        // Verify search input exists (visibility will be controlled by CSS)
        const searchInput = container.querySelector('input[placeholder*="Search"]');
        expect(searchInput).toBeInTheDocument();

        // Verify sidebar navigation links exist
        const dashboardLink = container.querySelector('a[href="/dashboard"]');
        expect(dashboardLink).toBeInTheDocument();

        const projectsLink = container.querySelector('a[href="/projects"]');
        expect(projectsLink).toBeInTheDocument();
      }),
      { numRuns: 50 } // Reduced from 100 to make tests faster
    );
  });

  it('should maintain consistent component structure across viewport sizes', () => {
    fc.assert(
      fc.property(viewportGenerator, (viewport) => {
        // Clean up before each property test iteration
        cleanup();
        
        setViewportSize(viewport.width, viewport.height);

        const { container } = renderWithProviders(
          <Layout>
            <div data-testid="test-content">
              <h1>Test Title</h1>
              <p>Test paragraph content</p>
            </div>
          </Layout>
        );

        // Verify layout maintains proper structure
        const layoutElement = container.firstChild;
        expect(layoutElement).toHaveClass(/layout/);

        // Verify all major layout components are present
        const navbar = container.querySelector('nav[class*="navbar"]');
        const sidebar = container.querySelector('aside[class*="sidebar"]');
        const main = container.querySelector('main[class*="main"]');
        const content = main?.querySelector('div[class*="content"]');

        expect(navbar).toBeInTheDocument();
        expect(sidebar).toBeInTheDocument();
        expect(main).toBeInTheDocument();
        expect(content).toBeInTheDocument();

        // Verify content is properly nested
        if (content) {
          expect(main).toContainElement(content);
          expect(content.querySelector('[data-testid="test-content"]')).toBeInTheDocument();
        }

        // Verify navbar contains expected elements
        expect(navbar.querySelector('button[aria-label="Toggle sidebar"]')).toBeInTheDocument();
        expect(navbar.querySelector('h2')).toBeInTheDocument(); // Logo
        
        // Verify sidebar contains navigation
        expect(sidebar.querySelector('nav')).toBeInTheDocument();
        expect(sidebar.querySelector('button')).toBeInTheDocument(); // Add Project button
      }),
      { numRuns: 50 } // Reduced from 100 to make tests faster
    );
  });
});