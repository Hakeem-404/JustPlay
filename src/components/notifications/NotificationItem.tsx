import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Notification } from '../../lib/notificationService'
import { useNotifications } from '../../contexts/NotificationContext'
import { Trash2, Check } from 'lucide-react'

interface NotificationItemProps {
  notification: Notification
  icon: React.ReactNode
  onClose?: () => void
}

export default function NotificationItem({ notification, icon, onClose }: NotificationItemProps) {
  const navigate = useNavigate()
  const { markAsRead, deleteNotification } = useNotifications()
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }
  
  const handleClick = async () => {
    // Mark as read if not already
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'game_invitation':
      case 'player_joined':
      case 'game_cancelled':
      case 'game_reminder':
      case 'game_rating':
        if (notification.data?.game_id) {
          // Navigate to game details
          navigate(`/dashboard?game=${notification.data.game_id}`)
        } else {
          navigate('/dashboard')
        }
        break
        
      case 'chat_message':
        if (notification.data?.conversation_id) {
          // Navigate to private conversation
          navigate(`/messages?conversation=${notification.data.conversation_id}`)
        } else if (notification.data?.game_id) {
          // Navigate to game chat
          navigate(`/dashboard?game=${notification.data.game_id}&tab=chat`)
        }
        break
        
      case 'friend_request':
      case 'friend_accepted':
        navigate('/friends')
        break
        
      case 'waitlist_promotion':
        if (notification.data?.game_id) {
          navigate(`/dashboard?game=${notification.data.game_id}`)
        } else {
          navigate('/dashboard')
        }
        break
        
      default:
        // For system notifications, no navigation
        break
    }
    
    // Close notification center if callback provided
    if (onClose) {
      onClose()
    }
  }
  
  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await markAsRead(notification.id)
  }
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteNotification(notification.id)
  }
  
  return (
    <div 
      className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
        notification.isRead ? 'bg-white' : 'bg-blue-50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className={`text-sm font-medium ${notification.isRead ? 'text-gray-900' : 'text-blue-700'}`}>
              {notification.title}
            </h4>
            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
              {formatTime(notification.createdAt)}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mt-1 break-words">
            {notification.message}
          </p>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-end mt-2 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <button
            onClick={handleMarkAsRead}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Mark as read"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete notification"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}