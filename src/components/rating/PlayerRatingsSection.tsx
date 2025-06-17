import React, { useState, useEffect } from 'react'
import { Star, MessageCircle, Calendar, Trophy, TrendingUp } from 'lucide-react'
import { ratingService, PlayerStats, PlayerRating } from '../../lib/ratingService'
import StarRating from './StarRating'

interface PlayerRatingsSectionProps {
  userId: string
  isOwnProfile?: boolean
}

export default function PlayerRatingsSection({ userId, isOwnProfile = false }: PlayerRatingsSectionProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [ratings, setRatings] = useState<PlayerRating[]>([])
  const [loading, setLoading] = useState(true)
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const [showAllRatings, setShowAllRatings] = useState(false)

  useEffect(() => {
    loadPlayerData()
  }, [userId])

  const loadPlayerData = async () => {
    setLoading(true)
    try {
      const [statsResult, ratingsResult] = await Promise.all([
        ratingService.getPlayerStats(userId),
        ratingService.getPlayerRatings(userId, 5, 0)
      ])

      if (statsResult.data) {
        setStats(statsResult.data)
      }

      if (ratingsResult.data) {
        setRatings(ratingsResult.data)
      }
    } catch (err) {
      console.error('Error loading player data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreRatings = async () => {
    if (ratingsLoading) return

    setRatingsLoading(true)
    try {
      const { data } = await ratingService.getPlayerRatings(userId, 10, ratings.length)
      if (data) {
        setRatings(prev => [...prev, ...data])
      }
    } catch (err) {
      console.error('Error loading more ratings:', err)
    } finally {
      setRatingsLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatColor = (value: number, thresholds: { good: number; excellent: number }) => {
    if (value >= thresholds.excellent) return 'text-green-600'
    if (value >= thresholds.good) return 'text-blue-600'
    return 'text-yellow-600'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats || stats.totalRatings === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Star className="h-5 w-5 mr-2 text-yellow-600" />
          Player Ratings
        </h2>
        <div className="text-center py-8 text-gray-500">
          <Star className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="mb-2">No ratings yet</p>
          <p className="text-sm">
            {isOwnProfile 
              ? 'Complete games to receive ratings from other players'
              : 'This player hasn\'t received any ratings yet'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Star className="h-5 w-5 mr-2 text-yellow-600" />
        Player Ratings & Reviews
      </h2>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          </div>
          <div className={`text-2xl font-bold ${getStatColor(stats.averageRating, { good: 3.5, excellent: 4.5 })}`}>
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Average Rating</div>
          <div className="text-xs text-gray-500">({stats.totalRatings} reviews)</div>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className={`text-2xl font-bold ${getStatColor(stats.completionRate, { good: 85, excellent: 95 })}`}>
            {stats.completionRate.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-600">Completion Rate</div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <Trophy className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {stats.gamesCompleted}
          </div>
          <div className="text-xs text-gray-600">Games Completed</div>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <MessageCircle className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {Math.round((stats.positiveFeedbackCount / stats.totalRatings) * 100)}%
          </div>
          <div className="text-xs text-gray-600">Positive Feedback</div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${stats.verifiedPlayer ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className={`text-sm font-medium ${stats.verifiedPlayer ? 'text-green-700' : 'text-gray-600'}`}>
            {stats.verifiedPlayer ? 'Verified Player' : 'Not Verified'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${stats.averageRating >= 4.0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
          <span className={`text-sm font-medium ${stats.averageRating >= 4.0 ? 'text-blue-700' : 'text-gray-600'}`}>
            {stats.averageRating >= 4.0 ? 'Highly Rated' : 'Building Reputation'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${stats.completionRate >= 90 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className={`text-sm font-medium ${stats.completionRate >= 90 ? 'text-green-700' : 'text-gray-600'}`}>
            {stats.completionRate >= 90 ? 'Reliable' : 'Building Trust'}
          </span>
        </div>
      </div>

      {/* Recent Reviews */}
      {ratings.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Recent Reviews</h3>
          <div className="space-y-4">
            {ratings.slice(0, showAllRatings ? ratings.length : 3).map((rating) => (
              <div key={rating.ratingId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <StarRating rating={rating.rating} size="sm" />
                    <span className="text-sm font-medium text-gray-900">{rating.raterName}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(rating.createdAt)}</span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  {rating.gameSport} • {formatDate(rating.gameDate)}
                </div>
                
                {rating.comment && (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    "{rating.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>

          {ratings.length > 3 && (
            <div className="mt-4 text-center">
              {!showAllRatings ? (
                <button
                  onClick={() => {
                    setShowAllRatings(true)
                    if (ratings.length <= 5) {
                      loadMoreRatings()
                    }
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Show All Reviews ({stats.totalRatings})
                </button>
              ) : (
                <button
                  onClick={() => setShowAllRatings(false)}
                  className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                >
                  Show Less
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}