import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { 
  MessageCircle, 
  ArrowLeft, 
  Users,
  Search,
  Loader2,
  User,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { friendsService } from '../lib/friendsService'
import { Conversation, PrivateMessage } from '../types/friends'
import RealtimeMessaging from '../components/messaging/RealtimeMessaging'
import { useRealtimeConnection } from '../hooks/useRealtimeConnection'

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetUserId = searchParams.get('user')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { connectionStatus, isConnected } = useRealtimeConnection()

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  useEffect(() => {
    // If there's a target user ID, find or create conversation
    if (targetUserId && conversations.length > 0) {
      const existingConversation = conversations.find(conv => 
        conv.otherParticipant.id === targetUserId
      )
      
      if (existingConversation) {
        setSelectedConversation(existingConversation)
      }
    }
  }, [targetUserId, conversations])

  // Set up real-time subscription for conversations list
  useEffect(() => {
    if (!user) return

    console.log('📡 Setting up conversations list subscription')
    
    const subscription = friendsService.subscribeToConversations(() => {
      console.log('🔔 Conversations list update received')
      loadConversations()
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const loadConversations = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await friendsService.getConversations()
      
      if (error) {
        setError(error)
        console.error('Error loading conversations:', error)
      } else {
        setConversations(data || [])
      }
    } catch (err) {
      setError('Failed to load conversations')
      console.error('Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMessageSent = (message: PrivateMessage) => {
    // Update conversations list to reflect new message
    setConversations(prev => prev.map(conv => {
      if (conv.id === message.conversationId) {
        return {
          ...conv,
          lastMessage: {
            content: message.content,
            senderId: message.senderId,
            createdAt: message.createdAt
          },
          lastMessageAt: message.createdAt
        }
      }
      return conv
    }))
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

  const getConnectionStatusText = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return 'Real-time connected'
      case 'connecting':
        return 'Connecting...'
      case 'disconnected':
        return 'Offline - messages will sync when reconnected'
      case 'error':
        return `Connection error: ${connectionStatus.error || 'Unknown error'}`
      default:
        return 'Checking connection...'
    }
  }

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
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2 mb-4">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-orange-500" />
            )}
            <span className="text-xs text-gray-600">
              {getConnectionStatusText()}
            </span>
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
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>{error}</p>
              <button
                onClick={loadConversations}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Try again
              </button>
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
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {getUserInitials(conversation.otherParticipant.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.otherParticipant.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {conversation.unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage.senderId === user.id ? 'You: ' : ''}
                          {conversation.lastMessage.content}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatMessageTime(conversation.lastMessageAt)}
                      </p>
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
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  {getUserInitials(selectedConversation.otherParticipant.name)}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConversation.otherParticipant.name}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-600">Friend</p>
                    {isConnected ? (
                      <span className="flex items-center text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center text-xs text-orange-600">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                        Syncing...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Messaging Component */}
            <RealtimeMessaging
              conversationId={selectedConversation.id}
              recipientId={selectedConversation.otherParticipant.id}
              recipientName={selectedConversation.otherParticipant.name}
              onMessageSent={handleMessageSent}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
              {!isConnected && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <WifiOff className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-700 text-sm">
                      Connection syncing - messages will appear when connected
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}