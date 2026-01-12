import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('should render badge with text', () => {
    render(<Badge>Test Badge</Badge>);

    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('should apply default variant styles', () => {
    render(<Badge variant="default">Default</Badge>);

    const badge = screen.getByText('Default');
    expect(badge).toHaveAttribute('data-slot', 'badge');
  });

  it('should apply secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>);

    const badge = screen.getByText('Secondary');
    expect(badge).toBeInTheDocument();
  });

  it('should apply destructive variant', () => {
    render(<Badge variant="destructive">Destructive</Badge>);

    const badge = screen.getByText('Destructive');
    expect(badge).toBeInTheDocument();
  });

  it('should apply outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);

    const badge = screen.getByText('Outline');
    expect(badge).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    render(<Badge>Test</Badge>);

    const badge = screen.getByText('Test');
    expect(badge).toHaveAttribute('data-slot', 'badge');
  });

  it('should apply custom className', () => {
    render(<Badge className="custom-badge">Test</Badge>);

    const badge = screen.getByText('Test');
    expect(badge).toHaveClass('custom-badge');
  });

  it('should render as child element when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="/link">Link Badge</a>
      </Badge>,
    );

    expect(screen.getByRole('link', { name: /link badge/i })).toBeInTheDocument();
  });
});
