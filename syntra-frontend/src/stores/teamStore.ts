import { create } from "zustand";
import teamService from "../services/teamService";
import type { Team } from "../types";

interface TeamState {
  teams: Team[];
  isLoading: boolean;
  fetchTeams: () => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<void>;
  updateTeam: (id: string, name: string, description?: string) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  isLoading: false,

  fetchTeams: async () => {
    set({ isLoading: true });
    try {
      const teams = await teamService.getTeams();
      set({ teams, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createTeam: async (name: string, description?: string) => {
    try {
      const newTeam = await teamService.createTeam({ name, description });
      set((state) => ({ teams: [newTeam, ...state.teams] }));
    } catch (error) {
      throw error;
    }
  },

  updateTeam: async (id: string, name: string, description?: string) => {
    try {
      const updatedTeam = await teamService.updateTeam(id, {
        name,
        description,
      });
      set((state) => ({
        teams: state.teams.map((team) => (team.id === id ? updatedTeam : team)),
      }));
    } catch (error) {
      throw error;
    }
  },

  deleteTeam: async (id: string) => {
    try {
      await teamService.deleteTeam(id);
      set((state) => ({
        teams: state.teams.filter((team) => team.id !== id),
      }));
    } catch (error) {
      throw error;
    }
  },
}));
