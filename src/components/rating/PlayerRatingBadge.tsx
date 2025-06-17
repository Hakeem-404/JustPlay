import React from 'react'
import { Star, Shield, TrendingUp } from 'lucide-react'
import { PlayerStats } from '../../lib/ratingService'

interface PlayerRatingBadgeProps {
  stats?: PlayerStats | null
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  className?: string
}

export default function PlayerRatingBadge({
  stats,
  size = 'md',
  showDetails = false,
  className = ''
}: PlayerRatingBadgeProps) {
  if (!stats || stats.totalRatings === 0) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <span className="text-xs text-gray-500">No ratings</span>
      </div>
    )
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 4.0) return 'text-blue-600'
    if (rating >= 3.5) return 'text-yellow-600'
    if (rating >= 3.0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 85) return 'text-blue-600'
    if (rate >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Rating */}
      <div className="flex items-center space-x-1">
        <Star className={`${iconSizes[size]} text-yellow-400 fill-yellow-400`} />
        <span className={`${sizeClasses[size]} font-medium ${getRatingColor(stats.averageRating)}`}>
          {stats.averageRating.toFixed(1)}
        </span>
        <span className={`${sizeClasses[size]} text-gray-500`}>
          ({stats.totalRatings})
        </span>
      </div>

      {/* Verified Badge */}
      {stats.verifiedPlayer && (
        <div className="flex items-center space-x-1">
          <Shield className={`${iconSizes[size]} text-blue-500`} />
          {showDetails && (
            <span className={`${sizeClasses[size]} text-blue-600 font-medium`}>
              Verified
            </span>
          )}
        </div>
      )}

      {/* Completion Rate */}
      {showDetails && (
        <div className="flex items-center space-x-1">
          <TrendingUp className={`${iconSizes[size]} ${getCompletionRateColor(stats.completionRate)}`} />
          <span className={`${sizeClasses[size]} ${getCompletionRateColor(stats.completionRate)}`}>
            {stats.completionRate.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}