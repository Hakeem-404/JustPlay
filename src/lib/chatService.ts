import { supabase } from './supabase'
import { ChatMessage, SendMessageData } from '../types/chat'

export const chatService = {
  async getMessages(gameId: string, limit = 50, offset = 0): Promise<{ data: ChatMessage[] | null; error: any }> {
    try {
      console.log('💬 Loading messages for game:', gameId, { limit, offset })
      
      const { data, error } = await supabase.rpc('get_game_messages', {
        game_id_param: gameId,
        limit_param: limit,
        offset_param: offset
      })

      if (error) {
        console.error('❌ Error loading messages:', error)
        return { data: null, error }
      }

      // Transform the data to match our ChatMessage interface
      const transformedData: ChatMessage[] = data?.map((msg: any) => ({
        id: msg.message_id,
        gameId: msg.game_id,
        userId: msg.user_id,
        userName: msg.user_name,
        userAvatarUrl: msg.user_avatar_url,
        content: msg.content,
        messageType: msg.message_type,
        status: msg.status,
        replyTo: msg.reply_to,
        editedAt: msg.edited_at,
        deletedAt: msg.deleted_at,
        createdAt: msg.created_at,
        reactions: msg.reactions || []
      })).reverse() || [] // Reverse to show oldest first

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
      
      const { data, error } = await supabase.rpc('send_message', {
        game_id_param: gameId,
        content_param: messageData.content,
        message_type_param: messageData.messageType || 'text',
        reply_to_param: messageData.replyTo || null
      })

      if (error) {
        console.error('❌ Error sending message:', error)
        return { data: null, error }
      }

      if (!data.success) {
        console.error('❌ Send message failed:', data.error)
        return { data: null, error: data.error }
      }

      console.log('✅ Message sent successfully:', data.message)
      
      // Transform the response to match our ChatMessage interface
      const transformedMessage: ChatMessage = {
        id: data.message.id,
        gameId: data.message.game_id,
        userId: data.message.user_id,
        userName: data.message.user_name,
        userAvatarUrl: data.message.user_avatar_url,
        content: data.message.content,
        messageType: data.message.message_type,
        status: data.message.status,
        replyTo: data.message.reply_to,
        editedAt: data.message.edited_at,
        deletedAt: data.message.deleted_at,
        createdAt: data.message.created_at,
        reactions: data.message.reactions || []
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
      
      const { error } = await supabase.rpc('mark_messages_as_read', {
        game_id_param: gameId
      })

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
      const { data, error } = await supabase.rpc('get_unread_message_count', {
        game_id_param: gameId
      })

      if (error) {
        console.error('❌ Error getting unread count:', error)
        return { data: null, error }
      }

      return { data: data || 0, error: null }
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

  // Enhanced real-time subscription for chat messages
  subscribeToGameChat(gameId: string, callback: (message: ChatMessage) => void) {
    console.log('📡 Setting up chat subscription for game:', gameId)
    
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
          console.log('🔔 New message received via real-time:', payload)
          
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
          console.log('🔔 Message updated via real-time:', payload)
          
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