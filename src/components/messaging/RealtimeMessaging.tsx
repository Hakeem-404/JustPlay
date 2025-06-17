import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Check, 
  CheckCheck,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { friendsService } from '../../lib/friendsService'
import { PrivateMessage } from '../../types/friends'
import { useRealtimeConnection } from '../../hooks/useRealtimeConnection'
import { useTypingIndicator } from '../../hooks/useTypingIndicator'
import { useMessageStatus, MessageStatus } from '../../hooks/useMessageStatus'

interface RealtimeMessagingProps {
  conversationId: string
  recipientId: string
  recipientName: string
  onMessageSent?: (message: PrivateMessage) => void
}

interface TypingUser {
  user_id: string
  user_name: string
  timestamp: string
}

export default function RealtimeMessaging({ 
  conversationId, 
  recipientId, 
  recipientName,
  onMessageSent 
}: RealtimeMessagingProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  
  const { connectionStatus, subscribe, unsubscribe, reconnect, isConnected } = useRealtimeConnection()
  const { messageStatuses, updateMessageStatus, getMessageStatus, retryFailedMessage } = useMessageStatus()
  
  const channelRef = useRef<any>(null)

  // Initialize typing indicator
  const { startTyping, stopTyping } = useTypingIndicator(channelRef.current, conversationId)

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return

    setLoading(true)
    setError(null)

    try {
      console.log('💬 Loading messages for conversation:', conversationId)
      const { data, error } = await friendsService.getConversationMessages(conversationId)
      
      if (error) {
        setError(error)
      } else {
        setMessages(data || [])
        // Mark messages as read
        await friendsService.markMessagesAsRead(conversationId)
      }
    } catch (err) {
      console.error('Error loading messages:', err)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId || !isConnected) return

    console.log('📡 Setting up real-time subscription for conversation:', conversationId)

    // Subscribe to private message changes
    const channel = subscribe(`private_messages_${conversationId}`, (payload) => {
      console.log('📨 Real-time message update:', payload)
      
      if (payload.eventType === 'INSERT' && payload.new) {
        const newMsg = payload.new
        
        // Transform to PrivateMessage format
        const privateMessage: PrivateMessage = {
          id: newMsg.id,
          conversationId: newMsg.conversation_id,
          senderId: newMsg.sender_id,
          recipientId: newMsg.recipient_id,
          senderName: newMsg.sender_id === user?.id ? 'You' : recipientName,
          content: newMsg.content,
          readAt: newMsg.read_at,
          createdAt: newMsg.created_at
        }

        // Add message if it's not from current user (avoid duplicates)
        if (newMsg.sender_id !== user?.id) {
          setMessages(prev => {
            // Check for duplicates
            const exists = prev.some(msg => msg.id === privateMessage.id)
            if (exists) return prev
            
            return [...prev, privateMessage]
          })

          // Auto-mark as read if conversation is active
          setTimeout(() => {
            friendsService.markMessagesAsRead(conversationId)
          }, 1000)
        }

        // Update message status for sent messages
        if (newMsg.sender_id === user?.id) {
          updateMessageStatus(newMsg.id, 'sent')
        }
      }

      if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedMsg = payload.new
        
        // Update read status
        if (updatedMsg.read_at && updatedMsg.sender_id === user?.id) {
          updateMessageStatus(updatedMsg.id, 'read')
        }

        // Update message in state
        setMessages(prev => prev.map(msg => 
          msg.id === updatedMsg.id 
            ? { ...msg, readAt: updatedMsg.read_at }
            : msg
        ))
      }
    })

    if (channel) {
      channelRef.current = channel

      // Set up typing indicator listeners
      channel.on('broadcast', { event: 'typing' }, (payload) => {
        console.log('⌨️ Typing indicator received:', payload)
        
        const { user_id, user_name, is_typing, timestamp } = payload.payload
        
        if (user_id === user?.id) return // Ignore own typing

        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.user_id !== user_id)
          
          if (is_typing) {
            return [...filtered, { user_id, user_name, timestamp }]
          } else {
            return filtered
          }
        })

        // Auto-remove typing indicator after timeout
        if (is_typing) {
          const existingTimeout = typingTimeoutRef.current.get(user_id)
          if (existingTimeout) {
            clearTimeout(existingTimeout)
          }

          const timeout = setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.user_id !== user_id))
            typingTimeoutRef.current.delete(user_id)
          }, 5000)

          typingTimeoutRef.current.set(user_id, timeout)
        }
      })
    }

    return () => {
      if (channel) {
        console.log('📡 Cleaning up real-time subscription')
        unsubscribe(channel)
        channelRef.current = null
      }
      
      // Clear typing timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout))
      typingTimeoutRef.current.clear()
    }
  }, [conversationId, isConnected, subscribe, unsubscribe, user, recipientName, updateMessageStatus])

  // Load messages when conversation changes
  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  // Handle message sending with optimistic updates
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !user) return

    const messageContent = newMessage.trim()
    const tempId = `temp-${Date.now()}`
    
    setSending(true)
    setNewMessage('')
    stopTyping()

    // Optimistic update
    const optimisticMessage: PrivateMessage = {
      id: tempId,
      conversationId,
      senderId: user.id,
      recipientId,
      senderName: 'You',
      content: messageContent,
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, optimisticMessage])
    updateMessageStatus(tempId, 'sending')

    const sendMessageFn = async () => {
      const { data, error } = await friendsService.sendPrivateMessage(recipientId, messageContent)
      
      if (error) {
        throw new Error(error)
      }

      if (data) {
        // Replace optimistic message with real message
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? data : msg
        ))
        
        updateMessageStatus(data.id, 'sent')
        onMessageSent?.(data)
        
        return data
      }
    }

    try {
      await sendMessageFn()
    } catch (err) {
      console.error('Error sending message:', err)
      updateMessageStatus(tempId, 'failed', err instanceof Error ? err.message : 'Failed to send')
      
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      
      // Restore message text for retry
      setNewMessage(messageContent)
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  // Handle typing events
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    
    if (e.target.value.trim()) {
      startTyping()
    } else {
      stopTyping()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Retry failed message
  const handleRetryMessage = async (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId)
    if (!message) return

    await retryFailedMessage(messageId, async () => {
      const { data, error } = await friendsService.sendPrivateMessage(recipientId, message.content)
      if (error) throw new Error(error)
      
      if (data) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? data : msg
        ))
        onMessageSent?.(data)
      }
    })
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const getMessageStatusIcon = (message: PrivateMessage) => {
    const status = getMessageStatus(message.id)
    
    if (message.senderId !== user?.id) return null

    switch (status?.status) {
      case 'sending':
        return <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
      case 'failed':
        return (
          <button
            onClick={() => handleRetryMessage(message.id)}
            className="text-red-500 hover:text-red-700"
            title="Click to retry"
          >
            <AlertCircle className="h-3 w-3" />
          </button>
        )
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      default:
        return message.readAt ? (
          <CheckCheck className="h-3 w-3 text-blue-500" />
        ) : (
          <Check className="h-3 w-3 text-gray-400" />
        )
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-xs text-gray-600">
            {connectionStatus.status === 'connected' && 'Connected'}
            {connectionStatus.status === 'connecting' && 'Connecting...'}
            {connectionStatus.status === 'disconnected' && 'Disconnected'}
            {connectionStatus.status === 'error' && `Error: ${connectionStatus.error}`}
          </span>
        </div>
        
        {!isConnected && (
          <button
            onClick={reconnect}
            className="text-blue-600 hover:text-blue-700 text-xs flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === user?.id
            const prevMessage = index > 0 ? messages[index - 1] : null
            const isConsecutive = prevMessage && 
              prevMessage.senderId === message.senderId &&
              (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) < 5 * 60 * 1000

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                  isConsecutive ? 'mt-1' : 'mt-4'
                }`}
              >
                <div className={`max-w-[70%] ${isOwn ? 'ml-4' : 'mr-4'}`}>
                  {!isConsecutive && (
                    <div className={`flex items-center space-x-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-sm font-medium text-gray-700">{message.senderName}</span>
                      <span className="text-xs text-gray-500">{formatMessageTime(message.createdAt)}</span>
                    </div>
                  )}

                  <div className="flex items-end space-x-2">
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    
                    {isOwn && (
                      <div className="flex-shrink-0">
                        {getMessageStatusIcon(message)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-2 max-w-[70%]">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-600">
                  {typingUsers.map(u => u.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border-t border-red-200 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={sending || !isConnected}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending || !isConnected}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}