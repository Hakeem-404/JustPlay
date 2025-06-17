import React, { useState, useEffect, useRef } from 'react'
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  Settings, 
  MessageCircle, 
  UserPlus, 
  Calendar, 
  Users, 
  Star, 
  Info,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../contexts/NotificationContext'
import { Notification } from '../../lib/notificationService'
import NotificationItem from './NotificationItem'
import NotificationPreferencesModal from './NotificationPreferencesModal'

interface NotificationCenterProps {
  className?: string
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAllAsRead, 
    loadMore,
    refreshNotifications
  } = useNotifications()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Close notification center when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true)
    try {
      await markAllAsRead()
    } finally {
      setMarkingAllRead(false)
    }
  }

  const handleLoadMore = async () => {
    setLoadingMore(true)
    try {
      await loadMore()
    } finally {
      setLoadingMore(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshNotifications()
    } finally {
      setRefreshing(false)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'game_invitation':
        return <Calendar className="h-5 w-5 text-blue-500" />
      case 'player_joined':
        return <Users className="h-5 w-5 text-green-500" />
      case 'game_cancelled':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'chat_message':
        return <MessageCircle className="h-5 w-5 text-purple-500" />
      case 'waitlist_promotion':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'game_reminder':
        return <Calendar className="h-5 w-5 text-orange-500" />
      case 'friend_request':
        return <UserPlus className="h-5 w-5 text-blue-500" />
      case 'friend_accepted':
        return <Check className="h-5 w-5 text-green-500" />
      case 'game_rating':
        return <Star className="h-5 w-5 text-yellow-500" />
      case 'system':
        return <Info className="h-5 w-5 text-gray-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className={`relative ${className}`} ref={notificationRef}>
      {/* Notification Bell */}
      <button
        onClick={handleToggle}
        className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-[10001] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                title="Refresh notifications"
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleMarkAllAsRead}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                title="Mark all as read"
                disabled={markingAllRead || unreadCount === 0}
              >
                {markingAllRead ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setShowPreferences(true)}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                title="Notification settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    icon={getNotificationIcon(notification.type)}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
                
                {/* Load More Button */}
                <div className="p-3 border-t border-gray-100 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </div>
  )
}