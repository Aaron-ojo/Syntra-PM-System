import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import  teamService  from '../services/teamService'
import { Plus, X, Users, ChevronRight } from 'lucide-react'

interface Team {
  id: string
  name: string
  description?: string
  created_at: string
}

const Teams: React.FC = () => {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    setLoading(true)
    try {
      const data: any = await teamService.getTeams()
      
      let teamsArray: Team[] = []
      
      if (Array.isArray(data)) {
        teamsArray = data
      } else if (data && typeof data === 'object') {
        if (data.data && Array.isArray(data.data)) {
          teamsArray = data.data
        } else if (data.teams && Array.isArray(data.teams)) {
          teamsArray = data.teams
        }
      }
      
      setTeams(teamsArray)
    } catch (err: any) {
      setError(err.message || 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) {
      setCreateError('Team name is required')
      return
    }
    
    setCreateError('')
    setIsCreating(true)
    
    try {
      const newTeam = await teamService.createTeam({ 
        name: newTeamName, 
        description: newTeamDesc 
      })
      
      setTeams([newTeam, ...teams])
      setShowModal(false)
      setNewTeamName('')
      setNewTeamDesc('')
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create team')
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teams...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Teams</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {teams.length} {teams.length === 1 ? 'team' : 'teams'}
            </p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg"
            aria-label="Create team"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {error ? (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg">
            <p className="text-sm">{error}</p>
            <button 
              onClick={() => loadTeams()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm w-full sm:w-auto"
            >
              Try Again
            </button>
          </div>
        ) : teams.length === 0 ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs">
              Create your first team to start collaborating with your colleagues
            </p>
            <button 
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium w-full sm:w-auto"
            >
              Create your first team
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div 
                key={team.id} 
                onClick={() => navigate(`/team/${team.id}`)}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 active:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                        {team.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-3 text-xs text-gray-400">
                      <span>Created {new Date(team.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal - Mobile Bottom Sheet */}
      {showModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowModal(false)}
          />
          
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transform animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create New Team</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-5 pb-8">
              {createError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {createError}
                </div>
              )}
              
              <form onSubmit={handleCreateTeam}>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="e.g., Engineering, Design"
                    autoFocus
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <textarea
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    rows={4}
                    placeholder="What does this team do?"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {isCreating ? 'Creating...' : 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default Teams