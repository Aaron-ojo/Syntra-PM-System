import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "../services/authService";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,

      login: async (email, password) => {
        try {
          const response = await authService.login(email, password);
          set({ user: response.user });
        } catch (error) {
          throw error;
        }
      },

      register: async (email, password, name) => {
        try {
          const response = await authService.register(email, password, name);
          set({ user: response.user });
        } catch (error) {
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({ user: null });
      },

      checkAuth: async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            set({ user: null, isLoading: false });
            return;
          }

          const user = await authService.getCurrentUser();
          set({ user, isLoading: false });
        } catch (error) {
          localStorage.removeItem("token");
          set({ user: null, isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
