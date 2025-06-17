import { supabase } from './supabase'

export interface Notification {
  id: string
  type: 'game_invitation' | 'player_joined' | 'game_cancelled' | 'chat_message' | 'waitlist_promotion' | 'game_reminder' | 'friend_request' | 'friend_accepted' | 'game_rating' | 'system'
  title: string
  message: string
  data: any
  isRead: boolean
  createdAt: string
  readAt: string | null
}

export interface NotificationPreferences {
  id: string
  userId: string
  emailEnabled: boolean
  pushEnabled: boolean
  gameInvitations: boolean
  gameUpdates: boolean
  chatMessages: boolean
  friendRequests: boolean
  gameReminders: boolean
  updatedAt: string
}

export const notificationService = {
  async getNotifications(limit = 20, offset = 0, unreadOnly = false): Promise<{ data: Notification[] | null; error: any }> {
    try {
      console.log('🔔 Loading notifications:', { limit, offset, unreadOnly })
      
      const { data, error } = await supabase.rpc('get_user_notifications', {
        limit_param: limit,
        offset_param: offset,
        unread_only: unreadOnly
      })

      if (error) {
        console.error('❌ Error loading notifications:', error)
        return { data: null, error }
      }

      // Transform snake_case to camelCase
      const transformedData: Notification[] = data?.map((notification: any) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.is_read,
        createdAt: notification.created_at,
        readAt: notification.read_at
      })) || []

      console.log('✅ Loaded notifications:', transformedData.length)
      return { data: transformedData, error: null }
    } catch (err) {
      console.error('💥 Unexpected error loading notifications:', err)
      return { data: null, error: err }
    }
  },

  async getUnreadCount(): Promise<{ data: number | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('get_unread_notification_count')

      if (error) {
        console.error('❌ Error getting unread count:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (err) {
      console.error('💥 Unexpected error getting unread count:', err)
      return { data: null, error: err }
    }
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean; error: any }> {
    try {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        notification_id_param: notificationId
      })

      if (error) {
        console.error('❌ Error marking notification as read:', error)
        return { success: false, error }
      }

      return { success: data, error: null }
    } catch (err) {
      console.error('💥 Unexpected error marking notification as read:', err)
      return { success: false, error: err }
    }
  },

  async markAllAsRead(): Promise<{ count: number | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('mark_all_notifications_read')

      if (error) {
        console.error('❌ Error marking all notifications as read:', error)
        return { count: null, error }
      }

      return { count: data, error: null }
    } catch (err) {
      console.error('💥 Unexpected error marking all notifications as read:', err)
      return { count: null, error: err }
    }
  },

  async deleteNotification(notificationId: string): Promise<{ success: boolean; error: any }> {
    try {
      const { data, error } = await supabase.rpc('delete_notification', {
        notification_id_param: notificationId
      })

      if (error) {
        console.error('❌ Error deleting notification:', error)
        return { success: false, error }
      }

      return { success: data, error: null }
    } catch (err) {
      console.error('💥 Unexpected error deleting notification:', err)
      return { success: false, error: err }
    }
  },

  async getNotificationPreferences(): Promise<{ data: NotificationPreferences | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error loading notification preferences:', error)
        return { data: null, error }
      }

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single()

        if (insertError) {
          console.error('❌ Error creating default notification preferences:', insertError)
          return { data: null, error: insertError }
        }

        // Transform snake_case to camelCase
        const transformedData: NotificationPreferences = {
          id: newPrefs.id,
          userId: newPrefs.user_id,
          emailEnabled: newPrefs.email_enabled,
          pushEnabled: newPrefs.push_enabled,
          gameInvitations: newPrefs.game_invitations,
          gameUpdates: newPrefs.game_updates,
          chatMessages: newPrefs.chat_messages,
          friendRequests: newPrefs.friend_requests,
          gameReminders: newPrefs.game_reminders,
          updatedAt: newPrefs.updated_at
        }

        return { data: transformedData, error: null }
      }

      // Transform snake_case to camelCase
      const transformedData: NotificationPreferences = {
        id: data.id,
        userId: data.user_id,
        emailEnabled: data.email_enabled,
        pushEnabled: data.push_enabled,
        gameInvitations: data.game_invitations,
        gameUpdates: data.game_updates,
        chatMessages: data.chat_messages,
        friendRequests: data.friend_requests,
        gameReminders: data.game_reminders,
        updatedAt: data.updated_at
      }

      return { data: transformedData, error: null }
    } catch (err) {
      console.error('💥 Unexpected error loading notification preferences:', err)
      return { data: null, error: err }
    }
  },

  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<{ success: boolean; error: any }> {
    try {
      // Convert camelCase to snake_case
      const updateData: any = {}
      if (preferences.emailEnabled !== undefined) updateData.email_enabled = preferences.emailEnabled
      if (preferences.pushEnabled !== undefined) updateData.push_enabled = preferences.pushEnabled
      if (preferences.gameInvitations !== undefined) updateData.game_invitations = preferences.gameInvitations
      if (preferences.gameUpdates !== undefined) updateData.game_updates = preferences.gameUpdates
      if (preferences.chatMessages !== undefined) updateData.chat_messages = preferences.chatMessages
      if (preferences.friendRequests !== undefined) updateData.friend_requests = preferences.friendRequests
      if (preferences.gameReminders !== undefined) updateData.game_reminders = preferences.gameReminders

      const { error } = await supabase
        .from('notification_preferences')
        .update(updateData)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)

      if (error) {
        console.error('❌ Error updating notification preferences:', error)
        return { success: false, error }
      }

      return { success: true, error: null }
    } catch (err) {
      console.error('💥 Unexpected error updating notification preferences:', err)
      return { success: false, error: err }
    }
  },

  // Subscribe to real-time notifications
  subscribeToNotifications(callback: (notification: Notification) => void) {
    console.log('📡 Setting up notifications subscription')
    
    const subscription = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${(supabase.auth.getSession() as any)?.user?.id}`
        },
        (payload) => {
          console.log('🔔 New notification received:', payload)
          
          // Transform to Notification format
          const newNotification: Notification = {
            id: payload.new.id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            data: payload.new.data,
            isRead: payload.new.is_read,
            createdAt: payload.new.created_at,
            readAt: payload.new.read_at
          }
          
          callback(newNotification)
        }
      )
      .subscribe((status) => {
        console.log('📡 Notifications subscription status:', status)
      })

    return subscription
  },

  // Request push notification permission
  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support push notifications')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      const granted = permission === 'granted'
      
      if (granted) {
        console.log('Push notification permission granted')
      } else {
        console.log('Push notification permission denied')
      }
      
      return granted
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  },

  // Show browser push notification
  showPushNotification(title: string, options: NotificationOptions = {}): boolean {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return false
    }

    try {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options
      })
      return true
    } catch (error) {
      console.error('Error showing push notification:', error)
      return false
    }
  }
}