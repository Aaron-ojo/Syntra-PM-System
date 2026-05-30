import { api } from "./api";
import type { Comment } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

const commentService = {
  // Get all comments for a task
  getComments: async (taskId: string): Promise<Comment[]> => {
    console.log("Fetching comments for task:", taskId);
    try {
      const response = await api.get<ApiResponse<Comment[]>>(
        `/comments/task/${taskId}`,
      );
      console.log("Get comments response:", response.data);
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching comments:", error);
      return [];
    }
  },

  // Create a new comment or reply
  createComment: async (data: {
    content: string;
    task_id: string;
    parent_comment_id?: string;
  }): Promise<Comment> => {
    console.log("Creating comment:", data);
    try {
      const response = await api.post<ApiResponse<Comment>>("/comments", data);
      console.log("Create comment response:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("Error creating comment:", error);
      throw error;
    }
  },

  // Update a comment
  updateComment: async (id: string, content: string): Promise<Comment> => {
    const response = await api.put<ApiResponse<Comment>>(`/comments/${id}`, {
      content,
    });
    return response.data.data;
  },

  // Delete a comment
  deleteComment: async (id: string): Promise<void> => {
    await api.delete(`/comments/${id}`);
  },
};

export default commentService;
