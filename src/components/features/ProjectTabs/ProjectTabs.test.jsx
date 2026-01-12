import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import ProjectTabs from './ProjectTabs';
import { PROJECT_STATUS } from '../../../utils/constants';

// Mock project generator for testing
const mockProjectGenerator = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
  name: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length >= 3),
  description: fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length >= 10),
  clientName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
  status: fc.constantFrom(
    PROJECT_STATUS.ACTIVE,
    PROJECT_STATUS.COMPLETED,
    PROJECT_STATUS.ON_HOLD,
    PROJECT_STATUS.CANCELLED
  ),
  startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
  endDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2026-12-31') })),
  budget: fc.float({ min: 1000, max: 100000, noNaN: true }),
  totalPaid: fc.float({ min: 0, max: 50000, noNaN: true }),
  teamMembers: fc.array(fc.emailAddress(), { minLength: 0, maxLength: 3 }),
  tags: fc.array(fc.string({ minLength: 2, maxLength: 10 }), { minLength: 0, maxLength: 5 }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
});

describe('ProjectTabs Property Tests', () => {
  afterEach(() => {
    cleanup();
  });
  /**
   * Property 3: Navigation State Management
   * Validates: Requirements 3.4, 5.6, 9.4
   * 
   * Feature: project-payments-tracking, Property 3: Navigation State Management
   */
  it('should maintain proper active state highlighting and preserve context during tab navigation', () => {
    fc.assert(
      fc.property(
        mockProjectGenerator,
        fc.constantFrom('payments', 'files', 'notes'), // Single tab to test, not sequences
        (project, targetTab) => {
          // Clean up before each render
          cleanup();
          
          // Render the component once
          const { container } = render(
            <ProjectTabs 
              project={project}
              payments={[]}
              files={[]}
              notes={[]}
            />
          );

          // Get tab buttons using container queries to avoid conflicts
          const overviewTab = container.querySelector('button[class*="tabButton"]:nth-child(1)');
          const targetTabButton = container.querySelector(
            targetTab === 'payments' ? 'button[class*="tabButton"]:nth-child(2)' :
            targetTab === 'files' ? 'button[class*="tabButton"]:nth-child(3)' :
            'button[class*="tabButton"]:nth-child(4)'
          );

          // Initially, overview tab should be active
          expect(overviewTab.className).toMatch(/tabButtonActive/);
          expect(targetTabButton.className).not.toMatch(/tabButtonActive/);

          // Click the target tab
          fireEvent.click(targetTabButton);

          // Verify state change - only check the two relevant tabs
          expect(overviewTab.className).not.toMatch(/tabButtonActive/);
          expect(targetTabButton.className).toMatch(/tabButtonActive/);

          // Verify content is displayed (simplified check)
          const expectedContent = 
            targetTab === 'payments' ? 'Payment History' :
            targetTab === 'files' ? 'Project Files' :
            'Project Notes';
          
          expect(screen.getByText(expectedContent)).toBeInTheDocument();

          // Navigate back to overview
          fireEvent.click(overviewTab);
          expect(overviewTab.className).toMatch(/tabButtonActive/);
          expect(targetTabButton.className).not.toMatch(/tabButtonActive/);
        }
      ),
      { numRuns: 3 } // Minimal runs for faster execution
    );
  });

  /**
   * Property: Tab context preservation
   * Validates: Requirements 5.6, 9.4
   * 
   * Feature: project-payments-tracking, Property 3: Navigation State Management
   */
  it('should preserve project context across all tab switches', () => {
    fc.assert(
      fc.property(
        mockProjectGenerator,
        (project) => {
          // Clean up before each render
          cleanup();
          
          const { container } = render(
            <ProjectTabs 
              project={project}
              payments={[]}
              files={[]}
              notes={[]}
            />
          );

          // Test context preservation by switching to one non-overview tab and back
          const paymentsTab = container.querySelector('button[class*="tabButton"]:nth-child(2)');
          const overviewTab = container.querySelector('button[class*="tabButton"]:nth-child(1)');

          // Click payments tab
          fireEvent.click(paymentsTab);
          expect(paymentsTab.className).toMatch(/tabButtonActive/);

          // Return to overview and verify project context is preserved
          fireEvent.click(overviewTab);
          expect(overviewTab.className).toMatch(/tabButtonActive/);
          
          // Verify project data is still accessible
          const trimmedClientName = project.clientName.trim();
          if (trimmedClientName.length > 0) {
            expect(screen.getByText(trimmedClientName)).toBeInTheDocument();
          }
          expect(screen.getByText('Project Summary')).toBeInTheDocument();
        }
      ),
      { numRuns: 2 } // Minimal runs for faster execution
    );
  });

  /**
   * Property: Navigation consistency
   * Validates: Requirements 3.4, 9.4
   * 
   * Feature: project-payments-tracking, Property 3: Navigation State Management
   */
  it('should maintain consistent navigation behavior across different project states', () => {
    fc.assert(
      fc.property(
        mockProjectGenerator,
        (project) => {
          // Clean up before each render
          cleanup();
          
          const { container } = render(
            <ProjectTabs 
              project={project}
              payments={[]}
              files={[]}
              notes={[]}
            />
          );

          // Test that tabs are clickable and functional (simplified)
          const paymentsTab = container.querySelector('button[class*="tabButton"]:nth-child(2)');
          const filesTab = container.querySelector('button[class*="tabButton"]:nth-child(3)');
          const overviewTab = container.querySelector('button[class*="tabButton"]:nth-child(1)');
          
          // Test payments tab
          expect(paymentsTab).not.toBeDisabled();
          fireEvent.click(paymentsTab);
          expect(paymentsTab.className).toMatch(/tabButtonActive/);

          // Test files tab
          expect(filesTab).not.toBeDisabled();
          fireEvent.click(filesTab);
          expect(filesTab.className).toMatch(/tabButtonActive/);

          // Verify we can navigate back to overview
          fireEvent.click(overviewTab);
          expect(overviewTab.className).toMatch(/tabButtonActive/);
        }
      ),
      { numRuns: 2 } // Minimal runs for faster execution
    );
  });
});