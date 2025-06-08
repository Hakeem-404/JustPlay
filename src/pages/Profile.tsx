import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  User, 
  MapPin, 
  Star, 
  Trophy, 
  Calendar,
  Edit3,
  Target,
  Users,
  Clock
} from 'lucide-react'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'

// Placeholder data for games history
const RECENT_GAMES = [
  {
    id: 1,
    sport: 'Basketball',
    location: 'Central Park Courts',
    date: '2025-01-15',
    type: 'joined',
    result: 'completed'
  },
  {
    id: 2,
    sport: 'Soccer',
    location: 'Riverside Field',
    date: '2025-01-12',
    type: 'organized',
    result: 'completed'
  },
  {
    id: 3,
    sport: 'Tennis',
    location: 'Oak Hill Tennis Club',
    date: '2025-01-10',
    type: 'joined',
    result: 'completed'
  }
]

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

export default function Profile() {
  const { profile } = useProfile()
  const { user } = useAuth()

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h1>
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{profile.location}</span>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSkillLevelColor(profile.skill_level)}`}>
                  {getSkillLevelLabel(profile.skill_level)}
                </span>
              </div>
              <Link
                to="/profile/edit"
                className="mt-4 sm:mt-0 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Profile</span>
              </Link>
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

          {/* Recent Games */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-green-600" />
              Recent Games
            </h2>
            <div className="space-y-4">
              {RECENT_GAMES.map((game) => (
                <div
                  key={game.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl">{SPORT_ICONS[game.sport] || '🏃'}</div>
                      <div>
                        <h3 className="font-medium text-gray-900">{game.sport}</h3>
                        <p className="text-sm text-gray-600 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {game.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{new Date(game.date).toLocaleDateString()}</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        game.type === 'organized' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {game.type === 'organized' ? 'Organized' : 'Joined'}
                      </span>
                    </div>
                  </div>
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
              Your Stats
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">Games Played</span>
                </div>
                <span className="font-bold text-blue-600 text-lg">{profile.games_played}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">Games Organized</span>
                </div>
                <span className="font-bold text-green-600 text-lg">{profile.games_organized}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <span className="text-gray-700">Average Rating</span>
                </div>
                <span className="font-bold text-yellow-600 text-lg">
                  {profile.average_rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/create-game"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Create New Game</span>
              </Link>
              
              <Link
                to="/dashboard"
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Find Games</span>
              </Link>
            </div>
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
  )
}