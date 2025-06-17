import React, { useState, useEffect } from 'react'
import { X, Star, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ratingService, RatingSubmission } from '../../lib/ratingService'
import StarRating from './StarRating'

interface GameRatingModalProps {
  gameId: string
  gameSport: string
  gameDate: string
  isOpen: boolean
  onClose: () => void
  onRatingsSubmitted?: () => void
}

interface ParticipantRating {
  user_id: string
  name: string
  avatar_url?: string
  average_rating: number
  total_ratings: number
  already_rated: boolean
  rating: number
  comment: string
}

export default function GameRatingModal({
  gameId,
  gameSport,
  gameDate,
  isOpen,
  onClose,
  onRatingsSubmitted
}: GameRatingModalProps) {
  const { user } = useAuth()
  const [participants, setParticipants] = useState<ParticipantRating[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isOpen && gameId) {
      loadParticipants()
    }
  }, [isOpen, gameId])

  const loadParticipants = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await ratingService.getGameParticipantsForRating(gameId)

      if (error) {
        setError(error)
      } else {
        // Initialize ratings
        const participantsWithRatings = (data || []).map((participant: any) => ({
          ...participant,
          rating: participant.already_rated ? 5 : 0, // Default to 5 if already rated
          comment: ''
        }))
        setParticipants(participantsWithRatings)
      }
    } catch (err) {
      setError('Failed to load participants')
    } finally {
      setLoading(false)
    }
  }

  const handleRatingChange = (userId: string, rating: number) => {
    setParticipants(prev =>
      prev.map(p =>
        p.user_id === userId ? { ...p, rating } : p
      )
    )
  }

  const handleCommentChange = (userId: string, comment: string) => {
    setParticipants(prev =>
      prev.map(p =>
        p.user_id === userId ? { ...p, comment } : p
      )
    )
  }

  const handleSubmit = async () => {
    // Validate ratings
    const unratedParticipants = participants.filter(p => !p.already_rated && p.rating === 0)
    if (unratedParticipants.length > 0) {
      setError('Please rate all participants before submitting')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Prepare ratings data (only for participants not already rated)
      const ratingsToSubmit: RatingSubmission[] = participants
        .filter(p => !p.already_rated)
        .map(p => ({
          rated_id: p.user_id,
          rating: p.rating,
          comment: p.comment.trim() || undefined
        }))

      if (ratingsToSubmit.length === 0) {
        setError('No new ratings to submit')
        return
      }

      const { data, error } = await ratingService.submitGameRatings(gameId, ratingsToSubmit)

      if (error) {
        setError(error)
      } else {
        setSuccess('Ratings submitted successfully!')
        onRatingsSubmitted?.()
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (err) {
      setError('Failed to submit ratings')
    } finally {
      setSubmitting(false)
    }
  }

  const getUserInitials = (name: string) => {
    const names = name.split(' ')
    return names.length > 1 
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0][0].toUpperCase()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Rate Players</h2>
              <p className="text-gray-600 mt-1">
                {gameSport} • {formatDate(gameDate)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading participants...</p>
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Star className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No other participants to rate</p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-gray-700">
                Rate your fellow players based on their sportsmanship, skill, and overall contribution to the game.
              </p>

              <div className="space-y-4">
                {participants.map((participant) => (
                  <div
                    key={participant.user_id}
                    className={`border rounded-lg p-4 ${
                      participant.already_rated ? 'bg-gray-50 border-gray-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {getUserInitials(participant.name)}
                      </div>

                      <div className="flex-1">
                        {/* Player Info */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{participant.name}</h3>
                            {participant.total_ratings > 0 && (
                              <div className="flex items-center space-x-1 mt-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-sm text-gray-600">
                                  {participant.average_rating.toFixed(1)} ({participant.total_ratings} ratings)
                                </span>
                              </div>
                            )}
                          </div>
                          {participant.already_rated && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              Already Rated
                            </span>
                          )}
                        </div>

                        {/* Rating */}
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Rating
                          </label>
                          <StarRating
                            rating={participant.rating}
                            interactive={!participant.already_rated}
                            onRatingChange={(rating) => handleRatingChange(participant.user_id, rating)}
                            size="lg"
                            showValue
                          />
                        </div>

                        {/* Comment */}
                        {!participant.already_rated && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Comment (Optional)
                            </label>
                            <textarea
                              value={participant.comment}
                              onChange={(e) => handleCommentChange(participant.user_id, e.target.value)}
                              placeholder="Share your thoughts about playing with this person..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              rows={2}
                              maxLength={500}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              {participant.comment.length}/500 characters
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && participants.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || participants.filter(p => !p.already_rated).length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Submit Ratings</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}