import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  User, 
  MapPin, 
  Star, 
  Trophy, 
  Calendar,
  Target,
  Users,
  Clock,
  TrendingUp,
  Award,
  Activity,
  ArrowLeft,
  UserPlus,
  UserMinus,
  MessageCircle,
  UserCheck,
  UserX,
  Check,
  X,
  Loader2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { profileService } from '../lib/profileService'
import { friendsService } from '../lib/friendsService'
import { Profile } from '../types/profile'

const SPORT_ICONS: { [key: string]: string } = {
  'Basketball': '🏀',
  'Soccer': '⚽',
  'Tennis': '🎾',
  'Baseball': '⚾',
  'Volleyball': '🏐',
  'Football': '🏈',
  'Hockey': '🏒',
  'Golf': '⛳',
  'Swimming': '🏊',
  'Running': '🏃'
}

interface UserStats {
  gamesOrganized: number
  gamesJoined: number
  gamesCompleted: number
  gamesCancelled: number
  upcomingGames: number
  pastGames: number
  completionRate: number
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [friendshipStatus, setFriendshipStatus] = useState<{
    status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked'
    friendshipId?: string
  }>({ status: 'none' })

  useEffect(() => {
    if (userId) {
      loadUserProfile()
      if (currentUser && userId !== currentUser.id) {
        checkFriendshipStatus()
      }
    }
  }, [userId, currentUser])

  const loadUserProfile = async () => {
    if (!userId) return

    setLoading(true)
    setError('')

    try {
      console.log('👤 Loading user profile for:', userId)

      // Load user profile and stats
      const [profileData, statsData] = await Promise.all([
        profileService.getProfile(userId),
        profileService.getUserStats(userId)
      ])

      if (!profileData) {
        setError('User profile not found')
        return
      }

      setProfile(profileData)
      setUserStats(statsData)

      console.log('✅ Loaded user profile:', profileData.name)
    } catch (err) {
      console.error('💥 Error loading user profile:', err)
      setError('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  const checkFriendshipStatus = async () => {
    if (!userId || !currentUser) return

    try {
      const status = await friendsService.checkFriendshipStatus(userId)
      setFriendshipStatus(status)
      console.log('👥 Friendship status:', status)
    } catch (err) {
      console.error('💥 Error checking friendship status:', err)
    }
  }

  const handleSendFriendRequest = async () => {
    if (!userId) return

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await friendsService.sendFriendRequest(userId)

      if (error) {
        setError(error)
      } else {
        setSuccess('Friend request sent!')
        setFriendshipStatus({ status: 'pending_sent' })
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('Failed to send friend request')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRespondToFriendRequest = async (response: 'accepted' | 'declined') => {
    if (!friendshipStatus.friendshipId) return

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await friendsService.respondToFriendRequest(
        friendshipStatus.friendshipId,
        response
      )

      if (error) {
        setError(error)
      } else {
        if (response === 'accepted') {
          setSuccess('Friend request accepted!')
          setFriendshipStatus({ status: 'friends', friendshipId: friendshipStatus.friendshipId })
        } else {
          setSuccess('Friend request declined')
          setFriendshipStatus({ status: 'none' })
        }
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('Failed to respond to friend request')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!friendshipStatus.friendshipId) return

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await friendsService.removeFriend(friendshipStatus.friendshipId)

      if (error) {
        setError(error)
      } else {
        setSuccess('Friend removed')
        setFriendshipStatus({ status: 'none' })
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('Failed to remove friend')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendMessage = () => {
    if (!userId) return
    navigate(`/messages?user=${userId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            to="/dashboard"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-700'
      case 'intermediate': return 'bg-yellow-100 text-yellow-700'
      case 'advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getSkillLevelLabel = (level: string) => {
    return level.charAt(0).toUpperCase() + level.slice(1)
  }

  const getFriendshipButton = () => {
    if (!currentUser || userId === currentUser.id) return null

    switch (friendshipStatus.status) {
      case 'none':
        return (
          <button
            onClick={handleSendFriendRequest}
            disabled={actionLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            <span>Add Friend</span>
          </button>
        )

      case 'pending_sent':
        return (
          <button
            disabled
            className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg font-medium cursor-not-allowed flex items-center space-x-2"
          >
            <Clock className="h-4 w-4" />
            <span>Request Sent</span>
          </button>
        )

      case 'pending_received':
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleRespondToFriendRequest('accepted')}
              disabled={actionLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>Accept</span>
            </button>
            <button
              onClick={() => handleRespondToFriendRequest('declined')}
              disabled={actionLoading}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              <span>Decline</span>
            </button>
          </div>
        )

      case 'friends':
        return (
          <div className="flex space-x-2">
            <button
              onClick={handleSendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Message</span>
            </button>
            <button
              onClick={handleRemoveFriend}
              disabled={actionLoading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4" />
              )}
              <span>Remove</span>
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <X className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h1>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{profile.location}</span>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSkillLevelColor(profile.skill_level)}`}>
                    {getSkillLevelLabel(profile.skill_level)}
                  </span>
                  {friendshipStatus.status === 'friends' && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Friends
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {getFriendshipButton()}
                </div>
              </div>

              {profile.bio && (
                <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Preferred Sports */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600" />
                Preferred Sports
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profile.preferred_sports.map((sport) => (
                  <div
                    key={sport}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center"
                  >
                    <div className="text-2xl mb-2">{SPORT_ICONS[sport] || '🏃'}</div>
                    <div className="text-sm font-medium text-blue-700">{sport}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                Stats
              </h2>
              
              {userStats ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="text-gray-700">Games Joined</span>
                    </div>
                    <span className="font-bold text-blue-600 text-lg">{userStats.gamesJoined}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Games Organized</span>
                    </div>
                    <span className="font-bold text-green-600 text-lg">{userStats.gamesOrganized}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-purple-600" />
                      <span className="text-gray-700">Games Completed</span>
                    </div>
                    <span className="font-bold text-purple-600 text-lg">{userStats.gamesCompleted}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-yellow-600" />
                      <span className="text-gray-700">Completion Rate</span>
                    </div>
                    <span className="font-bold text-yellow-600 text-lg">
                      {userStats.completionRate}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No stats available</p>
                </div>
              )}
            </div>

            {/* Member Since */}
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-6 border border-gray-200">
              <div className="text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Member Since</h3>
                <p className="text-gray-600">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}