import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not trigger click when disabled', () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  describe('variants', () => {
    it('should apply default variant styles', () => {
      render(<Button variant="default">Default</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'default');
    });

    it('should apply destructive variant styles', () => {
      render(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'destructive');
    });

    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'outline');
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'ghost');
    });

    it('should apply link variant styles', () => {
      render(<Button variant="link">Link</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'link');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'secondary');
    });
  });

  describe('sizes', () => {
    it('should apply default size', () => {
      render(<Button size="default">Default Size</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'default');
    });

    it('should apply small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'sm');
    });

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'lg');
    });

    it('should apply icon size', () => {
      render(<Button size="icon">🔍</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'icon');
    });
  });

  describe('as child', () => {
    it('should render as child element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/link">Link Button</a>
        </Button>,
      );

      expect(screen.getByRole('link', { name: /link button/i })).toBeInTheDocument();
    });
  });
});
