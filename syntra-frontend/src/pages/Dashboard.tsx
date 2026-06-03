import React, { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useNavigate, Link } from "react-router-dom";
import { Users, FolderKanban, ChevronRight } from "lucide-react";
import teamService from "../services/teamService";
import projectService from "../services/projectService";

interface Team {
  id: string;
  name: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const teamsData = await teamService.getTeams();
      const teamsArray = Array.isArray(teamsData)
        ? teamsData
        : (teamsData as any).data || [];
      setTeams(teamsArray);

      const projectsData = await projectService.getProjects();
      const projectsArray = Array.isArray(projectsData)
        ? projectsData
        : (projectsData as any).data || [];
      setProjectCount(projectsArray.length);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.name?.split(" ")[0] || "User"}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/teams"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {teams.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Teams</p>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="mb-2">
            <FolderKanban className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {projectCount}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Projects</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <Link
            to="/teams"
            className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  View Teams
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage your teams and members
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </Link>
        </div>
      </div>

      {/* Recent Teams Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Your Teams
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : teams.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="text-sm">No teams yet</p>
            <Link
              to="/teams"
              className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Create your first team
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {teams.slice(0, 3).map((team) => (
              <Link
                key={team.id}
                to={`/team/${team.id}`}
                className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {team.name}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </Link>
            ))}
            {teams.length > 3 && (
              <Link
                to="/teams"
                className="block p-4 text-center text-blue-600 dark:text-blue-400 text-sm active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
              >
                View all {teams.length} teams →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
