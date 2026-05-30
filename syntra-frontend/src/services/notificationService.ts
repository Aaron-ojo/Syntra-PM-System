import { api } from "./api";
import type { Notification } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
  unreadCount?: number;
}

const notificationService = {
  // Get all notifications for current user
  getNotifications: async (): Promise<Notification[]> => {
    const response =
      await api.get<ApiResponse<Notification[]>>("/notifications");
    return response.data.data || [];
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ success: boolean; unreadCount: number }>(
      "/notifications/unread-count",
    );
    return response.data.unreadCount || 0;
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await api.patch("/notifications/read-all");
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};

export default notificationService;
