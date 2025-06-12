import { supabase } from './supabase'
import { ChatMessage, SendMessageData } from '../types/chat'

export const chatService = {
  async getMessages(gameId: string, limit = 50, offset = 0): Promise<{ data: ChatMessage[] | null; error: any }> {
    try {
      console.log('💬 Loading messages for game:', gameId, { limit, offset })
      
      const { data, error } = await supabase
        .from('game_messages')
        .select(`
          *,
          profiles!user_id (
            name,
            avatar_url
          )
        `)
        .eq('game_id', gameId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('❌ Error loading messages:', error)
        return { data: null, error }
      }

      // Transform the data to match our ChatMessage interface
      const transformedData: ChatMessage[] = data?.map((msg: any) => ({
        id: msg.id,
        gameId: msg.game_id,
        userId: msg.user_id,
        userName: msg.profiles?.name || 'Unknown User',
        userAvatarUrl: msg.profiles?.avatar_url || null,
        content: msg.content,
        messageType: msg.message_type,
        status: msg.status,
        replyTo: msg.reply_to,
        editedAt: msg.edited_at,
        deletedAt: msg.deleted_at,
        createdAt: msg.created_at,
        reactions: []
      })) || []

      console.log('✅ Loaded messages:', transformedData.length)
      return { data: transformedData, error: null }
    } catch (err) {
      console.error('💥 Unexpected error loading messages:', err)
      return { data: null, error: err }
    }
  },

  async sendMessage(gameId: string, messageData: SendMessageData): Promise<{ data: ChatMessage | null; error: any }> {
    try {
      console.log('💬 Sending message to game:', gameId, messageData)
      
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        return { data: null, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('game_messages')
        .insert({
          game_id: gameId,
          user_id: user.id,
          content: messageData.content,
          message_type: messageData.messageType || 'text',
          reply_to: messageData.replyTo || null
        })
        .select(`
          *,
          profiles!user_id (
            name,
            avatar_url
          )
        `)
        .single()

      if (error) {
        console.error('❌ Error sending message:', error)
        return { data: null, error }
      }

      console.log('✅ Message sent successfully:', data)
      
      // Transform the response to match our ChatMessage interface
      const transformedMessage: ChatMessage = {
        id: data.id,
        gameId: data.game_id,
        userId: data.user_id,
        userName: data.profiles?.name || 'Unknown User',
        userAvatarUrl: data.profiles?.avatar_url || null,
        content: data.content,
        messageType: data.message_type,
        status: data.status,
        replyTo: data.reply_to,
        editedAt: data.edited_at,
        deletedAt: data.deleted_at,
        createdAt: data.created_at,
        reactions: []
      }

      return { data: transformedMessage, error: null }
    } catch (err) {
      console.error('💥 Unexpected error sending message:', err)
      return { data: null, error: err }
    }
  },

  async markMessagesAsRead(gameId: string): Promise<{ error: any }> {
    try {
      console.log('💬 Marking messages as read for game:', gameId)
      
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        return { error: 'User not authenticated' }
      }

      // Get all unread messages for this game
      const { data: messages, error: fetchError } = await supabase
        .from('game_messages')
        .select('id')
        .eq('game_id', gameId)
        .neq('user_id', user.id) // Don't mark own messages
        .is('deleted_at', null)

      if (fetchError) {
        console.error('❌ Error fetching messages to mark as read:', fetchError)
        return { error: fetchError }
      }

      if (!messages || messages.length === 0) {
        console.log('✅ No messages to mark as read')
        return { error: null }
      }

      // Insert read status for all messages
      const readStatuses = messages.map(msg => ({
        message_id: msg.id,
        user_id: user.id,
        read_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('message_read_status')
        .upsert(readStatuses, { onConflict: 'message_id,user_id' })

      if (error) {
        console.error('❌ Error marking messages as read:', error)
        return { error }
      }

      console.log('✅ Messages marked as read')
      return { error: null }
    } catch (err) {
      console.error('💥 Unexpected error marking messages as read:', err)
      return { error: err }
    }
  },

  async getUnreadCount(gameId: string): Promise<{ data: number | null; error: any }> {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        return { data: 0, error: null }
      }

      // Count messages that don't have a read status for this user
      const { data: unreadMessages, error } = await supabase
        .from('game_messages')
        .select('id')
        .eq('game_id', gameId)
        .neq('user_id', user.id) // Don't count own messages
        .is('deleted_at', null)

      if (error) {
        console.error('❌ Error getting messages:', error)
        return { data: null, error }
      }

      if (!unreadMessages || unreadMessages.length === 0) {
        return { data: 0, error: null }
      }

      // Check which messages have been read
      const { data: readStatuses, error: readError } = await supabase
        .from('message_read_status')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', unreadMessages.map(m => m.id))

      if (readError) {
        console.error('❌ Error getting read statuses:', readError)
        return { data: null, error: readError }
      }

      const readMessageIds = new Set(readStatuses?.map(rs => rs.message_id) || [])
      const unreadCount = unreadMessages.filter(msg => !readMessageIds.has(msg.id)).length

      return { data: unreadCount, error: null }
    } catch (err) {
      console.error('💥 Unexpected error getting unread count:', err)
      return { data: null, error: err }
    }
  },

  async deleteMessage(messageId: string): Promise<{ error: any }> {
    try {
      console.log('💬 Deleting message:', messageId)
      
      const { error } = await supabase
        .from('game_messages')
        .update({ 
          deleted_at: new Date().toISOString(),
          content: '[Message deleted]',
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)

      if (error) {
        console.error('❌ Error deleting message:', error)
        return { error }
      }

      console.log('✅ Message deleted successfully')
      return { error: null }
    } catch (err) {
      console.error('💥 Unexpected error deleting message:', err)
      return { error: err }
    }
  },

  async editMessage(messageId: string, newContent: string): Promise<{ error: any }> {
    try {
      console.log('💬 Editing message:', messageId)
      
      const { error } = await supabase
        .from('game_messages')
        .update({ 
          content: newContent,
          edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)

      if (error) {
        console.error('❌ Error editing message:', error)
        return { error }
      }

      console.log('✅ Message edited successfully')
      return { error: null }
    } catch (err) {
      console.error('💥 Unexpected error editing message:', err)
      return { error: err }
    }
  },

  // CRITICAL FIX: Enhanced real-time subscription using postgres_changes
  subscribeToGameChat(gameId: string, callback: (message: ChatMessage) => void) {
    console.log('📡 Setting up postgres_changes subscription for game:', gameId)
    
    const subscription = supabase
      .channel(`game_chat_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_messages',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          console.log('🔔 New message received via postgres_changes:', payload)
          
          try {
            // Get the complete message data with user info
            const { data: messageData, error } = await supabase
              .from('game_messages')
              .select(`
                *,
                profiles!user_id (
                  name,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) {
              console.error('❌ Error fetching complete message data:', error)
              return
            }

            if (messageData) {
              // Transform to ChatMessage format
              const newMessage: ChatMessage = {
                id: messageData.id,
                gameId: messageData.game_id,
                userId: messageData.user_id,
                userName: messageData.profiles?.name || 'Unknown User',
                userAvatarUrl: messageData.profiles?.avatar_url || null,
                content: messageData.content,
                messageType: messageData.message_type,
                status: messageData.status,
                replyTo: messageData.reply_to,
                editedAt: messageData.edited_at,
                deletedAt: messageData.deleted_at,
                createdAt: messageData.created_at,
                reactions: []
              }

              console.log('📨 Broadcasting new message to component:', newMessage)
              callback(newMessage)
            }
          } catch (err) {
            console.error('💥 Error processing real-time message:', err)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_messages',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          console.log('🔔 Message updated via postgres_changes:', payload)
          
          // For updates (edits/deletes), we could reload the specific message
          // For now, we'll just log it
        }
      )
      .subscribe((status) => {
        console.log('📡 Chat subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to chat for game:', gameId)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Chat subscription error for game:', gameId)
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Chat subscription timed out for game:', gameId)
        } else if (status === 'CLOSED') {
          console.log('🔌 Chat subscription closed for game:', gameId)
        }
      })

    return subscription
  },

  // Subscribe to typing indicators (future enhancement)
  subscribeToTyping(gameId: string, callback: (typingUsers: string[]) => void) {
    // This would be implemented with a separate typing_indicators table
    // For now, return a dummy subscription
    return {
      unsubscribe: () => console.log('Typing subscription unsubscribed')
    }
  }
}