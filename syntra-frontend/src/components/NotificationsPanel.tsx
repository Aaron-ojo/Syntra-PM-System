import React, { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, Trash2, X, MessageCircle, UserPlus, ClipboardCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import notificationService from '../services/notificationService'
import type { Notification } from '../types'

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
  onUnreadCountChange?: (count: number) => void
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ 
  isOpen, 
  onClose, 
  onUnreadCountChange 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const data = await notificationService.getNotifications()
      setNotifications(data)
      const unreadCount = data.filter(n => !n.read).length
      onUnreadCountChange?.(unreadCount)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      )
      const unreadCount = notifications.filter(n => !n.read || n.id === id).length - 1
      onUnreadCountChange?.(unreadCount)
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await notificationService.markAllAsRead()
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      )
      onUnreadCountChange?.(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    } finally {
      setMarkingAll(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id)
      const updated = notifications.filter(n => n.id !== id)
      setNotifications(updated)
      const unreadCount = updated.filter(n => !n.read).length
      onUnreadCountChange?.(unreadCount)
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id)
    }
    
    if (notification.data?.task_id) {
      onClose()
      navigate(`/project/${notification.data.task_id}`)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'comment_added':
      case 'comment_reply':
        return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'task_assigned':
        return <UserPlus className="w-4 h-4 text-green-500" />
      case 'status_changed':
        return <ClipboardCheck className="w-4 h-4 text-purple-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div 
      ref={panelRef}
      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">When you get notifications, they'll appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {notification.content}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(notification.id)
                        }}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(notification.created_at)}
                    </p>
                    {!notification.read && (
                      <div className="mt-2">
                        <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPanel