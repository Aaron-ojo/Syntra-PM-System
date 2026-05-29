import React, { useState, useEffect } from 'react'
import { X, Calendar, Flag, User, Edit2, Trash2 } from 'lucide-react'
import taskService from '../services/taskService'
import type { Task, SyntraTaskStatus, SyntraTaskPriority } from '../types'
import CommentsSection from './CommentsSection'

interface TaskDetailsModalProps {
  taskId: string
  isOpen: boolean
  onClose: () => void
  onTaskUpdated: () => void
}

const statusOptions: { id: SyntraTaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-700' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { id: 'review', label: 'Review', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
]

const priorityOptions: { id: SyntraTaskPriority; label: string; color: string }[] = [
  { id: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { id: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ 
  taskId, 
  isOpen, 
  onClose, 
  onTaskUpdated 
}) => {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState<SyntraTaskStatus>('todo')
  const [editPriority, setEditPriority] = useState<SyntraTaskPriority>('medium')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && taskId) {
      loadTask()
    }
  }, [isOpen, taskId])

  const loadTask = async () => {
    setLoading(true)
    try {
      const data = await taskService.getTask(taskId)
      setTask(data)
      setEditTitle(data.title)
      setEditDescription(data.description || '')
      setEditStatus(data.status)
      setEditPriority(data.priority)
    } catch (error) {
      console.error('Failed to load task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updatedTask = await taskService.updateTask(taskId, {
        title: editTitle,
        description: editDescription,
        status: editStatus,
        priority: editPriority,
      })
      setTask(updatedTask)
      setIsEditing(false)
      onTaskUpdated()
    } catch (error) {
      console.error('Failed to update task:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(taskId)
        onTaskUpdated()
        onClose()
      } catch (error) {
        console.error('Failed to delete task:', error)
      }
    }
  }

  if (!isOpen) return null

  const currentStatus = statusOptions.find(s => s.id === (task?.status || 'todo'))
  const currentPriority = priorityOptions.find(p => p.id === (task?.priority || 'medium'))

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal - Bottom sheet on mobile, centered on desktop */}
      <div className="absolute bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center">
        <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-lg font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              ) : (
                <h2 className="text-lg font-semibold text-gray-900">{task?.title}</h2>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <>
                {/* Status Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((status) => (
                        <button
                          key={status.id}
                          onClick={() => setEditStatus(status.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            editStatus === status.id
                              ? status.color + ' ring-2 ring-offset-1 ring-blue-500'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${currentStatus?.color}`}>
                      {currentStatus?.label}
                    </span>
                  )}
                </div>

                {/* Priority Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {priorityOptions.map((priority) => (
                        <button
                          key={priority.id}
                          onClick={() => setEditPriority(priority.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            editPriority === priority.id
                              ? priority.color + ' ring-2 ring-offset-1 ring-blue-500'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {priority.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${currentPriority?.color}`}>
                      {currentPriority?.label}
                    </span>
                  )}
                </div>

                {/* Description Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Add a description..."
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 min-h-[100px]">
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {task?.description || 'No description provided.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="pt-3 border-t border-gray-100 text-xs text-gray-400 space-y-1">
                  <p>Created: {task?.created_at ? new Date(task.created_at).toLocaleString() : 'N/A'}</p>
                  <p>Updated: {task?.updated_at ? new Date(task.updated_at).toLocaleString() : 'N/A'}</p>
                </div>
                {/* Comments Section */}
<CommentsSection taskId={taskId} />

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex gap-3 pt-3">
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        if (task) {
                          setEditTitle(task.title)
                          setEditDescription(task.description || '')
                          setEditStatus(task.status)
                          setEditPriority(task.priority)
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskDetailsModal