import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
}));

// Mock auth store
const mockLogout = jest.fn();
const mockUseAuthStore = jest.fn();
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STUDENT',
      },
      isAuthenticated: () => true,
      logout: mockLogout,
    });
  });

  describe('rendering', () => {
    it('should render header element', () => {
      render(<Header />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render logo or brand name', () => {
      render(<Header />);

      expect(screen.getByText(/quizmaster/i)).toBeInTheDocument();
    });

    it('should render user name in menu', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Open menu to see user name
      const menuTrigger = screen.getByRole('button');
      await user.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });
    });

    it('should render user avatar or initials', () => {
      render(<Header />);

      // Avatar should show initials "TU"
      expect(screen.getByText('TU')).toBeInTheDocument();
    });

    it('should render logout option in menu', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Open dropdown menu
      const menuTrigger = screen.getByRole('button');
      await user.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText(/log out/i)).toBeInTheDocument();
      });
    });
  });

  describe('user menu', () => {
    it('should open user menu on click', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Find avatar/menu trigger
      const menuTrigger = screen.getByRole('button');
      await user.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should show user email in menu', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const menuTrigger = screen.getByRole('button');
      await user.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('logout', () => {
    it('should call logout on menu item click', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Open menu
      const menuTrigger = screen.getByRole('button');
      await user.click(menuTrigger);

      // Click logout
      await waitFor(async () => {
        const logoutItem = screen.getByText(/log out/i);
        await user.click(logoutItem);
      });

      expect(mockLogout).toHaveBeenCalled();
    });

    it('should redirect to login after logout', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Open menu
      const menuTrigger = screen.getByRole('button');
      await user.click(menuTrigger);

      // Click logout
      await waitFor(async () => {
        const logoutItem = screen.getByText(/log out/i);
        await user.click(logoutItem);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('avatar initials', () => {
    it('should generate correct initials for single name', () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'John',
          role: 'STUDENT',
        },
        isAuthenticated: () => true,
        logout: mockLogout,
      });

      const { container } = render(<Header />);

      // Single name "John" -> split by space gives ["John"] -> map first letter gives ["J"] 
      // -> join gives "J" -> uppercase "J" -> slice(0, 2) gives "J"
      // So single names only show first letter, not first 2 letters
      const fallback = container.querySelector('[data-slot="avatar-fallback"]');
      
      if (fallback) {
        expect(fallback.textContent).toContain('J');
      } else {
        // Fallback: check if "J" appears in the rendered output
        expect(container.textContent).toContain('J');
      }
    });

    it('should generate correct initials for full name', () => {
      const { container } = render(<Header />);

      // Check for initials in avatar fallback
      expect(container.textContent).toContain('TU');
    });
  });
});

describe('Header - Teacher View', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'teacher@example.com',
        name: 'Teacher User',
        role: 'TEACHER',
      },
      isAuthenticated: () => true,
      logout: mockLogout,
    });
  });

  it('should render teacher user name in menu', async () => {
    const user = userEvent.setup();
    render(<Header />);

    // Open menu
    const menuTrigger = screen.getByRole('button');
    await user.click(menuTrigger);

    await waitFor(() => {
      expect(screen.getByText('Teacher User')).toBeInTheDocument();
    });
  });

  it('should show teacher initials', () => {
    const { container } = render(<Header />);

    // Check for initials in avatar fallback
    expect(container.textContent).toContain('TU');
  });
});
