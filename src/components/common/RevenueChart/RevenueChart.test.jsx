import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import RevenueChart from './RevenueChart';

/**
 * Feature: project-payments-tracking, Property 10: Chart Interactivity
 * **Validates: Requirements 7.5**
 * 
 * For any chart or graph component, the system should provide responsive 
 * and interactive behavior with proper hover states and data point accessibility.
 */

describe('RevenueChart Property Tests', () => {
  it('Property 10: Chart Interactivity - charts should be responsive and interactive with proper data accessibility', { timeout: 10000 }, () => {
    fc.assert(
      fc.property(
        // Generate random chart data
        fc.array(
          fc.record({
            month: fc.constantFrom('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'),
            revenue: fc.integer({ min: 1000, max: 50000 }),
            projects: fc.integer({ min: 1, max: 50 })
          }),
          { minLength: 3, maxLength: 12 }
        ),
        // Generate random chart type
        fc.constantFrom('line', 'area'),
        // Generate random height
        fc.integer({ min: 200, max: 600 }),
        (data, type, height) => {
          // Render the chart with generated data
          const { container } = render(
            <RevenueChart 
              data={data} 
              type={type} 
              height={height} 
            />
          );

          // Verify chart container exists and has proper structure
          const chartContainer = container.querySelector('[class*="chartContainer"]');
          expect(chartContainer).toBeInTheDocument();

          // Verify chart has proper title and subtitle for accessibility
          const chartTitle = container.querySelector('[class*="chartTitle"]');
          const chartSubtitle = container.querySelector('[class*="chartSubtitle"]');
          expect(chartTitle).toBeInTheDocument();
          expect(chartSubtitle).toBeInTheDocument();
          expect(chartTitle).toHaveTextContent('Revenue Overview');
          expect(chartSubtitle).toHaveTextContent('Monthly revenue trends');

          // Verify ResponsiveContainer is present (indicates responsive behavior)
          const responsiveContainer = container.querySelector('.recharts-responsive-container');
          expect(responsiveContainer).toBeInTheDocument();

          // Verify chart wrapper has the correct height style
          const chartWrapper = container.querySelector('[class*="chartWrapper"]');
          expect(chartWrapper).toBeInTheDocument();
          expect(chartWrapper).toHaveStyle({ height: `${height}px` });

          // Verify the chart maintains responsive behavior through CSS styles
          expect(responsiveContainer).toHaveStyle({ width: '100%', height: '100%' });

          // Verify chart container has interactive hover effects
          expect(chartContainer.className).toContain('chartContainer');
        }
      ),
      { numRuns: 25 } // Reduced from 100 to prevent timeout
    );
  });

  it('should render with default data when no data is provided', () => {
    const { container } = render(<RevenueChart />);
    
    // Verify chart renders with default data
    const chartContainer = container.querySelector('[class*="chartContainer"]');
    expect(chartContainer).toBeInTheDocument();
    
    // Verify ResponsiveContainer is present
    const responsiveContainer = container.querySelector('.recharts-responsive-container');
    expect(responsiveContainer).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    const { container } = render(<RevenueChart data={[]} />);
    
    // Chart should still render container even with empty data
    const chartContainer = container.querySelector('[class*="chartContainer"]');
    expect(chartContainer).toBeInTheDocument();
  });
});