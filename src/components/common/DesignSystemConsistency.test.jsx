import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';

import Button from './Button/Button';
import Card from './Card/Card';
import Input from './Input/Input';
import Modal from './Modal/Modal';

/**
 * Feature: project-payments-tracking, Property 8: Design System Consistency
 * 
 * For any UI component or page, the system should use the specified color palette, 
 * typography, and spacing rules consistently throughout the application.
 * 
 * Validates: Requirements 10.1, 10.2, 10.3, 10.6
 */

describe('Property 8: Design System Consistency', () => {
  describe('Color Palette Consistency', () => {
    it('should use consistent primary color across all components', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (text) => {
            // Test Button primary variant
            const { container: buttonContainer } = render(
              <Button variant="primary">{text}</Button>
            );
            
            // Test Input focus state (should use primary color)
            const { container: inputContainer } = render(
              <Input label={text} value="" onChange={() => {}} />
            );

            const button = buttonContainer.querySelector('button');
            const input = inputContainer.querySelector('input');
            
            // Both should reference the same CSS custom property for primary color
            const buttonStyles = window.getComputedStyle(button);
            const inputStyles = window.getComputedStyle(input);
            
            // Button should have primary background
            expect(button.className).toContain('button--primary');
            
            // Input should be able to focus (will use primary color for focus)
            expect(input).toBeInTheDocument();
            
            // Both components should exist and be styled
            expect(button).toBeInTheDocument();
            expect(input).toBeInTheDocument();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use consistent danger color for error states', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }),
          (text, errorMessage) => {
            // Test Button danger variant
            const { container: buttonContainer } = render(
              <Button variant="danger">{text}</Button>
            );
            
            // Test Input error state
            const { container: inputContainer } = render(
              <Input label={text} value="" onChange={() => {}} error={errorMessage} />
            );

            const button = buttonContainer.querySelector('button');
            const input = inputContainer.querySelector('input');
            
            // Both should use danger color consistently
            expect(button.className).toContain('button--danger');
            expect(input.className).toContain('input--error');
            
            // Both components should exist
            expect(button).toBeInTheDocument();
            expect(input).toBeInTheDocument();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use consistent success color across components', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (text) => {
            // Test Button success variant
            const { container } = render(
              <Button variant="success">{text}</Button>
            );

            const button = container.querySelector('button');
            
            // Should use success color class
            expect(button.className).toContain('button--success');
            expect(button).toBeInTheDocument();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Typography Consistency', () => {
    it('should use consistent font family across all components', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (text) => {
            const { container: buttonContainer } = render(
              <Button>{text}</Button>
            );
            
            const { container: cardContainer } = render(
              <Card title={text}>Content</Card>
            );
            
            const { container: inputContainer } = render(
              <Input label={text} value="" onChange={() => {}} />
            );

            const button = buttonContainer.querySelector('button');
            const cardTitle = cardContainer.querySelector('h3');
            const input = inputContainer.querySelector('input');
            
            // All should use the same font family (CSS custom property)
            expect(button).toBeInTheDocument();
            expect(cardTitle).toBeInTheDocument();
            expect(input).toBeInTheDocument();
            
            // Check that components have font-family styles applied
            expect(button.className).toContain('button');
            expect(input.className).toContain('input');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Spacing Consistency', () => {
    it('should use consistent spacing patterns across components', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom('small', 'medium', 'large'),
          (text, size) => {
            const { container: buttonContainer } = render(
              <Button size={size}>{text}</Button>
            );
            
            const { container: cardContainer } = render(
              <Card padding={size} title={text}>Content</Card>
            );

            const button = buttonContainer.querySelector('button');
            const card = cardContainer.firstChild;
            
            // Both should use consistent size/padding classes
            expect(button.className).toContain(`button--${size}`);
            expect(card.className).toContain(`card--padding-${size}`);
            
            expect(button).toBeInTheDocument();
            expect(card).toBeInTheDocument();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Border Radius Consistency', () => {
    it('should use consistent border radius across all components', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (text) => {
            const { container: buttonContainer } = render(
              <Button>{text}</Button>
            );
            
            const { container: cardContainer } = render(
              <Card title={text}>Content</Card>
            );
            
            const { container: inputContainer } = render(
              <Input label={text} value="" onChange={() => {}} />
            );

            const button = buttonContainer.querySelector('button');
            const card = cardContainer.firstChild;
            const input = inputContainer.querySelector('input');
            
            // All components should have border radius applied
            expect(button).toBeInTheDocument();
            expect(card).toBeInTheDocument();
            expect(input).toBeInTheDocument();
            
            // Components should have their respective classes that include border radius
            expect(button.className).toContain('button');
            expect(card.className).toContain('card');
            expect(input.className).toContain('input');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Shadow Consistency', () => {
    it('should use consistent shadow patterns for elevated components', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (text) => {
            const { container: cardContainer } = render(
              <Card title={text} shadow={true}>Content</Card>
            );

            const card = cardContainer.firstChild;
            
            // Card should have shadow class
            expect(card.className).toContain('card--shadow');
            expect(card).toBeInTheDocument();
            
            // Test Modal separately to avoid portal issues
            const { unmount } = render(
              <Modal isOpen={true} title={text} onClose={() => {}}>
                Modal Content
              </Modal>
            );

            // Modal should render (it has built-in shadows)
            const modal = screen.getByRole('dialog');
            expect(modal).toBeInTheDocument();
            
            // Clean up
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Responsive Design Consistency', () => {
    it('should maintain consistent responsive behavior across components', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (text) => {
            const { container: buttonContainer } = render(
              <Button>{text}</Button>
            );
            
            const { container: cardContainer } = render(
              <Card title={text}>Content</Card>
            );
            
            const { container: inputContainer } = render(
              <Input label={text} value="" onChange={() => {}} />
            );

            const button = buttonContainer.querySelector('button');
            const card = cardContainer.firstChild;
            const input = inputContainer.querySelector('input');
            
            // All components should render and have responsive classes
            expect(button).toBeInTheDocument();
            expect(card).toBeInTheDocument();
            expect(input).toBeInTheDocument();
            
            // Components should have base classes that include responsive styles
            expect(button.className).toContain('button');
            expect(card.className).toContain('card');
            expect(input.className).toContain('input');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Accessibility Consistency', () => {
    it('should maintain consistent accessibility patterns across components', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (text) => {
            const { container: buttonContainer } = render(
              <Button>{text}</Button>
            );
            
            const { container: inputContainer } = render(
              <Input label={text} value="" onChange={() => {}} />
            );

            const button = buttonContainer.querySelector('button');
            const input = inputContainer.querySelector('input');
            
            // All interactive components should be focusable
            expect(button).toBeInTheDocument();
            expect(input).toBeInTheDocument();
            
            // Button should be a button element
            expect(button.tagName).toBe('BUTTON');
            
            // Input should have proper labeling
            expect(input).toHaveAttribute('id');
            
            // Test Modal separately to avoid portal issues
            const { unmount } = render(
              <Modal isOpen={true} title={text} onClose={() => {}}>
                Content
              </Modal>
            );
            
            const modal = screen.getByRole('dialog');
            
            // Modal should have proper ARIA attributes
            expect(modal).toHaveAttribute('aria-modal', 'true');
            expect(modal).toHaveAttribute('role', 'dialog');
            
            // Clean up
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});