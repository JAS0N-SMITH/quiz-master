import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';

describe('Input', () => {
  it('should render input with placeholder', () => {
    render(<Input placeholder="Enter text" />);

    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should handle value changes', async () => {
    const user = userEvent.setup();
    render(<Input />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test value');

    expect(input).toHaveValue('test value');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('should have correct type attribute', () => {
    render(<Input type="email" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should have password type for password inputs', () => {
    render(<Input type="password" />);

    const input = document.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Input className="custom-class" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('should have data-slot attribute', () => {
    render(<Input />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('data-slot', 'input');
  });

  it('should handle controlled value', () => {
    const { rerender } = render(<Input value="initial" onChange={() => {}} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('initial');

    rerender(<Input value="updated" onChange={() => {}} />);
    expect(input).toHaveValue('updated');
  });
});
