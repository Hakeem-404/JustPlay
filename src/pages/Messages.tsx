import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { 
  MessageCircle, 
  Send, 
  ArrowLeft, 
  Users,
  Search,
  Loader2,
  User,
  Clock,
  CheckCircle,
  Circle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { friendsService } from '../lib/friendsService'
import { Conversation, PrivateMessage } from '../types/friends'

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetUserId = searchParams.get('user')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  // Real-time subscription refs
  const conversationSubscriptionRef = useRef<any>(null)
  const messageSubscriptionRef = useRef<any>(null)

  useEffect(() => {
    if (user) {
      loadConversations()
      setupConversationSubscription()
    }

    return () => {
      // Cleanup subscriptions
      if (conversationSubscriptionRef.current) {
        conversationSubscriptionRef.current.unsubscribe()
      }
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe()
      }
    }
  }, [user])

  useEffect(() => {
    // If there's a target user ID, find or create conversation
    if (targetUserId && conversations.length > 0) {
      const existingConversation = conversations.find(conv => 
        conv.otherParticipant.id === targetUserId
      )
      
      if (existingConversation) {
        selectConversation(existingConversation)
      }
    }
  }, [targetUserId, conversations])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const setupConversationSubscription = () => {
    if (!user) return

    console.log('📡 Setting up conversations real-time subscription')
    
    conversationSubscriptionRef.current = friendsService.subscribeToConversations(() => {
      console.log('🔔 Conversations updated - reloading')
      loadConversations()
    })
  }

  const setupMessageSubscription = (conversationId: string) => {
    if (!conversationId) return

    // Clean up existing subscription
    if (messageSubscriptionRef.current) {
      messageSubscriptionRef.current.unsubscribe()
    }

    console.log('📡 Setting up messages real-time subscription for:', conversationId)
    
    messageSubscriptionRef.current = friendsService.subscribeToPrivateMessages(
      conversationId,
      (newMessage: PrivateMessage) => {
        console.log('🔔 New message received:', newMessage)
        
        // Add message to state if it's not from current user (to avoid duplicates)
        if (newMessage.senderId !== user?.id) {
          setMessages(prev => {
            // Check if message already exists
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) return prev
            
            return [...prev, newMessage]
          })

          // Mark as read if conversation is currently selected
          if (selectedConversation?.id === newMessage.conversationId) {
            setTimeout(() => {
              friendsService.markMessagesAsRead(newMessage.conversationId)
            }, 1000)
          }
        }

        // Update conversations list to reflect new message
        loadConversations()
      }
    )
  }

  const loadConversations = async () => {
    setLoading(true)
    try {
      const { data, error } = await friendsService.getConversations()
      
      if (error) {
        console.error('Error loading conversations:', error)
      } else {
        setConversations(data || [])
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setMessages([])
    await loadMessages(conversation.id)
    setupMessageSubscription(conversation.id)
    
    // Mark messages as read
    await friendsService.markMessagesAsRead(conversation.id)
    
    // Focus message input
    setTimeout(() => {
      messageInputRef.current?.focus()
    }, 100)
  }

  const loadMessages = async (conversationId: string) => {
    setMessagesLoading(true)
    try {
      const { data, error } = await friendsService.getConversationMessages(conversationId)
      
      if (error) {
        console.error('Error loading messages:', error)
      } else {
        setMessages(data || [])
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return

    setSending(true)
    const messageContent = newMessage.trim()
    
    // Optimistic UI update
    const optimisticMessage: PrivateMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      senderId: user!.id,
      recipientId: selectedConversation.otherParticipant.id,
      senderName: user!.email?.split('@')[0] || 'You',
      senderAvatarUrl: null,
      content: messageContent,
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')

    try {
      const { data, error } = await friendsService.sendPrivateMessage(
        selectedConversation.otherParticipant.id,
        messageContent
      )

      if (error) {
        console.error('Error sending message:', error)
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
        setNewMessage(messageContent) // Restore message content
      } else if (data) {
        // Replace optimistic message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id ? data : msg
          )
        )
        
        // Update conversation list
        loadConversations()
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setNewMessage(messageContent)
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

  const filteredConversations = conversations.filter(conv =>
    conv.otherParticipant.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Please sign in</h3>
          <p className="text-gray-600">You need to be signed in to view messages</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Conversations Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No conversations yet</p>
              <p className="text-sm">Start by adding friends!</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  className={`w-full p-3 rounded-lg text-left transition-colors relative ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {getUserInitials(conversation.otherParticipant.name)}
                      </div>
                      {/* Online status indicator (placeholder) */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.otherParticipant.name}
                        </h3>
                        <div className="flex items-center space-x-1">
                          {conversation.unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(conversation.lastMessageAt)}
                          </span>
                        </div>
                      </div>
                      {conversation.lastMessage && (
                        <div className="flex items-center space-x-1 mt-1">
                          {conversation.lastMessage.senderId === user.id && (
                            <CheckCircle className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          )}
                          <p className={`text-sm truncate ${
                            conversation.unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-600'
                          }`}>
                            {conversation.lastMessage.senderId === user.id ? 'You: ' : ''}
                            {conversation.lastMessage.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    {getUserInitials(selectedConversation.otherParticipant.name)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConversation.otherParticipant.name}
                  </h2>
                  <p className="text-sm text-green-600">Online</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const isOwn = message.senderId === user.id
                    const prevMessage = index > 0 ? messages[index - 1] : null
                    const isConsecutive = prevMessage && 
                      prevMessage.senderId === message.senderId &&
                      (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) < 5 * 60 * 1000
                    const isOptimistic = message.id.startsWith('temp-')

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                          isConsecutive ? 'mt-1' : 'mt-4'
                        }`}
                      >
                        <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-[70%]`}>
                          {!isConsecutive && (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {getUserInitials(message.senderName)}
                            </div>
                          )}
                          {isConsecutive && <div className="w-8" />}

                          <div className={`relative ${isOwn ? 'ml-2' : 'mr-2'}`}>
                            {!isConsecutive && (
                              <div className={`flex items-center space-x-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <span className="text-sm font-medium text-gray-700">{message.senderName}</span>
                                <span className="text-xs text-gray-500">{formatMessageTime(message.createdAt)}</span>
                                {isOptimistic && (
                                  <span className="text-xs text-gray-400">Sending...</span>
                                )}
                              </div>
                            )}

                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isOwn
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              } ${isOptimistic ? 'opacity-70' : ''}`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            </div>

                            {/* Read status */}
                            {isOwn && !isOptimistic && (
                              <div className="flex justify-end mt-1">
                                {message.readAt ? (
                                  <CheckCircle className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <Circle className="h-3 w-3 text-gray-400" />
                                )}
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

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
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
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}