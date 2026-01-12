import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from './page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

// Mock the auth store
const mockRegister = jest.fn();
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    register: mockRegister,
    isLoading: false,
  }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render register form', () => {
      render(<RegisterPage />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByText(/role/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /sign up/i }),
      ).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(<RegisterPage />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByText(/role/i)).toBeInTheDocument();
    });

    it('should have a link to login page', () => {
      render(<RegisterPage />);

      const loginLink = screen.getByRole('link', { name: /sign in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('form interactions', () => {
    it('should allow typing in name field', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'John Doe');

      expect(nameInput).toHaveValue('John Doe');
    });

    it('should allow typing in email field', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should allow typing in password field', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
    });
  });

  describe('form submission', () => {
    it('should call register function on form submit with valid data', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValue(undefined);
      render(<RegisterPage />);

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'test@example.com',
          password: 'password123',
          role: 'STUDENT',
        });
      });
    });

    it('should redirect to dashboard after successful registration', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValue(undefined);
      render(<RegisterPage />);

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show error on registration failure', async () => {
      const user = userEvent.setup();
      const error = new Error('Registration failed');
      (error as any).response = { data: { message: 'Email already exists' } };
      mockRegister.mockRejectedValue(error);
      render(<RegisterPage />);

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading state when isLoading is true', () => {
      jest.spyOn(require('@/store/authStore'), 'useAuthStore').mockReturnValue({
        register: mockRegister,
        isLoading: true,
      });

      render(<RegisterPage />);

      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    });

    it('should disable form fields when loading', () => {
      jest.spyOn(require('@/store/authStore'), 'useAuthStore').mockReturnValue({
        register: mockRegister,
        isLoading: true,
      });

      render(<RegisterPage />);

      const nameInput = screen.getByLabelText(/full name/i);
      expect(nameInput).toBeDisabled();
    });
  });
});
