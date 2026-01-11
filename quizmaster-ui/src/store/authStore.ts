import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api';
import { authUtils } from '@/lib/auth';
import type { User, LoginDto, RegisterDto, LoginResponse } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (credentials: LoginDto) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
          authUtils.setToken(response.accessToken);
          set({
            user: response.user,
            token: response.accessToken,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterDto) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post<LoginResponse>('/auth/register', data);
          authUtils.setToken(response.accessToken);
          set({
            user: response.user,
            token: response.accessToken,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        authUtils.removeToken();
        set({ user: null, token: null });
      },

      loadUser: async () => {
        const token = authUtils.getToken();
        if (!token) {
          set({ user: null, token: null });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await apiClient.get<User>('/auth/me');
          set({
            user,
            token,
            isLoading: false,
          });
        } catch (error) {
          authUtils.removeToken();
          set({ user: null, token: null, isLoading: false });
        }
      },

      isAuthenticated: () => {
        return authUtils.isAuthenticated();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
