import { api } from "./api";
import type { SearchResult, Task, Project, Team } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

const searchService = {
  // Global search across tasks, projects, and teams
  globalSearch: async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    const response = await api.get<ApiResponse<SearchResult[]>>("/search", {
      params: { q: query },
    });
    return response.data.data || [];
  },

  // Search tasks with filters
  searchTasks: async (filters: {
    project_id?: string;
    status?: string;
    priority?: string;
    assignee_id?: string;
    search?: string;
  }): Promise<Task[]> => {
    const response = await api.get<ApiResponse<Task[]>>("/tasks", {
      params: filters,
    });
    return response.data.data || [];
  },

  // Get all projects (for filter dropdown)
  getProjects: async (): Promise<Project[]> => {
    const response = await api.get<ApiResponse<Project[]>>("/projects");
    return response.data.data || [];
  },

  // Get team members for assignee filter
  getTeamMembers: async (teamId: string): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>(
      `/teams/${teamId}/members`,
    );
    return response.data.data || [];
  },
};

export default searchService;
