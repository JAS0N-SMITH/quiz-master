import { useAuthStore } from './authStore';

// Mock js-cookie and localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock the API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock auth utils
jest.mock('@/lib/auth', () => ({
  authUtils: {
    getToken: jest.fn(),
    setToken: jest.fn(),
    removeToken: jest.fn(),
    isAuthenticated: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api';
import { authUtils } from '@/lib/auth';

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
    });
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('initial state', () => {
    it('should start with null user', () => {
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it('should start with no token', () => {
      const { token } = useAuthStore.getState();
      expect(token).toBeNull();
    });

    it('should start with loading false', () => {
      const { isLoading } = useAuthStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('login', () => {
    it('should set user and token on successful login', async () => {
      const mockResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT' as const,
        },
        accessToken: 'test-token',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);
      (authUtils.setToken as jest.Mock).mockImplementation(() => {});

      await useAuthStore.getState().login({
        email: 'test@example.com',
        password: 'password123',
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockResponse.user);
      expect(state.token).toBe(mockResponse.accessToken);
      expect(state.isLoading).toBe(false);
      expect(authUtils.setToken).toHaveBeenCalledWith('test-token');
    });

    it('should handle login errors', async () => {
      const error = new Error('Login failed');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(
        useAuthStore.getState().login({
          email: 'test@example.com',
          password: 'wrong',
        }),
      ).rejects.toThrow('Login failed');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
    });
  });

  describe('register', () => {
    it('should set user and token on successful registration', async () => {
      const mockResponse = {
        user: {
          id: 'user-1',
          email: 'new@example.com',
          name: 'New User',
          role: 'STUDENT' as const,
        },
        accessToken: 'test-token',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);
      (authUtils.setToken as jest.Mock).mockImplementation(() => {});

      await useAuthStore.getState().register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockResponse.user);
      expect(state.token).toBe(mockResponse.accessToken);
    });
  });

  describe('logout', () => {
    it('should clear user state', () => {
      // First set a user
      useAuthStore.setState({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test',
          role: 'STUDENT',
        },
        token: 'some-token',
      });

      // Then logout
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(authUtils.removeToken).toHaveBeenCalled();
    });
  });

  describe('loadUser', () => {
    it('should load user when token exists', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STUDENT' as const,
      };

      (authUtils.getToken as jest.Mock).mockReturnValue('test-token');
      (apiClient.get as jest.Mock).mockResolvedValue(mockUser);

      await useAuthStore.getState().loadUser();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('test-token');
    });

    it('should clear state when no token exists', async () => {
      (authUtils.getToken as jest.Mock).mockReturnValue(null);

      await useAuthStore.getState().loadUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('should handle errors when loading user', async () => {
      (authUtils.getToken as jest.Mock).mockReturnValue('invalid-token');
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

      await useAuthStore.getState().loadUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(authUtils.removeToken).toHaveBeenCalled();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when authenticated', () => {
      (authUtils.isAuthenticated as jest.Mock).mockReturnValue(true);

      const result = useAuthStore.getState().isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when not authenticated', () => {
      (authUtils.isAuthenticated as jest.Mock).mockReturnValue(false);

      const result = useAuthStore.getState().isAuthenticated();

      expect(result).toBe(false);
    });
  });
});
