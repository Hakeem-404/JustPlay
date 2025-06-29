import React, { useState, useEffect } from 'react'
import { 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  User,
  Star,
  Share2,
  AlertCircle,
  CheckCircle,
  UserPlus,
  UserMinus,
  ExternalLink,
  Crown,
  Ban,
  MessageCircle,
  Info
} from 'lucide-react'
import { Game } from '../types/game'
import { useAuth } from '../contexts/AuthContext'
import { gameParticipantService } from '../lib/gameParticipantService'
import { gameService } from '../lib/gameService'
import { chatService } from '../lib/chatService'
import GameChat from './chat/GameChat'
import { Link } from 'react-router-dom'

interface GameDetailsModalProps {
  game: Game | null
  isOpen: boolean
  onClose: () => void
  onGameUpdate?: (updatedGame: Game) => void
}

interface Participant {
  participant_id: string
  user_id: string
  name: string
  avatar_url?: string
  status: 'joined' | 'waitlist'
  joined_at: string
  average_rating: number
}

export default function GameDetailsModal({ game, isOpen, onClose, onGameUpdate }: GameDetailsModalProps) {
  const { user } = useAuth()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [userParticipation, setUserParticipation] = useState<'none' | 'joined' | 'waitlist'>('none')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  
  // Chat state
  const [activeTab, setActiveTab] = useState<'info' | 'chat'>('info')
  const [unreadCount, setUnreadCount] = useState(0)

  // Update current game when prop changes
  useEffect(() => {
    if (game) {
      console.log('🎮 GameDetailsModal: Game prop updated:', game)
      setCurrentGame(game)
      
      // Load unread count when game changes
      if (user) {
        loadUnreadCount(game.id)
      }
    }
  }, [game, user])

  // Load participants when modal opens
  useEffect(() => {
    if (isOpen && currentGame && user) {
      console.log('🔄 GameDetailsModal: Loading initial data for game:', currentGame.id)
      loadParticipants()
      debugParticipantCount()
    }
  }, [isOpen, currentGame, user])

  // Real-time subscriptions
  useEffect(() => {
    if (!isOpen || !currentGame) return

    console.log('📡 GameDetailsModal: Setting up real-time subscriptions for game:', currentGame.id)

    // Subscribe to participant changes
    const participantSubscription = gameParticipantService.subscribeToGameParticipants(
      currentGame.id,
      (updatedParticipants) => {
        console.log('🔔 GameDetailsModal: Received participant update:', updatedParticipants.length, 'participants')
        setParticipants(updatedParticipants)
        
        // Update user participation status
        const userParticipant = updatedParticipants.find(p => p.user_id === user?.id)
        const newStatus = userParticipant?.status || 'none'
        console.log('👤 GameDetailsModal: User participation status:', newStatus)
        setUserParticipation(newStatus)

        // Update the game's current player count (total participants including organizer)
        if (currentGame) {
          const joinedCount = updatedParticipants.filter(p => p.status === 'joined').length
          console.log('📊 GameDetailsModal: Updating game player count to:', joinedCount)
          
          const updatedGame = {
            ...currentGame,
            currentPlayers: joinedCount
          }
          setCurrentGame(updatedGame)
          
          // Notify parent component
          if (onGameUpdate) {
            onGameUpdate(updatedGame)
          }
        }
      }
    )

    // Subscribe to game updates
    const gameSubscription = gameService.subscribeToGameUpdates(
      currentGame.id,
      (updatedGame) => {
        console.log('🔔 GameDetailsModal: Received game update:', updatedGame)
        setCurrentGame(updatedGame)
        
        if (onGameUpdate) {
          onGameUpdate(updatedGame)
        }
      }
    )

    return () => {
      console.log('🔌 GameDetailsModal: Cleaning up subscriptions')
      participantSubscription.unsubscribe()
      gameSubscription.unsubscribe()
    }
  }, [isOpen, currentGame, user, onGameUpdate])

  // Close modal on escape key and handle body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Clear messages when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError('')
      setSuccess('')
      setShowLeaveConfirm(false)
      setShowCancelConfirm(false)
      setActiveTab('info') // Reset to info tab
    }
  }, [isOpen])

  const loadUnreadCount = async (gameId: string) => {
    try {
      const { data } = await chatService.getUnreadCount(gameId)
      if (data !== null) {
        setUnreadCount(data)
      }
    } catch (err) {
      console.error('Error loading unread count:', err)
    }
  }

  const loadParticipants = async () => {
    if (!currentGame || !user) return

    setLoading(true)
    setError('')

    try {
      console.log('📊 GameDetailsModal: Loading participants for game:', currentGame.id)
      
      const { data, error } = await gameParticipantService.getGameParticipants(currentGame.id)
      
      if (error) {
        setError('Failed to load participants')
        console.error('❌ GameDetailsModal: Error loading participants:', error)
      } else {
        console.log('✅ GameDetailsModal: Loaded participants:', data?.length || 0)
        setParticipants(data || [])
        
        // Check user's participation status
        const userParticipant = data?.find(p => p.user_id === user.id)
        const status = userParticipant?.status || 'none'
        console.log('👤 GameDetailsModal: User participation status:', status)
        setUserParticipation(status)

        // Update current game player count (total participants including organizer)
        const joinedCount = data?.filter(p => p.status === 'joined').length || 0
        console.log('📊 GameDetailsModal: Current joined count:', joinedCount)
        
        if (currentGame.currentPlayers !== joinedCount) {
          console.log('🔄 GameDetailsModal: Updating game player count from', currentGame.currentPlayers, 'to', joinedCount)
          const updatedGame = {
            ...currentGame,
            currentPlayers: joinedCount
          }
          setCurrentGame(updatedGame)
          
          if (onGameUpdate) {
            onGameUpdate(updatedGame)
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('💥 GameDetailsModal: Error loading participants:', err)
    } finally {
      setLoading(false)
    }
  }

  const debugParticipantCount = async () => {
    if (!currentGame) return
    await gameParticipantService.debugParticipantCount(currentGame.id)
  }

  const handleJoinGame = async () => {
    if (!currentGame || !user) return

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('🎯 GameDetailsModal: User attempting to join game:', currentGame.id)
      
      const { data, error } = await gameParticipantService.joinGame(currentGame.id)
      
      if (error) {
        console.error('❌ GameDetailsModal: Join game error:', error)
        setError(error)
      } else if (data) {
        console.log('✅ GameDetailsModal: Successfully joined game:', data)
        setSuccess(data.message)
        setUserParticipation(data.status)
        
        // Reload participants to get updated count
        await loadParticipants()
        
        // Show success message for a few seconds
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('💥 GameDetailsModal: Error joining game:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveGame = async () => {
    if (!currentGame || !user) return

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('🚪 GameDetailsModal: User attempting to leave game:', currentGame.id)
      
      const { data, error } = await gameParticipantService.leaveGame(currentGame.id)
      
      if (error) {
        console.error('❌ GameDetailsModal: Leave game error:', error)
        setError(error)
      } else if (data) {
        console.log('✅ GameDetailsModal: Successfully left game:', data)
        setSuccess(data.message)
        setUserParticipation('none')
        setShowLeaveConfirm(false)
        
        // Reload participants to get updated count
        await loadParticipants()
        
        // Show success message for a few seconds
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('💥 GameDetailsModal: Error leaving game:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelGame = async () => {
    if (!currentGame || !user) return

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('🚫 GameDetailsModal: User attempting to cancel game:', currentGame.id)
      
      const { data, error } = await gameParticipantService.cancelGame(currentGame.id)
      
      if (error) {
        console.error('❌ GameDetailsModal: Cancel game error:', error)
        setError(error)
      } else if (data) {
        console.log('✅ GameDetailsModal: Successfully cancelled game:', data)
        setSuccess('Game cancelled successfully')
        setShowCancelConfirm(false)
        
        // Update game status
        const updatedGame = {
          ...currentGame,
          status: 'cancelled' as const
        }
        setCurrentGame(updatedGame)
        
        if (onGameUpdate) {
          onGameUpdate(updatedGame)
        }
        
        // Close modal after a delay
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('💥 GameDetailsModal: Error cancelling game:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleShare = async () => {
    if (!currentGame) return

    const gameUrl = `${window.location.origin}/game/${currentGame.id}`
    const shareText = `Join me for ${currentGame.sport} on ${formatDate(currentGame.date)} at ${currentGame.time} in ${currentGame.location}`
    
    // Try Web Share API first (mobile devices)
    if (navigator.share && navigator.canShare) {
      try {
        await navigator.share({
          title: `${currentGame.sport} Game - JustPlay`,
          text: shareText,
          url: gameUrl
        })
        return
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
      }
    }

    // Fallback to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n\n${gameUrl}`)
        setSuccess('Game details copied to clipboard!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = `${shareText}\n\n${gameUrl}`
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setSuccess('Game details copied to clipboard!')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError('Failed to copy game details')
    }
  }

  const formatDate = (date: string) => {
    const gameDate = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (gameDate.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (gameDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return gameDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
      const { error } = await gameService.updateGameStatus(currentGame.id, 'completed')
    }
  }

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-700'
      case 'intermediate': return 'bg-yellow-100 text-yellow-700'
      case 'advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const isGameInPast = () => {
    if (!currentGame) return false
    const gameDateTime = new Date(`${currentGame.date}T${currentGame.time}`)
    return gameDateTime < new Date()
  }

  const isGameFull = () => {
    if (!currentGame) return false
    return currentGame.currentPlayers >= currentGame.maxPlayers
  }

  const canJoinGame = () => {
    if (!currentGame || !user) return false
    if (isGameInPast()) return false
    if (currentGame.status !== 'active') return false
    if (currentGame.organizerId === user.id) return false
    if (userParticipation !== 'none') return false
    return true
  }

  const isUserOrganizer = () => {
    return currentGame && user && currentGame.organizerId === user.id
  }

  const joinedParticipants = participants.filter(p => p.status === 'joined')
  const waitlistParticipants = participants.filter(p => p.status === 'waitlist')

  // Calculate spots left (total participants vs max players)
  const spotsLeft = currentGame ? Math.max(currentGame.maxPlayers - currentGame.currentPlayers, 0) : 0

  // Use currentGame instead of game for all displays
  const displayGame = currentGame || game

  if (!isOpen || !displayGame) return null

  console.log('🎮 GameDetailsModal: Rendering with game:', displayGame.id, 'Players:', displayGame.currentPlayers, '/', displayGame.maxPlayers)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      {/* Overlay click to close */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
        aria-label="Close modal"
      />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-[10000] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl z-[10001]">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {displayGame.title || displayGame.sport}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="truncate">{displayGame.location}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelColor(displayGame.skillLevel)}`}>
                  {displayGame.skillLevel === 'any' ? 'Any Level' : displayGame.skillLevel.charAt(0).toUpperCase() + displayGame.skillLevel.slice(1)}
                </span>
                {displayGame.status === 'cancelled' && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Cancelled
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                title="Share game"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                title="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-4 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Info className="h-4 w-4" />
              <span>Game Info</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('chat')
                setUnreadCount(0) // Clear unread count when opening chat
              }}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                activeTab === 'chat'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Chat</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'info' ? (
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="p-6 space-y-6">
                {/* Error/Success Messages */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-green-700 text-sm">{success}</span>
                  </div>
                )}

                {/* Game Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Date & Time</p>
                        <p className="text-gray-600">{formatDate(displayGame.date)} at {displayGame.time}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">Players</p>
                        <p className="text-gray-600">
                          {displayGame.currentPlayers}/{displayGame.maxPlayers} joined
                          {isGameFull() && <span className="text-red-600 ml-2">(Full)</span>}
                          {spotsLeft > 0 && (
                            <span className="text-green-600 ml-2">({spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">Organizer</p>
                        <Link
                          to={`/profile/${displayGame.organizerId}`}
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {displayGame.organizerName}
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Target className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-gray-900">Skill Level</p>
                        <p className="text-gray-600">
                          {displayGame.skillLevel === 'any' ? 'All levels welcome' : displayGame.skillLevel.charAt(0).toUpperCase() + displayGame.skillLevel.slice(1)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Status</p>
                        <p className="text-gray-600">
                          {displayGame.status === 'cancelled' ? 'Cancelled' :
                           isGameInPast() ? 'Past Game' : 
                           displayGame.status.charAt(0).toUpperCase() + displayGame.status.slice(1)}
                        </p>
                      </div>
                    </div>

                    {displayGame.isPrivate && (
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-gray-900">Privacy</p>
                          <p className="text-gray-600">Private Game</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {displayGame.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{displayGame.description}</p>
                  </div>
                )}

                {/* Location Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{displayGame.location}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {displayGame.latitude.toFixed(4)}, {displayGame.longitude.toFixed(4)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const url = `https://www.google.com/maps?q=${displayGame.latitude},${displayGame.longitude}`
                          window.open(url, '_blank')
                        }}
                        className="text-blue-600 hover:text-blue-700 flex items-center space-x-1 text-sm ml-4"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Open in Maps</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Participants ({joinedParticipants.length}/{displayGame.maxPlayers})
                    {waitlistParticipants.length > 0 && (
                      <span className="text-yellow-600 ml-2">
                        + {waitlistParticipants.length} waitlist
                      </span>
                    )}
                  </h3>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading participants...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Joined Participants */}
                      {joinedParticipants.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Joined Players</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {joinedParticipants.map((participant) => (
                              <div key={participant.participant_id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                                  {participant.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <Link
                                      to={`/profile/${participant.user_id}`}
                                      className="font-medium text-gray-900 truncate hover:text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {participant.name}
                                    </Link>
                                    {participant.user_id === displayGame.organizerId && (
                                      <Crown className="h-3 w-3 text-yellow-500" title="Organizer" />
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    <span>{participant.average_rating.toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Waitlist */}
                      {waitlistParticipants.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Waitlist ({waitlistParticipants.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {waitlistParticipants.map((participant, index) => (
                              <div key={participant.participant_id} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                                  {participant.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Link
                                    to={`/profile/${participant.user_id}`}
                                    className="font-medium text-gray-900 truncate hover:text-blue-600 hover:underline block"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {participant.name}
                                  </Link>
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    <span>{participant.average_rating.toFixed(1)}</span>
                                    <span className="text-yellow-600">• #{index + 1} in line</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {joinedParticipants.length === 0 && waitlistParticipants.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No participants yet. Be the first to join!</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <GameChat 
              game={displayGame} 
              isVisible={activeTab === 'chat'} 
              onUnreadCountChange={setUnreadCount}
            />
          )}
        </div>

        {/* Footer Actions - Only show for info tab */}
        {activeTab === 'info' && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl z-[10001]">
            {showLeaveConfirm ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-900 font-medium">Are you sure you want to leave this game?</p>
                  <p className="text-sm text-gray-600 mt-1">This action cannot be undone.</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeaveGame}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <UserMinus className="h-4 w-4" />
                        <span>Leave Game</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : showCancelConfirm ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-900 font-medium">Are you sure you want to cancel this game?</p>
                  <p className="text-sm text-gray-600 mt-1">All participants will be notified. This action cannot be undone.</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Keep Game
                  </button>
                  <button
                    onClick={handleCancelGame}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Ban className="h-4 w-4" />
                        <span>Cancel Game</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                
                {user && (
                  <>
                    {/* Show "Your Game" and cancel option for organizers */}
                    {isUserOrganizer() && (
                      <>
                        <button
                          disabled
                          className="flex-1 bg-blue-100 text-blue-700 py-3 px-4 rounded-lg font-medium cursor-default flex items-center justify-center space-x-2"
                        >
                          <Crown className="h-4 w-4" />
                          <span>Your Game</span>
                        </button>
                        {displayGame.status === 'active' && !isGameInPast() && (
                          <button
                            onClick={() => setShowCancelConfirm(true)}
                            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <Ban className="h-4 w-4" />
                            <span>Cancel Game</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Show join/leave buttons for non-organizers */}
                    {!isUserOrganizer() && (
                      <>
                        {userParticipation === 'none' && canJoinGame() && (
                          <button
                            onClick={handleJoinGame}
                            disabled={actionLoading}
                            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                          >
                            {actionLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4" />
                                <span>{isGameFull() ? 'Join Waitlist' : 'Join Game'}</span>
                              </>
                            )}
                          </button>
                        )}

                        {userParticipation === 'joined' && (
                          <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <UserMinus className="h-4 w-4" />
                            <span>Leave Game</span>
                          </button>
                        )}

                        {userParticipation === 'waitlist' && (
                          <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className="flex-1 bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <UserMinus className="h-4 w-4" />
                            <span>Leave Waitlist</span>
                          </button>
                        )}

                        {!canJoinGame() && userParticipation === 'none' && (
                          <button
                            disabled
                            className="flex-1 bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-medium cursor-not-allowed"
                          >
                            {displayGame.status === 'cancelled' ? 'Game Cancelled' :
                             isGameInPast() ? 'Game Ended' : 
                             displayGame.status !== 'active' ? 'Game Inactive' : 'Cannot Join'}
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}