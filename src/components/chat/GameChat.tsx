import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Send, 
  Smile, 
  MoreVertical, 
  Reply, 
  Edit3, 
  Trash2,
  AlertCircle,
  Loader2,
  Users,
  MessageCircle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { chatService } from '../../lib/chatService'
import { ChatMessage, ChatState } from '../../types/chat'
import { Game } from '../../types/game'

interface GameChatProps {
  game: Game
  isVisible: boolean
  onUnreadCountChange?: (count: number) => void
}

export default function GameChat({ game, isVisible, onUnreadCountChange }: GameChatProps) {
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    loading: true,
    hasMore: true,
    unreadCount: 0,
    typingUsers: [],
    error: null
  })
  
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Load initial messages
  const loadMessages = useCallback(async (offset = 0) => {
    if (!game.id) return

    try {
      setChatState(prev => ({ ...prev, loading: offset === 0 }))
      
      const { data, error } = await chatService.getMessages(game.id, 50, offset)
      
      if (error) {
        setChatState(prev => ({ 
          ...prev, 
          error: 'Failed to load messages',
          loading: false 
        }))
        return
      }

      setChatState(prev => ({
        ...prev,
        messages: offset === 0 ? (data || []) : [...(data || []), ...prev.messages],
        hasMore: (data?.length || 0) === 50,
        loading: false,
        error: null
      }))

      // Load unread count
      const { data: unreadCount } = await chatService.getUnreadCount(game.id)
      if (unreadCount !== null) {
        setChatState(prev => ({ ...prev, unreadCount }))
        onUnreadCountChange?.(unreadCount)
      }
    } catch (err) {
      setChatState(prev => ({ 
        ...prev, 
        error: 'An unexpected error occurred',
        loading: false 
      }))
    }
  }, [game.id, onUnreadCountChange])

  // Mark messages as read when chat becomes visible
  const markAsRead = useCallback(async () => {
    if (!isVisible || !game.id || chatState.unreadCount === 0) return

    try {
      await chatService.markMessagesAsRead(game.id)
      setChatState(prev => ({ ...prev, unreadCount: 0 }))
      onUnreadCountChange?.(0)
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }, [isVisible, game.id, chatState.unreadCount, onUnreadCountChange])

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !user) return

    setSending(true)
    try {
      if (editingMessage) {
        // Edit existing message
        await chatService.editMessage(editingMessage.id, newMessage.trim())
        setEditingMessage(null)
      } else {
        // Send new message
        const { error } = await chatService.sendMessage(game.id, {
          content: newMessage.trim(),
          replyTo: replyTo?.id
        })

        if (error) {
          setChatState(prev => ({ ...prev, error: 'Failed to send message' }))
          return
        }
      }

      setNewMessage('')
      setReplyTo(null)
      
      // Auto-scroll to bottom
      setTimeout(() => scrollToBottom(), 100)
    } catch (err) {
      setChatState(prev => ({ ...prev, error: 'Failed to send message' }))
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId)
    } catch (err) {
      setChatState(prev => ({ ...prev, error: 'Failed to delete message' }))
    }
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

  const getUserInitials = (name: string) => {
    const names = name.split(' ')
    return names.length > 1 
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0][0].toUpperCase()
  }

  const isConsecutiveMessage = (currentMsg: ChatMessage, prevMsg: ChatMessage | undefined) => {
    if (!prevMsg) return false
    
    const timeDiff = new Date(currentMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()
    const fiveMinutes = 5 * 60 * 1000
    
    return prevMsg.userId === currentMsg.userId && timeDiff < fiveMinutes
  }

  // Load messages on mount
  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Mark as read when visible
  useEffect(() => {
    if (isVisible) {
      markAsRead()
    }
  }, [isVisible, markAsRead])

  // Enhanced real-time subscription with better error handling
  useEffect(() => {
    if (!game.id) return

    console.log('🔔 Setting up real-time subscription for game chat:', game.id)

    const subscription = chatService.subscribeToGameChat(game.id, (newMessage) => {
      console.log('🔔 Received new message in GameChat component:', newMessage)
      
      setChatState(prev => {
        // Check if message already exists to avoid duplicates
        const messageExists = prev.messages.some(msg => msg.id === newMessage.id)
        if (messageExists) {
          console.log('🔄 Message already exists, skipping duplicate')
          return prev
        }

        console.log('➕ Adding new message to chat state')
        return {
          ...prev,
          messages: [...prev.messages, newMessage],
          unreadCount: isVisible ? 0 : prev.unreadCount + 1
        }
      })

      // Update unread count if chat is not visible
      if (!isVisible) {
        onUnreadCountChange?.(chatState.unreadCount + 1)
      }

      // Auto-scroll if user is near bottom or if it's their own message
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100
        
        if (isNearBottom || newMessage.userId === user?.id) {
          setTimeout(() => scrollToBottom(), 100)
        }
      }
    })

    return () => {
      console.log('🔌 Cleaning up chat subscription for game:', game.id)
      subscription.unsubscribe()
    }
  }, [game.id, isVisible, onUnreadCountChange, user?.id])

  // Auto-scroll on new messages from current user
  useEffect(() => {
    if (chatState.messages.length > 0) {
      const lastMessage = chatState.messages[chatState.messages.length - 1]
      if (lastMessage.userId === user?.id) {
        scrollToBottom()
      }
    }
  }, [chatState.messages, user?.id])

  if (!isVisible) return null

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Game Chat</h3>
            <p className="text-sm text-gray-600">
              {chatState.messages.length} message{chatState.messages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{game.currentPlayers}</span>
        </div>
      </div>

      {/* Error Message */}
      {chatState.error && (
        <div className="p-4 bg-red-50 border-b border-red-200 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-700 text-sm">{chatState.error}</span>
          <button
            onClick={() => setChatState(prev => ({ ...prev, error: null }))}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {chatState.loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading messages...</span>
          </div>
        ) : chatState.messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {chatState.messages.map((message, index) => {
              const prevMessage = index > 0 ? chatState.messages[index - 1] : undefined
              const isConsecutive = isConsecutiveMessage(message, prevMessage)
              const isOwn = message.userId === user?.id
              const isDeleted = !!message.deletedAt

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                    isConsecutive ? 'mt-1' : 'mt-4'
                  }`}
                >
                  <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-[80%]`}>
                    {/* Avatar */}
                    {!isConsecutive && (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {getUserInitials(message.userName)}
                      </div>
                    )}
                    {isConsecutive && <div className="w-8" />}

                    {/* Message Bubble */}
                    <div className={`relative group ${isOwn ? 'ml-2' : 'mr-2'}`}>
                      {/* User name and time */}
                      {!isConsecutive && (
                        <div className={`flex items-center space-x-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-sm font-medium text-gray-700">{message.userName}</span>
                          <span className="text-xs text-gray-500">{formatMessageTime(message.createdAt)}</span>
                        </div>
                      )}

                      {/* Reply indicator */}
                      {message.replyTo && (
                        <div className="text-xs text-gray-500 mb-1 italic">
                          Replying to message...
                        </div>
                      )}

                      {/* Message content */}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        } ${isDeleted ? 'opacity-60 italic' : ''}`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        {message.editedAt && !isDeleted && (
                          <span className="text-xs opacity-70 mt-1 block">(edited)</span>
                        )}
                      </div>

                      {/* Message actions */}
                      {!isDeleted && (
                        <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
                            <button
                              onClick={() => setReplyTo(message)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Reply"
                            >
                              <Reply className="h-3 w-3 text-gray-500" />
                            </button>
                            {isOwn && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingMessage(message)
                                    setNewMessage(message.content)
                                    messageInputRef.current?.focus()
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Edit"
                                >
                                  <Edit3 className="h-3 w-3 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(message.id)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Reactions */}
                      {message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {message.reactions.map((reaction, idx) => (
                            <button
                              key={idx}
                              className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-1 text-xs"
                            >
                              <span>{reaction.emoji}</span>
                              <span>{reaction.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Reply className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              Replying to {replyTo.userName}: {replyTo.content.substring(0, 50)}...
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-blue-600 hover:text-blue-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Edit indicator */}
      {editingMessage && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit3 className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">Editing message</span>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null)
              setNewMessage('')
            }}
            className="text-yellow-600 hover:text-yellow-800"
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
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={sending}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {newMessage.length}/2000
            </div>
          </div>
          
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={sending}
          >
            <Smile className="h-5 w-5" />
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending || newMessage.length > 2000}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        
        {/* Character count warning */}
        {newMessage.length > 1800 && (
          <div className="mt-2 text-xs text-orange-600">
            {2000 - newMessage.length} characters remaining
          </div>
        )}
      </div>
    </div>
  )
}