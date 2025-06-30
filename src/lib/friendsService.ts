import { supabase } from './supabase'
import { Friend, FriendRequest, PrivateMessage, Conversation } from '../types/friends'

export const friendsService = {
  async sendFriendRequest(addresseeId: string): Promise<{ data: any; error: string | null }> {
    try {
      console.log('👥 Sending friend request to:', addresseeId)
      
      const { data, error } = await supabase.rpc('send_friend_request', {
        addressee_id_param: addresseeId
      })

      if (error) {
        console.error('❌ Error sending friend request:', error)
        return { data: null, error: error.message }
      }

      if (!data.success) {
        console.warn('⚠️ Friend request failed:', data.error)
        return { data: null, error: data.error }
      }

      console.log('✅ Friend request sent successfully')
      return { data, error: null }
    } catch (err) {
      console.error('💥 Unexpected error sending friend request:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async respondToFriendRequest(friendshipId: string, response: 'accepted' | 'declined'): Promise<{ data: any; error: string | null }> {
    try {
      console.log('👥 Responding to friend request:', friendshipId, response)
      
      const { data, error } = await supabase.rpc('respond_to_friend_request', {
        friendship_id_param: friendshipId,
        response_param: response
      })

      if (error) {
        console.error('❌ Error responding to friend request:', error)
        return { data: null, error: error.message }
      }

      if (!data.success) {
        console.warn('⚠️ Friend request response failed:', data.error)
        return { data: null, error: data.error }
      }

      console.log('✅ Friend request response sent successfully')
      return { data, error: null }
    } catch (err) {
      console.error('💥 Unexpected error responding to friend request:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getFriendsList(userId?: string): Promise<{ data: Friend[] | null; error: string | null }> {
    try {
      console.log('👥 Loading friends list for user:', userId || 'current user')
      
      const { data, error } = await supabase.rpc('get_friends_list', 
        userId ? { user_id_param: userId } : {}
      )

      if (error) {
        console.error('❌ Error loading friends list:', error)
        return { data: null, error: error.message }
      }

      const transformedData: Friend[] = data?.map((friend: any) => ({
        id: friend.friend_id,
        name: friend.friend_name,
        avatarUrl: friend.friend_avatar_url,
        location: friend.friend_location,
        friendshipCreatedAt: friend.friendship_created_at
      })) || []

      console.log('✅ Loaded friends list:', transformedData.length, 'friends')
      return { data: transformedData, error: null }
    } catch (err) {
      console.error('💥 Unexpected error loading friends list:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getFriendRequests(): Promise<{ data: FriendRequest[] | null; error: string | null }> {
    try {
      console.log('👥 Loading friend requests')
      
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          requester_id,
          created_at,
          profiles!requester_id (
            name,
            avatar_url,
            location
          )
        `)
        .eq('addressee_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error loading friend requests:', error)
        return { data: null, error: error.message }
      }

      const transformedData: FriendRequest[] = data?.map((request: any) => ({
        id: request.id,
        requesterId: request.requester_id,
        requesterName: request.profiles?.name || 'Unknown User',
        requesterAvatarUrl: request.profiles?.avatar_url,
        requesterLocation: request.profiles?.location || 'Unknown Location',
        createdAt: request.created_at
      })) || []

      console.log('✅ Loaded friend requests:', transformedData.length, 'requests')
      return { data: transformedData, error: null }
    } catch (err) {
      console.error('💥 Unexpected error loading friend requests:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async checkFriendshipStatus(userId: string): Promise<{ status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked'; friendshipId?: string }> {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user
      if (!currentUser) return { status: 'none' }

      const { data, error } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUser.id})`)
        .single()

      if (error || !data) {
        return { status: 'none' }
      }

      if (data.status === 'accepted') {
        return { status: 'friends', friendshipId: data.id }
      } else if (data.status === 'blocked') {
        return { status: 'blocked', friendshipId: data.id }
      } else if (data.status === 'pending') {
        if (data.requester_id === currentUser.id) {
          return { status: 'pending_sent', friendshipId: data.id }
        } else {
          return { status: 'pending_received', friendshipId: data.id }
        }
      }

      return { status: 'none' }
    } catch (err) {
      console.error('💥 Error checking friendship status:', err)
      return { status: 'none' }
    }
  },

  async removeFriend(friendshipId: string): Promise<{ data: any; error: string | null }> {
    try {
      console.log('👥 Removing friend:', friendshipId)
      
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) {
        console.error('❌ Error removing friend:', error)
        return { data: null, error: error.message }
      }

      console.log('✅ Friend removed successfully')
      return { data: { success: true }, error: null }
    } catch (err) {
      console.error('💥 Unexpected error removing friend:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async sendPrivateMessage(recipientId: string, content: string): Promise<{ data: PrivateMessage | null; error: string | null }> {
    try {
      console.log('💬 Sending private message to:', recipientId, 'Content:', content)
      
      // Validate input
      if (!content.trim()) {
        return { data: null, error: 'Message content cannot be empty' }
      }
      
      if (content.length > 2000) {
        return { data: null, error: 'Message too long (max 2000 characters)' }
      }

      const { data, error } = await supabase.rpc('send_private_message', {
        recipient_id_param: recipientId,
        content_param: content.trim()
      })

      if (error) {
        console.error('❌ Error sending private message:', error)
        return { data: null, error: error.message }
      }

      if (!data.success) {
        console.warn('⚠️ Private message failed:', data.error)
        return { data: null, error: data.error }
      }

      const transformedMessage: PrivateMessage = {
        id: data.message.id,
        conversationId: data.message.conversation_id,
        senderId: data.message.sender_id,
        recipientId: data.message.recipient_id,
        senderName: data.message.sender_name,
        senderAvatarUrl: data.message.sender_avatar_url,
        content: data.message.content,
        createdAt: data.message.created_at
      }

      console.log('✅ Private message sent successfully:', transformedMessage)
      return { data: transformedMessage, error: null }
    } catch (err) {
      console.error('💥 Unexpected error sending private message:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getConversations(): Promise<{ data: Conversation[] | null; error: string | null }> {
    try {
      console.log('💬 Loading conversations')
      
      const currentUser = (await supabase.auth.getUser()).data.user
      if (!currentUser) {
        console.error('❌ User not authenticated')
        return { data: null, error: 'User not authenticated' }
      }

      console.log('🔍 Current user ID:', currentUser.id)

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          participant_1,
          participant_2,
          last_message_at,
          created_at
        `)
        .or(`participant_1.eq.${currentUser.id},participant_2.eq.${currentUser.id}`)
        .order('last_message_at', { ascending: false })

      if (error) {
        console.error('❌ Error loading conversations:', error)
        return { data: null, error: error.message }
      }

      console.log('📋 Raw conversations data:', data)

      // Get other participant details and last messages
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv: any) => {
          const otherParticipantId = conv.participant_1 === currentUser.id ? conv.participant_2 : conv.participant_1

          console.log('👤 Getting details for participant:', otherParticipantId)

          // Get other participant profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', otherParticipantId)
            .single()

          if (profileError) {
            console.error('❌ Error loading profile for user:', otherParticipantId, profileError)
          }

          // Get last message
          const { data: lastMessage, error: messageError } = await supabase
            .from('private_messages')
            .select('content, sender_id, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (messageError && messageError.code !== 'PGRST116') {
            console.error('❌ Error loading last message for conversation:', conv.id, messageError)
          }

          // Get unread count
          const { count: unreadCount, error: countError } = await supabase
            .from('private_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('recipient_id', currentUser.id)
            .is('read_at', null)

          if (countError) {
            console.error('❌ Error counting unread messages for conversation:', conv.id, countError)
          }

          return {
            id: conv.id,
            participant1: conv.participant_1,
            participant2: conv.participant_2,
            lastMessageAt: conv.last_message_at,
            createdAt: conv.created_at,
            otherParticipant: {
              id: otherParticipantId,
              name: profile?.name || 'Unknown User',
              avatarUrl: profile?.avatar_url
            },
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              senderId: lastMessage.sender_id,
              createdAt: lastMessage.created_at
            } : undefined,
            unreadCount: unreadCount || 0
          }
        })
      )

      console.log('✅ Loaded conversations:', conversationsWithDetails.length)
      return { data: conversationsWithDetails, error: null }
    } catch (err) {
      console.error('💥 Unexpected error loading conversations:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getConversationMessages(conversationId: string, limit = 50, offset = 0): Promise<{ data: PrivateMessage[] | null; error: string | null }> {
    try {
      console.log('💬 Loading conversation messages:', conversationId, { limit, offset })
      
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        conversation_id_param: conversationId,
        limit_param: limit,
        offset_param: offset
      })

      if (error) {
        console.error('❌ Error loading conversation messages:', error)
        return { data: null, error: error.message }
      }

      const transformedData: PrivateMessage[] = data?.map((msg: any) => ({
        id: msg.message_id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        recipientId: msg.recipient_id,
        senderName: msg.sender_name,
        senderAvatarUrl: msg.sender_avatar_url,
        content: msg.content,
        readAt: msg.read_at,
        createdAt: msg.created_at
      })).reverse() || [] // Reverse to show oldest first

      console.log('✅ Loaded conversation messages:', transformedData.length)
      return { data: transformedData, error: null }
    } catch (err) {
      console.error('💥 Unexpected error loading conversation messages:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async markMessagesAsRead(conversationId: string): Promise<{ error: string | null }> {
    try {
      console.log('💬 Marking messages as read:', conversationId)
      
      const currentUser = (await supabase.auth.getUser()).data.user
      if (!currentUser) return { error: 'User not authenticated' }

      const { error } = await supabase
        .from('private_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', currentUser.id)
        .is('read_at', null)

      if (error) {
        console.error('❌ Error marking messages as read:', error)
        return { error: error.message }
      }

      console.log('✅ Messages marked as read')
      return { error: null }
    } catch (err) {
      console.error('💥 Unexpected error marking messages as read:', err)
      return { error: 'An unexpected error occurred' }
    }
  },

  // Real-time subscription for private messages
  subscribeToPrivateMessages(conversationId: string, callback: (message: PrivateMessage) => void) {
    console.log('📡 Setting up private message subscription for conversation:', conversationId)
    
    if (!conversationId) {
      console.error('❌ No conversation ID provided for subscription')
      return null
    }
    
    const subscription = supabase
      .channel(`private_messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload: any) => {
          console.log('🔔 New private message received:', payload)
          
          try {
            // Get sender profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', payload.new.sender_id)
              .single()

            if (profileError) {
              console.error('❌ Error loading sender profile:', profileError)
            }

            const newMessage: PrivateMessage = {
              id: payload.new.id,
              conversationId: payload.new.conversation_id,
              senderId: payload.new.sender_id,
              recipientId: payload.new.recipient_id,
              senderName: profile?.name || 'Unknown User',
              senderAvatarUrl: profile?.avatar_url,
              content: payload.new.content,
              readAt: payload.new.read_at,
              createdAt: payload.new.created_at
            }

            console.log('📨 Processed new message:', newMessage)
            callback(newMessage)
          } catch (err) {
            console.error('💥 Error processing real-time private message:', err)
          }
        }
      )
      .subscribe((status: any) => {
        console.log('📡 Private message subscription status:', status)
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Private message subscription error')
        }
      })

    return subscription
  },

  // Real-time subscription for conversations list
  subscribeToConversations(callback: () => void) {
    console.log('📡 Setting up conversations subscription')
    
    const subscription = supabase
      .channel('conversations_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_messages'
        },
        () => {
          console.log('🔔 Conversation update received')
          callback()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          console.log('🔔 Conversation list update received')
          callback()
        }
      )
      .subscribe((status: any) => {
        console.log('📡 Conversations subscription status:', status)
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Conversations subscription error')
        }
      })

    return subscription
  }
}