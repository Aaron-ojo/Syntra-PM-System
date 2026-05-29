import { api } from "./api";
import type { Project } from "../types";

const projectService = {
  // Get all projects - optionally filter by team
  getProjects: async (teamId?: string): Promise<Project[]> => {
    try {
      const response = await api.get("/projects");
      console.log("Raw projects response:", response.data);

      let allProjects: Project[] = [];

      // Your backend returns { success: true, data: [...] }
      if (
        response.data &&
        response.data.success === true &&
        Array.isArray(response.data.data)
      ) {
        // Map the data to ensure team_id is properly recognized
        allProjects = response.data.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          team_id: item.team_id || item.teamId,
          team_name: item.team_name,
          created_by: item.created_by,
          created_by_name: item.created_by_name,
          status: item.status,
          priority: item.priority,
          start_date: item.start_date,
          due_date: item.due_date,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));

        // DEBUG LOGS - These will show us what's happening
        console.log("=== DEBUG PROJECT DATA ===");
        console.log("Raw first project item:", response.data.data[0]);
        console.log("Mapped first project:", allProjects[0]);
        console.log(
          "All team_ids from mapped projects:",
          allProjects.map((p) => p.team_id),
        );
        console.log("========================");

        console.log("Mapped projects:", allProjects);
        console.log(
          "Mapped projects with team_id:",
          allProjects.map((p) => ({
            id: p.id,
            name: p.name,
            team_id: p.team_id,
          })),
        );
      } else if (Array.isArray(response.data)) {
        allProjects = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        allProjects = response.data.data;
      }

      // Filter by teamId if provided
      if (teamId && allProjects.length > 0) {
        const filtered = allProjects.filter(
          (project) => project.team_id === teamId,
        );
        console.log(`Filtering for team ${teamId}`);
        console.log(`Filtered projects count: ${filtered.length}`);
        return filtered;
      }

      return allProjects;
    } catch (error) {
      console.error("Error in getProjects:", error);
      return [];
    }
  },

  // Get single project by ID
  getProject: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    if (response.data && response.data.success === true) {
      return response.data.data;
    }
    return response.data;
  },

  // Create new project
  createProject: async (data: {
    name: string;
    description?: string;
    team_id: string;
  }): Promise<Project> => {
    const response = await api.post("/projects", data);
    console.log("Create project response:", response.data);
    if (response.data && response.data.success === true) {
      return response.data.data;
    }
    return response.data;
  },

  // Update project
  updateProject: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: "active" | "archived" | "in_progress" | "completed";
    },
  ): Promise<Project> => {
    const response = await api.put(`/projects/${id}`, data);
    if (response.data && response.data.success === true) {
      return response.data.data;
    }
    return response.data;
  },

  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};

export default projectService;
