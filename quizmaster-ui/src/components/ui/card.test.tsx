import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card with children', () => {
      render(
        <Card>
          <div>Card content</div>
        </Card>,
      );

      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should have data-slot attribute', () => {
      const { container } = render(<Card />);

      const card = container.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-card" />);

      const card = container.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('custom-card');
    });
  });

  describe('CardHeader', () => {
    it('should render card header with children', () => {
      render(
        <Card>
          <CardHeader>
            <div>Header content</div>
          </CardHeader>
        </Card>,
      );

      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('should have data-slot attribute', () => {
      const { container } = render(
        <Card>
          <CardHeader />
        </Card>,
      );

      const header = container.querySelector('[data-slot="card-header"]');
      expect(header).toBeInTheDocument();
    });
  });

  describe('CardTitle', () => {
    it('should render card title', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
        </Card>,
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should have data-slot attribute', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>,
      );

      const title = container.querySelector('[data-slot="card-title"]');
      expect(title).toBeInTheDocument();
    });
  });

  describe('CardDescription', () => {
    it('should render card description', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Test description</CardDescription>
          </CardHeader>
        </Card>,
      );

      expect(screen.getByText('Test description')).toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('should render card content with children', () => {
      render(
        <Card>
          <CardContent>
            <div>Content here</div>
          </CardContent>
        </Card>,
      );

      expect(screen.getByText('Content here')).toBeInTheDocument();
    });

    it('should have data-slot attribute', () => {
      const { container } = render(
        <Card>
          <CardContent />
        </Card>,
      );

      const content = container.querySelector('[data-slot="card-content"]');
      expect(content).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('should render card footer with children', () => {
      render(
        <Card>
          <CardFooter>
            <div>Footer content</div>
          </CardFooter>
        </Card>,
      );

      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });
  });

  describe('Complete Card Structure', () => {
    it('should render full card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <p>Footer text</p>
          </CardFooter>
        </Card>,
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Card content goes here')).toBeInTheDocument();
      expect(screen.getByText('Footer text')).toBeInTheDocument();
    });
  });
});
