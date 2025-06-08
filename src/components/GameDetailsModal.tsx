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
  Copy
} from 'lucide-react'
import { Game } from '../types/game'
import { useAuth } from '../contexts/AuthContext'
import { gameParticipantService } from '../lib/gameParticipantService'

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

  // Load participants when modal opens
  useEffect(() => {
    if (isOpen && game && user) {
      loadParticipants()
    }
  }, [isOpen, game, user])

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

  const loadParticipants = async () => {
    if (!game || !user) return

    setLoading(true)
    setError('')

    try {
      const { data, error } = await gameParticipantService.getGameParticipants(game.id)
      
      if (error) {
        setError('Failed to load participants')
        console.error('Error loading participants:', error)
      } else {
        setParticipants(data || [])
        
        // Check user's participation status
        const userParticipant = data?.find(p => p.user_id === user.id)
        setUserParticipation(userParticipant?.status || 'none')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error loading participants:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGame = async () => {
    if (!game || !user) return

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await gameParticipantService.joinGame(game.id)
      
      if (error) {
        setError(error)
      } else if (data) {
        setSuccess(data.message)
        setUserParticipation(data.status)
        
        // Reload participants to get updated list
        await loadParticipants()
        
        // Update game object if callback provided
        if (onGameUpdate && data.status === 'joined') {
          const updatedGame = {
            ...game,
            currentPlayers: game.currentPlayers + 1
          }
          onGameUpdate(updatedGame)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error joining game:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveGame = async () => {
    if (!game || !user) return

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await gameParticipantService.leaveGame(game.id)
      
      if (error) {
        setError(error)
      } else if (data) {
        setSuccess(data.message)
        setUserParticipation('none')
        setShowLeaveConfirm(false)
        
        // Reload participants to get updated list
        await loadParticipants()
        
        // Update game object if callback provided
        if (onGameUpdate) {
          const updatedGame = {
            ...game,
            currentPlayers: Math.max(game.currentPlayers - 1, 1)
          }
          onGameUpdate(updatedGame)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error leaving game:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleShare = async () => {
    if (!game) return

    const gameUrl = `${window.location.origin}/game/${game.id}`
    const shareText = `Join me for ${game.sport} on ${formatDate(game.date)} at ${game.time} in ${game.location}`
    
    // Try Web Share API first (mobile devices)
    if (navigator.share && navigator.canShare) {
      try {
        await navigator.share({
          title: `${game.sport} Game - JustPlay`,
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
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = `${shareText}\n\n${gameUrl}`
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setSuccess('Game details copied to clipboard!')
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
        month: 'long', 
        day: 'numeric' 
      })
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
    if (!game) return false
    const gameDateTime = new Date(`${game.date}T${game.time}`)
    return gameDateTime < new Date()
  }

  const isGameFull = () => {
    if (!game) return false
    return game.currentPlayers >= game.maxPlayers
  }

  const canJoinGame = () => {
    if (!game || !user) return false
    if (isGameInPast()) return false
    if (game.status !== 'active') return false
    if (game.organizerId === user.id) return false
    if (userParticipation !== 'none') return false
    return true
  }

  const joinedParticipants = participants.filter(p => p.status === 'joined')
  const waitlistParticipants = participants.filter(p => p.status === 'waitlist')

  if (!isOpen || !game) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      {/* Overlay click to close */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
        aria-label="Close modal"
      />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative z-[10000]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl z-[10001]">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {game.title || game.sport}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="truncate">{game.location}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelColor(game.skillLevel)}`}>
                  {game.skillLevel === 'any' ? 'Any Level' : game.skillLevel.charAt(0).toUpperCase() + game.skillLevel.slice(1)}
                </span>
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
        </div>

        {/* Content */}
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
                    <p className="text-gray-600">{formatDate(game.date)} at {game.time}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Players</p>
                    <p className="text-gray-600">
                      {game.currentPlayers}/{game.maxPlayers} joined
                      {isGameFull() && <span className="text-red-600 ml-2">(Full)</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Organizer</p>
                    <p className="text-gray-600">{game.organizerName}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Target className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-gray-900">Skill Level</p>
                    <p className="text-gray-600">
                      {game.skillLevel === 'any' ? 'All levels welcome' : game.skillLevel.charAt(0).toUpperCase() + game.skillLevel.slice(1)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Status</p>
                    <p className="text-gray-600">
                      {isGameInPast() ? 'Past Game' : game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                    </p>
                  </div>
                </div>

                {game.isPrivate && (
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
            {game.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">{game.description}</p>
              </div>
            )}

            {/* Location Details */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{game.location}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {game.latitude.toFixed(4)}, {game.longitude.toFixed(4)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${game.latitude},${game.longitude}`
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
                Participants ({joinedParticipants.length}/{game.maxPlayers})
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
                              <p className="font-medium text-gray-900 truncate">{participant.name}</p>
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
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Waitlist</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {waitlistParticipants.map((participant) => (
                          <div key={participant.participant_id} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                              {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{participant.name}</p>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span>{participant.average_rating.toFixed(1)}</span>
                                <span className="text-yellow-600">• Waitlist</span>
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

        {/* Footer Actions */}
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
                      {isGameInPast() ? 'Game Ended' : 
                       game.organizerId === user.id ? 'Your Game' : 
                       game.status !== 'active' ? 'Game Inactive' : 'Cannot Join'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}