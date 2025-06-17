import React from 'react'
import { useNotifications } from '../../contexts/NotificationContext'

interface NotificationBadgeProps {
  count?: number
  className?: string
  showZero?: boolean
}

export default function NotificationBadge({ 
  count, 
  className = '', 
  showZero = false 
}: NotificationBadgeProps) {
  const { unreadCount } = useNotifications()
  
  // Use provided count or global unread count
  const displayCount = count !== undefined ? count : unreadCount
  
  // Don't render if count is 0 and showZero is false
  if (displayCount === 0 && !showZero) {
    return null
  }
  
  return (
    <span 
      className={`bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium ${className}`}
      aria-label={`${displayCount} unread notifications`}
    >
      {displayCount > 99 ? '99+' : displayCount}
    </span>
  )
}