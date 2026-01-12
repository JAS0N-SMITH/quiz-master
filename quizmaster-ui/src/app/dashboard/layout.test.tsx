import { render, screen, waitFor } from '@testing-library/react';
import DashboardLayout from './layout';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}));

// Mock auth store
const mockLoadUser = jest.fn();
jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

// Mock Header and Sidebar
jest.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

jest.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('DashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockLoadUser.mockResolvedValue(undefined);
  });

  it('should render loading state when user is loading', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
      loadUser: mockLoadUser,
    });

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    // Check for Skeleton component by data attribute
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should redirect to login when no token exists', async () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      loadUser: mockLoadUser,
    });

    localStorageMock.getItem.mockReturnValue(null);

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should call loadUser when token exists but user is not loaded', async () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      loadUser: mockLoadUser,
    });

    localStorageMock.getItem.mockReturnValue('test-token');

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    await waitFor(() => {
      expect(mockLoadUser).toHaveBeenCalled();
    });
  });

  it('should render layout with header and sidebar when user is authenticated', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'STUDENT' as const,
    };

    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
      loadUser: mockLoadUser,
    });

    localStorageMock.getItem.mockReturnValue('test-token');

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should redirect to login when user becomes null after loading', async () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      loadUser: mockLoadUser,
    });

    localStorageMock.getItem.mockReturnValue(null);

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should not redirect if token exists during loading', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
      loadUser: mockLoadUser,
    });

    localStorageMock.getItem.mockReturnValue('test-token');

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    // Should not redirect while loading
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should render children in main content area', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'STUDENT' as const,
    };

    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
      loadUser: mockLoadUser,
    });

    localStorageMock.getItem.mockReturnValue('test-token');

    render(
      <DashboardLayout>
        <div data-testid="child-content">Child Content</div>
      </DashboardLayout>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('should handle multiple children', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'STUDENT' as const,
    };

    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
      loadUser: mockLoadUser,
    });

    localStorageMock.getItem.mockReturnValue('test-token');

    render(
      <DashboardLayout>
        <div>Child 1</div>
        <div>Child 2</div>
      </DashboardLayout>,
    );

    await waitFor(() => {
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });
});
