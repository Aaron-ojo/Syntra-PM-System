import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, Users, FolderKanban, ChevronRight } from 'lucide-react'
import teamService from '../services/teamService'
import projectService from '../services/projectService'

interface Team {
  id: string
  name: string
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [projectCount, setProjectCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const teamsData = await teamService.getTeams()
      // Handle if teamsData is an array or object
      const teamsArray = Array.isArray(teamsData) ? teamsData : (teamsData as any).data || []
      setTeams(teamsArray)
      
      const projectsData = await projectService.getProjects()
      const projectsArray = Array.isArray(projectsData) ? projectsData : (projectsData as any).data || []
      setProjectCount(projectsArray.length)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Syntra</h1>
            <p className="text-sm text-gray-500">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors active:bg-red-100"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/teams" className="bg-white rounded-lg shadow p-4 active:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-blue-600" />
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
            <p className="text-sm text-gray-600">Teams</p>
          </Link>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-2">
              <FolderKanban className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{projectCount}</p>
            <p className="text-sm text-gray-600">Projects</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <Link 
              to="/teams" 
              className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Teams</p>
                  <p className="text-sm text-gray-500">Manage your teams and members</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Recent Teams Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Your Teams</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : teams.length === 0 ? (
            <div className="p-4 text-center text-gray-500 py-8">
              <p className="text-sm">No teams yet</p>
              <Link 
                to="/teams" 
                className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Create your first team
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {teams.slice(0, 3).map((team) => (
                <Link 
                  key={team.id}
                  to={`/team/${team.id}`}
                  className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{team.name}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
              {teams.length > 3 && (
                <Link to="/teams" className="block p-4 text-center text-blue-600 text-sm active:bg-gray-50">
                  View all {teams.length} teams →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar - Mobile */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-2 sm:hidden">
        <div className="flex items-center justify-around">
          <Link to="/dashboard" className="flex flex-col items-center py-1 text-blue-600">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to="/teams" className="flex flex-col items-center py-1 text-gray-500">
            <Users className="w-5 h-5" />
            <span className="text-xs mt-1">Teams</span>
          </Link>
          <div className="flex flex-col items-center py-1 text-gray-500 opacity-50">
            <FolderKanban className="w-5 h-5" />
            <span className="text-xs mt-1">Projects</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard