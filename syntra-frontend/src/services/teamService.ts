import { api } from "./api";
import type { Team, TeamMember } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

const teamService = {
  // Get all teams for current user
  getTeams: async (): Promise<Team[]> => {
    const response = await api.get<ApiResponse<Team[]>>("/teams");
    return response.data.data || [];
  },

  // Get single team by ID with members
  getTeam: async (id: string): Promise<Team> => {
    const response = await api.get<ApiResponse<Team>>(`/teams/${id}`);
    return response.data.data;
  },

  // Create new team
  createTeam: async (data: {
    name: string;
    description?: string;
  }): Promise<Team> => {
    const response = await api.post<ApiResponse<Team>>("/teams", data);
    return response.data.data;
  },

  // Update team
  updateTeam: async (
    id: string,
    data: { name?: string; description?: string },
  ): Promise<Team> => {
    const response = await api.put<ApiResponse<Team>>(`/teams/${id}`, data);
    return response.data.data;
  },

  // Delete team
  deleteTeam: async (id: string): Promise<void> => {
    await api.delete(`/teams/${id}`);
  },

  // Add member to team
  addMember: async (
    teamId: string,
    email: string,
    role: "admin" | "member",
  ): Promise<TeamMember> => {
    const response = await api.post<ApiResponse<TeamMember>>(
      `/teams/${teamId}/members`,
      {
        email,
        role,
      },
    );
    return response.data.data;
  },

  // Remove member from team
  removeMember: async (teamId: string, userId: string): Promise<void> => {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  },

  // Update member role
  updateMemberRole: async (
    teamId: string,
    userId: string,
    role: "admin" | "member",
  ): Promise<TeamMember> => {
    const response = await api.put<ApiResponse<TeamMember>>(
      `/teams/${teamId}/members/${userId}`,
      {
        role,
      },
    );
    return response.data.data;
  },
};

export default teamService;
