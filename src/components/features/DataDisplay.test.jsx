import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import ProjectTable from './ProjectTable/ProjectTable';
import ProjectTabs from './ProjectTabs/ProjectTabs';
import { PROJECT_STATUS } from '../../utils/constants';

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// Ensure cleanup after each test
afterEach(() => {
  cleanup();
});

// Improved generators with better validation
const simpleProjectGenerator = fc.record({
  id: fc.string({ minLength: 1, maxLength: 5 }).filter(id => id.trim().length > 0),
  name: fc.string({ minLength: 3, maxLength: 15 }).filter(name => {
    const trimmed = name.trim();
    return trimmed.length >= 3 && trimmed.length <= 15 && /^[a-zA-Z0-9\s\-_]+$/.test(trimmed);
  }),
  description: fc.string({ minLength: 10, maxLength: 50 }).filter(desc => {
    const trimmed = desc.trim();
    return trimmed.length >= 10 && trimmed.length <= 50 && /^[a-zA-Z0-9\s\-_.,!?]+$/.test(trimmed);
  }),
  clientName: fc.string({ minLength: 2, maxLength: 15 }).filter(client => {
    const trimmed = client.trim();
    return trimmed.length >= 2 && trimmed.length <= 15 && /^[a-zA-Z0-9\s\-_]+$/.test(trimmed);
  }),
  status: fc.constantFrom(PROJECT_STATUS.ACTIVE, PROJECT_STATUS.COMPLETED),
  startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  endDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })),
  budget: fc.integer({ min: 1000, max: 50000 }),
  totalPaid: fc.integer({ min: 0, max: 25000 }),
  teamMembers: fc.array(fc.emailAddress(), { minLength: 0, maxLength: 2 }),
  tags: fc.array(fc.string({ minLength: 2, maxLength: 8 }).filter(tag => /^[a-zA-Z0-9\-_]+$/.test(tag)), { minLength: 0, maxLength: 3 }),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
});

describe('Data Display Completeness Property Tests', () => {
  /**
   * Property 4: Data Display Completeness
   * Validates: Requirements 3.5, 6.2, 6.5, 7.3
   * 
   * Feature: project-payments-tracking, Property 4: Data Display Completeness
   */
  it('should display all required project fields in table view', () => {
    fc.assert(
      fc.property(
        simpleProjectGenerator,
        (project) => {
          const { unmount } = render(
            <TestWrapper>
              <ProjectTable projects={[project]} loading={false} />
            </TestWrapper>
          );

          try {
            // Check that the project displays its required fields
            // Project name should be displayed
            expect(screen.getByText(project.name)).toBeInTheDocument();
            
            // Client name should be displayed
            expect(screen.getByText(project.clientName)).toBeInTheDocument();
            
            // Status should be displayed (check for status text)
            const statusText = project.status.replace('-', ' ').toUpperCase();
            expect(screen.getByText(statusText)).toBeInTheDocument();
            
            // Budget should be displayed (check for currency format with decimals)
            const budgetText = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(project.budget);
            expect(screen.getByText(budgetText)).toBeInTheDocument();
            
            // Total paid should be displayed
            const paidText = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(project.totalPaid);
            expect(screen.getByText(paidText)).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 10 } // Increased runs since we're testing single projects
    );
  });

  /**
   * Property: Project details completeness in tabs view
   * Validates: Requirements 6.2, 6.5, 7.3
   * 
   * Feature: project-payments-tracking, Property 4: Data Display Completeness
   */
  it('should display all required project details in overview tab', () => {
    fc.assert(
      fc.property(
        simpleProjectGenerator,
        (project) => {
          const { unmount } = render(
            <ProjectTabs 
              project={project}
              payments={[]}
              files={[]}
              notes={[]}
            />
          );

          try {
            // Check that project summary displays required information
            expect(screen.getByText('Project Summary')).toBeInTheDocument();
            expect(screen.getByText('Financial Overview')).toBeInTheDocument();
            
            // Client name should be displayed
            expect(screen.getByText(project.clientName)).toBeInTheDocument();
            
            // Status should be displayed
            const statusText = project.status.replace('-', ' ').toUpperCase();
            expect(screen.getByText(statusText)).toBeInTheDocument();
            
            // Budget information should be displayed (use correct currency format)
            const budgetText = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(project.budget);
            expect(screen.getByText(budgetText)).toBeInTheDocument();
            
            // Total paid should be displayed
            const paidText = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(project.totalPaid);
            expect(screen.getByText(paidText)).toBeInTheDocument();
            
            // Project description should be displayed
            expect(screen.getByText(project.description)).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 5 } // Reduced runs for fast execution
    );
  });

  /**
   * Property: Status indicators consistency
   * Validates: Requirements 3.5, 7.3
   * 
   * Feature: project-payments-tracking, Property 4: Data Display Completeness
   */
  it('should consistently display status indicators with proper formatting', () => {
    fc.assert(
      fc.property(
        simpleProjectGenerator,
        (project) => {
          const { unmount } = render(
            <TestWrapper>
              <ProjectTable projects={[project]} loading={false} />
            </TestWrapper>
          );

          try {
            // Verify project's status is properly formatted and displayed
            const statusText = project.status.replace('-', ' ').toUpperCase();
            const statusElement = screen.getByText(statusText);
            
            // Status should be displayed
            expect(statusElement).toBeInTheDocument();
            
            // Status should have appropriate styling (check for badge class)
            expect(statusElement.closest('[class*="statusBadge"]')).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 5 } // Reduced runs for fast execution
    );
  });

  /**
   * Property: Financial data formatting consistency
   * Validates: Requirements 6.2, 6.5
   * 
   * Feature: project-payments-tracking, Property 4: Data Display Completeness
   */
  it('should consistently format and display financial data', () => {
    fc.assert(
      fc.property(
        simpleProjectGenerator,
        (project) => {
          const { unmount } = render(
            <TestWrapper>
              <ProjectTable projects={[project]} loading={false} />
            </TestWrapper>
          );

          try {
            // Check that financial data is properly formatted
            // Budget should be displayed as currency (with correct format)
            const budgetText = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(project.budget);
            expect(screen.getByText(budgetText)).toBeInTheDocument();
            
            // Total paid should be displayed as currency
            const paidText = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(project.totalPaid);
            expect(screen.getByText(paidText)).toBeInTheDocument();
            
            // Progress bar should be present for payment progress
            const progressBar = document.querySelector('[class*="progressBar"]');
            expect(progressBar).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 5 } // Reduced runs for fast execution
    );
  });
});