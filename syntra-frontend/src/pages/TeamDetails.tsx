import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import  teamService  from '../services/teamService'
import  projectService from '../services/projectService'
import type { Project } from '../types'
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  X, 
  Mail, 
  Crown, 
  UserMinus,
  FolderKanban,
  FolderPlus,
  ChevronRight
} from 'lucide-react'

interface TeamMember {
  id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  user?: {
    id: string
    name: string
    email: string
  }
}

interface Team {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  members?: TeamMember[]
}

const TeamDetails: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const [team, setTeam] = useState<Team | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member')
  const [addingMember, setAddingMember] = useState(false)
  const [memberError, setMemberError] = useState('')

  const [showProjectModal, setShowProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [projectError, setProjectError] = useState('')

  useEffect(() => {
    if (teamId) {
      loadTeam()
      loadProjects()
    }
  }, [teamId])

  const loadTeam = async () => {
    try {
      const data = await teamService.getTeam(teamId!)
      setTeam(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load team')
    }
  }

const loadProjects = async () => {
  try {
    console.log('Loading projects for team:', teamId)
    const data = await projectService.getProjects(teamId!)
    console.log('Projects loaded:', data)
    setProjects(data)
  } catch (err: any) {
    console.error('Failed to load projects:', err)
  } finally {
    setLoading(false)
  }
}

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberEmail.trim()) {
      setMemberError('Email is required')
      return
    }
    
    setMemberError('')
    setAddingMember(true)
    
    try {
      await teamService.addMember(teamId!, memberEmail, memberRole)
      setMemberEmail('')
      setMemberRole('member')
      setShowMemberModal(false)
      loadTeam()
    } catch (err: any) {
      setMemberError(err.response?.data?.message || 'Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (confirm(`Remove ${userName} from this team?`)) {
      try {
        await teamService.removeMember(teamId!, userId)
        loadTeam()
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to remove member')
      }
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) {
      setProjectError('Project name is required')
      return
    }
    
    setProjectError('')
    setCreatingProject(true)
    
    try {
      const newProject = await projectService.createProject({
        name: newProjectName,
        description: newProjectDesc,
        team_id: teamId!,
      })
      
      setProjects([newProject, ...projects])
      setShowProjectModal(false)
      setNewProjectName('')
      setNewProjectDesc('')
    } catch (err: any) {
      setProjectError(err.response?.data?.message || 'Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  if (loading && !team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team...</p>
        </div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          <p>{error || 'Team not found'}</p>
          <button 
            onClick={() => navigate('/teams')}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            Back to Teams
          </button>
        </div>
      </div>
    )
  }

  const adminCount = team.members?.filter(m => m.role === 'admin').length || 0
  const memberCount = team.members?.filter(m => m.role === 'member').length || 0
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in_progress')
  const archivedProjects = projects.filter(p => p.status === 'archived')

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/teams')}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg active:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{team.name}</h1>
            {team.description && (
              <p className="text-sm text-gray-500 mt-0.5">{team.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex space-x-6">
          <button className="py-3 text-blue-600 border-b-2 border-blue-600 font-medium text-sm">
            Overview
          </button>
          <button className="py-3 text-gray-500 font-medium text-sm opacity-50">
            Settings
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{team.members?.length || 0}</p>
            <p className="text-sm text-gray-600">Total Members</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <FolderKanban className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeProjects.length}</p>
            <p className="text-sm text-gray-600">Active Projects</p>
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Members</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {adminCount} admin • {memberCount} member
              </p>
            </div>
            <button
              onClick={() => setShowMemberModal(true)}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm active:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
          
          <div className="divide-y divide-gray-100">
            {team.members && team.members.length > 0 ? (
              team.members.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 font-medium text-sm">
                        {member.user?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">
                        {member.user?.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.user?.email}
                      </p>
                      {member.role === 'admin' && (
                        <span className="inline-flex items-center space-x-1 mt-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                          <Crown className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.user_id, member.user?.name || 'member')}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg active:bg-red-100"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm">No members yet</p>
                <p className="text-xs mt-1">Add your first team member</p>
              </div>
            )}
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Projects</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeProjects.length} active • {archivedProjects.length} archived
              </p>
            </div>
            <button
              onClick={() => setShowProjectModal(true)}
              className="flex items-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm active:bg-purple-700"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
          
          <div>
            {activeProjects.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {activeProjects.map((project) => (
                  <div 
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FolderKanban className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {project.name}
                        </p>
                        {project.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {project.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm">No projects yet</p>
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm"
                >
                  Create your first project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMemberModal(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transform animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Member</h2>
              <button onClick={() => setShowMemberModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 pb-8">
              {memberError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{memberError}</div>}
              <form onSubmit={handleAddMember}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" placeholder="colleague@example.com" autoFocus />
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setMemberRole('member')} className={`px-4 py-3 rounded-lg border font-medium text-sm transition-colors ${memberRole === 'member' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Member</button>
                    <button type="button" onClick={() => setMemberRole('admin')} className={`px-4 py-3 rounded-lg border font-medium text-sm transition-colors ${memberRole === 'admin' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Admin</button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowMemberModal(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
                  <button type="submit" disabled={addingMember} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{addingMember ? 'Adding...' : 'Add Member'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowProjectModal(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transform animate-slide-up">
            <div className="flex justify-center pt-3 pb-2"><div className="w-12 h-1 bg-gray-300 rounded-full"></div></div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create New Project</h2>
              <button onClick={() => setShowProjectModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 pb-8">
              {projectError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{projectError}</div>}
              <form onSubmit={handleCreateProject}>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                  <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-base" placeholder="e.g., Mobile App, Website Redesign" autoFocus />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description <span className="text-gray-400 text-xs">(optional)</span></label>
                  <textarea value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-base" rows={4} placeholder="What is this project about?" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowProjectModal(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
                  <button type="submit" disabled={creatingProject} className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium">{creatingProject ? 'Creating...' : 'Create Project'}</button>
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

export default TeamDetails