import { api } from "./api";
import type { AuthResponse } from "../types";

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });

    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }

    return response.data;
  },

  register: async (
    email: string,
    password: string,
    full_name: string,
  ): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/register", {
      email,
      password,
      full_name,
    });

    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }

    return response.data;
  },

  logout: (): void => {
    localStorage.removeItem("token");
  },

  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};
