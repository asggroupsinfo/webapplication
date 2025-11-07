import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';
import { authAPI, userAPI } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const tokenData = await authAPI.login({ email, password });
          localStorage.setItem('access_token', tokenData.access_token);
          set({ token: tokenData.access_token, isAuthenticated: true });
          
          // Fetch user data
          const user = await userAPI.getCurrentUser();
          set({ user, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchCurrentUser: async () => {
        try {
          const token = localStorage.getItem('access_token');
          if (!token) {
            set({ user: null, isAuthenticated: false });
            return;
          }
          const user = await userAPI.getCurrentUser();
          set({ user, isAuthenticated: true, token });
        } catch (error) {
          console.error('Failed to fetch current user:', error);
          localStorage.removeItem('access_token');
          set({ user: null, isAuthenticated: false, token: null });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

