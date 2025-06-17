import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { notificationService, Notification, NotificationPreferences } from '../lib/notificationService'
import { useAuth } from './AuthContext'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  preferences: NotificationPreferences | null
  loading: boolean
  loadingPreferences: boolean
  loadMore: () => Promise<boolean>
  markAsRead: (notificationId: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  deleteNotification: (notificationId: string) => Promise<boolean>
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<boolean>
  requestPushPermission: () => Promise<boolean>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const subscriptionRef = useRef<any>(null)
  const limit = 20

  // Load initial notifications and unread count
  useEffect(() => {
    if (user) {
      loadNotifications()
      loadUnreadCount()
      loadPreferences()
      setupSubscription()
    } else {
      // Reset state when user logs out
      setNotifications([])
      setUnreadCount(0)
      setPreferences(null)
      setLoading(false)
      setLoadingPreferences(false)
      setHasMore(true)
      setOffset(0)
      
      // Clean up subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }

    return () => {
      // Clean up subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [user])

  const setupSubscription = () => {
    if (!user) return

    console.log('🔔 Setting up real-time notification subscription')
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    // Subscribe to new notifications
    subscriptionRef.current = notificationService.subscribeToNotifications((newNotification) => {
      console.log('🔔 Received new notification:', newNotification)
      
      // Add to notifications list
      setNotifications(prev => [newNotification, ...prev])
      
      // Update unread count
      if (!newNotification.isRead) {
        setUnreadCount(prev => prev + 1)
      }
      
      // Show browser notification if enabled
      if (preferences?.pushEnabled) {
        notificationService.showPushNotification(newNotification.title, {
          body: newNotification.message,
          data: newNotification.data
        })
      }
    })
  }

  const loadNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await notificationService.getNotifications(limit, 0)
      
      if (error) {
        console.error('Error loading notifications:', error)
      } else if (data) {
        setNotifications(data)
        setOffset(data.length)
        setHasMore(data.length === limit)
      }
    } catch (err) {
      console.error('Unexpected error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    if (!user) return

    try {
      const { data } = await notificationService.getUnreadCount()
      if (data !== null) {
        setUnreadCount(data)
      }
    } catch (err) {
      console.error('Error loading unread count:', err)
    }
  }

  const loadPreferences = async () => {
    if (!user) return

    setLoadingPreferences(true)
    try {
      const { data, error } = await notificationService.getNotificationPreferences()
      
      if (error) {
        console.error('Error loading notification preferences:', error)
      } else if (data) {
        setPreferences(data)
      }
    } catch (err) {
      console.error('Unexpected error loading notification preferences:', err)
    } finally {
      setLoadingPreferences(false)
    }
  }

  const loadMore = async (): Promise<boolean> => {
    if (!user || !hasMore) return false

    try {
      const { data, error } = await notificationService.getNotifications(limit, offset)
      
      if (error) {
        console.error('Error loading more notifications:', error)
        return false
      }
      
      if (data && data.length > 0) {
        setNotifications(prev => [...prev, ...data])
        setOffset(prev => prev + data.length)
        setHasMore(data.length === limit)
        return true
      } else {
        setHasMore(false)
        return false
      }
    } catch (err) {
      console.error('Unexpected error loading more notifications:', err)
      return false
    }
  }

  const markAsRead = async (notificationId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { success, error } = await notificationService.markAsRead(notificationId)
      
      if (error) {
        console.error('Error marking notification as read:', error)
        return false
      }
      
      if (success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true, readAt: new Date().toISOString() } 
              : notification
          )
        )
        
        // Update unread count
        setUnreadCount(prev => Math.max(prev - 1, 0))
        return true
      }
      
      return false
    } catch (err) {
      console.error('Unexpected error marking notification as read:', err)
      return false
    }
  }

  const markAllAsRead = async (): Promise<boolean> => {
    if (!user) return false

    try {
      const { count, error } = await notificationService.markAllAsRead()
      
      if (error) {
        console.error('Error marking all notifications as read:', error)
        return false
      }
      
      if (count !== null) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            !notification.isRead 
              ? { ...notification, isRead: true, readAt: new Date().toISOString() } 
              : notification
          )
        )
        
        // Reset unread count
        setUnreadCount(0)
        return true
      }
      
      return false
    } catch (err) {
      console.error('Unexpected error marking all notifications as read:', err)
      return false
    }
  }

  const deleteNotification = async (notificationId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { success, error } = await notificationService.deleteNotification(notificationId)
      
      if (error) {
        console.error('Error deleting notification:', error)
        return false
      }
      
      if (success) {
        // Update local state
        const deletedNotification = notifications.find(n => n.id === notificationId)
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        
        // Update unread count if needed
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(prev - 1, 0))
        }
        
        return true
      }
      
      return false
    } catch (err) {
      console.error('Unexpected error deleting notification:', err)
      return false
    }
  }

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>): Promise<boolean> => {
    if (!user || !preferences) return false

    try {
      const { success, error } = await notificationService.updateNotificationPreferences(newPreferences)
      
      if (error) {
        console.error('Error updating notification preferences:', error)
        return false
      }
      
      if (success) {
        // Update local state
        setPreferences(prev => prev ? { ...prev, ...newPreferences } : null)
        return true
      }
      
      return false
    } catch (err) {
      console.error('Unexpected error updating notification preferences:', err)
      return false
    }
  }

  const requestPushPermission = async (): Promise<boolean> => {
    const granted = await notificationService.requestPushPermission()
    
    if (granted && preferences) {
      // Update push_enabled preference
      await updatePreferences({ pushEnabled: true })
    }
    
    return granted
  }

  const refreshNotifications = async (): Promise<void> => {
    await loadNotifications()
    await loadUnreadCount()
  }

  const value = {
    notifications,
    unreadCount,
    preferences,
    loading,
    loadingPreferences,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    requestPushPermission,
    refreshNotifications
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}