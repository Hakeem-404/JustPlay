import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Users, 
  UserPlus, 
  MessageCircle, 
  UserMinus,
  Check,
  X,
  Search,
  Loader2,
  ArrowLeft,
  Clock,
  UserCheck
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { friendsService } from '../lib/friendsService'
import { Friend, FriendRequest } from '../types/friends'

export default function Friends() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')

  useEffect(() => {
    if (user) {
      loadFriendsData()
    }
  }, [user])

  const loadFriendsData = async () => {
    setLoading(true)
    try {
      const [friendsData, requestsData] = await Promise.all([
        friendsService.getFriendsList(),
        friendsService.getFriendRequests()
      ])

      if (friendsData.data) {
        setFriends(friendsData.data)
      }

      if (requestsData.data) {
        setFriendRequests(requestsData.data)
      }
    } catch (err) {
      console.error('Error loading friends data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRespondToRequest = async (requestId: string, response: 'accepted' | 'declined') => {
    setActionLoading(requestId)
    try {
      const { error } = await friendsService.respondToFriendRequest(requestId, response)
      
      if (!error) {
        // Reload data to reflect changes
        loadFriendsData()
      }
    } catch (err) {
      console.error('Error responding to friend request:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveFriend = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      const { error } = await friendsService.removeFriend(friendshipId)
      
      if (!error) {
        // Reload data to reflect changes
        loadFriendsData()
      }
    } catch (err) {
      console.error('Error removing friend:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const getUserInitials = (name: string) => {
    const names = name.split(' ')
    return names.length > 1 
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0][0].toUpperCase()
  }

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Please sign in</h3>
          <p className="text-gray-600">You need to be signed in to view friends</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Friends</h1>
            <p className="text-gray-600">
              {friends.length} friend{friends.length !== 1 ? 's' : ''}
              {friendRequests.length > 0 && (
                <span className="ml-2">• {friendRequests.length} pending request{friendRequests.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'friends'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Friends ({friends.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
            activeTab === 'requests'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          <span>Requests ({friendRequests.length})</span>
          {friendRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {friendRequests.length > 9 ? '9+' : friendRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'friends' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Friends List */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading friends...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="mb-4">
                {searchQuery ? 'No friends found matching your search' : 'No friends yet'}
              </p>
              {!searchQuery && (
                <p className="text-sm">
                  Start by finding people in games and sending friend requests!
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      {getUserInitials(friend.name)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{friend.name}</h3>
                      <p className="text-sm text-gray-600">{friend.location}</p>
                      <p className="text-xs text-gray-500">
                        Friends since {new Date(friend.friendshipCreatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/profile/${friend.id}`}
                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                      View Profile
                    </Link>
                    <Link
                      to={`/messages?user=${friend.id}`}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Message</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Friend Requests</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading requests...</p>
            </div>
          ) : friendRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No pending friend requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      {getUserInitials(request.requesterName)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{request.requesterName}</h3>
                      <p className="text-sm text-gray-600">{request.requesterLocation}</p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/profile/${request.requesterId}`}
                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={() => handleRespondToRequest(request.id, 'declined')}
                      disabled={actionLoading === request.id}
                      className="bg-gray-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50"
                    >
                      {actionLoading === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={() => handleRespondToRequest(request.id, 'accepted')}
                      disabled={actionLoading === request.id}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50"
                    >
                      {actionLoading === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <span>Accept</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}