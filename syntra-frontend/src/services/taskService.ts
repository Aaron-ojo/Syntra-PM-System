import { api } from "./api";
import type { Task, SyntraTaskStatus, SyntraTaskPriority } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
  filters?: any;
}

const taskService = {
  // Get all tasks for a project - using query parameter
  getTasks: async (projectId: string): Promise<Task[]> => {
    const response = await api.get<ApiResponse<Task[]>>("/tasks", {
      params: { project_id: projectId },
    });
    return response.data.data || [];
  },

  // Get single task
  getTask: async (id: string): Promise<Task> => {
    const response = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return response.data.data;
  },

  // Create task
  createTask: async (data: {
    title: string;
    description?: string;
    project_id: string;
    assignee_id?: string;
    priority?: SyntraTaskPriority;
    due_date?: string;
  }): Promise<Task> => {
    const response = await api.post<ApiResponse<Task>>("/tasks", {
      title: data.title,
      description: data.description,
      project_id: data.project_id,
      assigned_to: data.assignee_id,
      priority: data.priority || "medium",
      status: "todo",
    });
    return response.data.data;
  },

  // Update task
  updateTask: async (
    id: string,
    data: Partial<{
      title: string;
      description: string;
      status: SyntraTaskStatus;
      priority: SyntraTaskPriority;
      assignee_id: string;
      due_date: string;
      position: number;
    }>,
  ): Promise<Task> => {
    const updateData: any = { ...data };
    if (data.assignee_id) {
      updateData.assigned_to = data.assignee_id;
      delete updateData.assignee_id;
    }

    const response = await api.put<ApiResponse<Task>>(
      `/tasks/${id}`,
      updateData,
    );
    return response.data.data;
  },

  // Update task status (for drag and drop)
  updateTaskStatus: async (
    id: string,
    status: SyntraTaskStatus,
    position: number,
  ): Promise<Task> => {
    console.log("Calling API to update task:", { id, status });
    const response = await api.patch<ApiResponse<Task>>(`/tasks/${id}/status`, {
      status,
    });
    console.log("API response:", response.data);
    return response.data.data;
  },

  // Delete task
  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
};

export default taskService;
