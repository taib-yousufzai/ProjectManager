import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import ProjectTable from './ProjectTable';
import { PROJECT_STATUS } from '../../../utils/constants';

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// Property-based test generators - optimized for performance
const projectGenerator = fc.record({
  id: fc.string({ minLength: 3, maxLength: 10 }),
  name: fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length >= 3),
  description: fc.string({ minLength: 15, maxLength: 50 }).filter(s => s.trim().length >= 10),
  clientName: fc.string({ minLength: 3, maxLength: 15 }).filter(s => s.trim().length >= 2),
  status: fc.constantFrom(
    PROJECT_STATUS.ACTIVE,
    PROJECT_STATUS.COMPLETED,
    PROJECT_STATUS.ON_HOLD,
    PROJECT_STATUS.CANCELLED
  ),
  startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  endDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })),
  budget: fc.integer({ min: 1000, max: 50000 }),
  totalPaid: fc.integer({ min: 0, max: 25000 }),
  teamMembers: fc.array(fc.emailAddress(), { minLength: 0, maxLength: 2 }),
  tags: fc.array(fc.string({ minLength: 2, maxLength: 8 }), { minLength: 0, maxLength: 3 }),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
});

const searchTermGenerator = fc.oneof(
  fc.string({ minLength: 0, maxLength: 10 }).filter(s => s.trim().length <= 8), // Shorter search terms
  fc.constantFrom('', 'test', 'project', 'web') // Fewer common search terms
);

describe('ProjectTable Property Tests', () => {
  beforeEach(() => {
    // Clean up any existing DOM elements
    cleanup();
  });

  afterEach(() => {
    // Clean up after each test
    cleanup();
  });
  /**
   * Property 2: Search and Filter Functionality
   * Validates: Requirements 3.2, 3.3, 6.3, 7.2
   * 
   * Feature: project-payments-tracking, Property 2: Search and Filter Functionality
   */
  it('should filter projects correctly based on search terms and status filters', () => {
    fc.assert(
      fc.property(
        fc.array(projectGenerator, { minLength: 1, maxLength: 3 }),
        searchTermGenerator,
        fc.constantFrom('all', PROJECT_STATUS.ACTIVE, PROJECT_STATUS.COMPLETED, PROJECT_STATUS.ON_HOLD, PROJECT_STATUS.CANCELLED),
        (projects, searchTerm, statusFilter) => {
          // Render the component with a unique container
          const { container } = render(
            <TestWrapper>
              <ProjectTable projects={projects} loading={false} />
            </TestWrapper>
          );

          // Apply search filter using container-specific query
          const searchInput = container.querySelector('input[placeholder="Search projects..."]');
          expect(searchInput).toBeTruthy();
          fireEvent.change(searchInput, { target: { value: searchTerm } });

          // Apply status filter using container-specific query
          const statusSelect = container.querySelector('select[id="status-filter"]');
          expect(statusSelect).toBeTruthy();
          fireEvent.change(statusSelect, { target: { value: statusFilter } });

          // Get all visible project rows from this specific container
          const projectRows = container.querySelectorAll('tbody tr');

          // Calculate expected filtered count
          const expectedFilteredProjects = projects.filter(project => {
            const matchesSearch = !searchTerm.trim() || 
              project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              project.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
            
            return matchesSearch && matchesStatus;
          });

          // The displayed count should match our calculation
          const displayedCount = projectRows.length;
          expect(displayedCount).toBe(expectedFilteredProjects.length);

          // Verify each visible project matches the filters
          if (expectedFilteredProjects.length > 0) {
            projectRows.forEach((row) => {
              const rowText = row.textContent.toLowerCase();

              // Check search term matching
              if (searchTerm.trim()) {
                const matchesSearch = projects.some(project => {
                  const projectMatches = 
                    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    project.description.toLowerCase().includes(searchTerm.toLowerCase());
                  
                  return projectMatches && rowText.includes(project.name.toLowerCase());
                });
                
                expect(matchesSearch).toBe(true);
              }

              // Check status filter matching
              if (statusFilter !== 'all') {
                const matchingProject = projects.find(project => 
                  rowText.includes(project.name.toLowerCase())
                );
                
                if (matchingProject) {
                  expect(matchingProject.status).toBe(statusFilter);
                }
              }
            });
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Search functionality preserves filter consistency
   * Validates: Requirements 3.2, 3.3
   * 
   * Feature: project-payments-tracking, Property 2: Search and Filter Functionality
   */
  it('should maintain consistent filtering behavior across different search terms', () => {
    fc.assert(
      fc.property(
        fc.array(projectGenerator, { minLength: 2, maxLength: 4 }),
        fc.array(searchTermGenerator, { minLength: 1, maxLength: 2 }),
        (projects, searchTerms) => {
          const { container } = render(
            <TestWrapper>
              <ProjectTable projects={projects} loading={false} />
            </TestWrapper>
          );

          const searchInput = container.querySelector('input[placeholder="Search projects..."]');
          expect(searchInput).toBeTruthy();
          
          let previousResults = [];

          // Apply each search term and verify consistency
          searchTerms.forEach((searchTerm, index) => {
            fireEvent.change(searchInput, { target: { value: searchTerm } });

            // Get current results
            const currentRows = container.querySelectorAll('tbody tr');
            const currentResults = Array.from(currentRows).map(row => row.textContent);

            // Verify that the same search term produces the same results
            if (index > 0 && searchTerms[index] === searchTerms[index - 1]) {
              expect(currentResults).toEqual(previousResults);
            }

            // Verify that empty search shows all projects
            if (searchTerm.trim() === '') {
              expect(currentRows.length).toBe(projects.length);
            }

            // Verify that search results are a subset of all projects
            expect(currentRows.length).toBeLessThanOrEqual(projects.length);

            previousResults = currentResults;
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Status filter completeness
   * Validates: Requirements 3.3, 6.3
   * 
   * Feature: project-payments-tracking, Property 2: Search and Filter Functionality
   */
  it('should show only projects matching the selected status filter', () => {
    fc.assert(
      fc.property(
        fc.array(projectGenerator, { minLength: 2, maxLength: 6 }),
        fc.constantFrom(PROJECT_STATUS.ACTIVE, PROJECT_STATUS.COMPLETED, PROJECT_STATUS.ON_HOLD, PROJECT_STATUS.CANCELLED),
        (projects, selectedStatus) => {
          const { container } = render(
            <TestWrapper>
              <ProjectTable projects={projects} loading={false} />
            </TestWrapper>
          );

          // Apply status filter
          const statusSelect = container.querySelector('select[id="status-filter"]');
          expect(statusSelect).toBeTruthy();
          fireEvent.change(statusSelect, { target: { value: selectedStatus } });

          // Get all visible project rows
          const projectRows = container.querySelectorAll('tbody tr');

          // Calculate expected projects with this status
          const expectedProjects = projects.filter(project => project.status === selectedStatus);

          // Verify the count matches
          expect(projectRows.length).toBe(expectedProjects.length);

          // Verify each visible project has the correct status
          if (expectedProjects.length > 0) {
            projectRows.forEach((row) => {
              const statusBadge = row.querySelector('[class*="statusBadge"]');
              expect(statusBadge).toBeTruthy();
              
              // The status badge should contain the selected status text
              const statusText = selectedStatus.replace('-', ' ').toUpperCase();
              expect(statusBadge.textContent).toBe(statusText);
            });
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Combined search and filter functionality
   * Validates: Requirements 3.2, 3.3, 7.2
   * 
   * Feature: project-payments-tracking, Property 2: Search and Filter Functionality
   */
  it('should correctly combine search and status filters', () => {
    fc.assert(
      fc.property(
        fc.array(projectGenerator, { minLength: 2, maxLength: 6 }),
        searchTermGenerator,
        fc.constantFrom(PROJECT_STATUS.ACTIVE, PROJECT_STATUS.COMPLETED, PROJECT_STATUS.ON_HOLD, PROJECT_STATUS.CANCELLED),
        (projects, searchTerm, statusFilter) => {
          const { container } = render(
            <TestWrapper>
              <ProjectTable projects={projects} loading={false} />
            </TestWrapper>
          );

          // Apply both filters
          const searchInput = container.querySelector('input[placeholder="Search projects..."]');
          const statusSelect = container.querySelector('select[id="status-filter"]');
          
          expect(searchInput).toBeTruthy();
          expect(statusSelect).toBeTruthy();
          
          fireEvent.change(searchInput, { target: { value: searchTerm } });
          fireEvent.change(statusSelect, { target: { value: statusFilter } });

          // Get visible results
          const projectRows = container.querySelectorAll('tbody tr');

          // Calculate expected results manually
          const expectedProjects = projects.filter(project => {
            const matchesSearch = !searchTerm.trim() || 
              project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              project.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = project.status === statusFilter;
            
            return matchesSearch && matchesStatus;
          });

          // Verify the results match our expectation
          expect(projectRows.length).toBe(expectedProjects.length);

          // If there are results, verify each one matches both criteria
          if (expectedProjects.length > 0) {
            projectRows.forEach((row) => {
              const rowText = row.textContent.toLowerCase();
              
              // Find the matching project
              const matchingProject = projects.find(project => 
                rowText.includes(project.name.toLowerCase())
              );

              expect(matchingProject).toBeDefined();
              expect(matchingProject.status).toBe(statusFilter);

              if (searchTerm.trim()) {
                const searchMatches = 
                  matchingProject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  matchingProject.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  matchingProject.description.toLowerCase().includes(searchTerm.toLowerCase());
                
                expect(searchMatches).toBe(true);
              }
            });
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});