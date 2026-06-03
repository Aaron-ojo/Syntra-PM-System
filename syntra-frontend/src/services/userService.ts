import { api } from "./api";
import type { User } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const userService = {
  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>("/users/profile");
    return response.data.data;
  },

  // Update user profile
  updateProfile: async (data: {
    name?: string;
    email?: string;
  }): Promise<User> => {
    const response = await api.put<ApiResponse<User>>("/users/profile", data);
    return response.data.data;
  },

  // Change password
  changePassword: async (data: {
    current_password: string;
    new_password: string;
  }): Promise<{ message: string }> => {
    const response = await api.put<ApiResponse<{ message: string }>>(
      "/users/change-password",
      data,
    );
    return response.data.data;
  },

  // Upload avatar
  // Upload avatar
  uploadAvatar: async (file: File): Promise<{ avatar_url: string }> => {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await api.post<ApiResponse<{ avatar_url: string }>>(
      "/users/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    console.log("Avatar upload response:", response.data);
    return response.data.data;
  },

  // Delete account
  deleteAccount: async (): Promise<void> => {
    await api.delete("/users/account");
  },
};

export default userService;
