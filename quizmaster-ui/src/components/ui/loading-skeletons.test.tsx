import { render, screen } from '@testing-library/react';
import {
  StatsCardSkeleton,
  QuizCardSkeleton,
  TableRowSkeleton,
  QuestionSkeleton,
} from './loading-skeletons';

describe('Loading Skeletons', () => {
  describe('StatsCardSkeleton', () => {
    it('should render skeleton card', () => {
      const { container } = render(<StatsCardSkeleton />);

      // Check for skeleton elements with data-slot or animate-pulse
      const skeletons = container.querySelectorAll('[data-slot="skeleton"], [class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have card structure', () => {
      const { container } = render(<StatsCardSkeleton />);

      expect(container.querySelector('[class*="card"]')).toBeInTheDocument();
    });
  });

  describe('QuizCardSkeleton', () => {
    it('should render skeleton for quiz card', () => {
      const { container } = render(<QuizCardSkeleton />);

      const skeletons = container.querySelectorAll('[data-slot="skeleton"], [class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have title skeleton', () => {
      const { container } = render(<QuizCardSkeleton />);

      // Should have a skeleton with h-6 class
      const titleSkeleton = container.querySelector('[class*="h-6"]');
      expect(titleSkeleton).toBeInTheDocument();
    });

    it('should have description skeleton', () => {
      const { container } = render(<QuizCardSkeleton />);

      // Should have multiple skeleton elements
      const skeletons = container.querySelectorAll('[data-slot="skeleton"], [class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('TableRowSkeleton', () => {
    it('should render table row skeleton', () => {
      render(
        <table>
          <tbody>
            <TableRowSkeleton columns={4} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('row');
      expect(row).toBeInTheDocument();
    });

    it('should render correct number of columns', () => {
      render(
        <table>
          <tbody>
            <TableRowSkeleton columns={5} />
          </tbody>
        </table>
      );

      const cells = screen.getAllByRole('cell');
      expect(cells).toHaveLength(5);
    });

    it('should have skeleton in each cell', () => {
      const { container } = render(
        <table>
          <tbody>
            <TableRowSkeleton columns={3} />
          </tbody>
        </table>
      );

      const skeletons = container.querySelectorAll('[data-slot="skeleton"], [class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('QuestionSkeleton', () => {
    it('should render question skeleton', () => {
      const { container } = render(<QuestionSkeleton />);

      const skeletons = container.querySelectorAll('[data-slot="skeleton"], [class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have skeleton for question text', () => {
      const { container } = render(<QuestionSkeleton />);

      // Question text skeleton should be prominent
      const skeletons = container.querySelectorAll('[data-slot="skeleton"], [class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have skeletons for options', () => {
      const { container } = render(<QuestionSkeleton />);

      // Should have 4 option skeletons
      const skeletons = container.querySelectorAll('[data-slot="skeleton"], [class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });
  });
});

describe('Multiple Skeletons', () => {
  it('should render multiple quiz card skeletons', () => {
    const { container } = render(
      <div>
        {[1, 2, 3].map((i) => (
          <QuizCardSkeleton key={i} />
        ))}
      </div>
    );

    // Each QuizCardSkeleton has a Card, so we should have 3 top-level cards
    // But cards may be nested, so check for at least 3
    const cards = container.querySelectorAll('[class*="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it('should render multiple table row skeletons', () => {
    render(
      <table>
        <tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRowSkeleton key={i} columns={4} />
          ))}
        </tbody>
      </table>
    );

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(5);
  });
});
