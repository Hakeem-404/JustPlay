import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  User, 
  MapPin, 
  Star, 
  Trophy, 
  Calendar,
  Edit3,
  Target,
  Users,
  Clock,
  TrendingUp,
  Award,
  Activity,
  ExternalLink,
  Eye
} from 'lucide-react'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { profileService } from '../lib/profileService'
import GameDetailsModal from '../components/GameDetailsModal'
import { gameService } from '../lib/gameService'
import { Game } from '../types/game'

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

interface GameHistory {
  id: string
  sport: string
  title?: string
  location: string
  date: string
  time: string
  type: 'organized' | 'joined'
  result: 'completed' | 'cancelled' | 'upcoming'
  players?: string
  organizerName?: string
  participationStatus?: string
}

export default function Profile() {
  const { profile } = useProfile()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  
  // Game details modal state
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [gameLoading, setGameLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    if (!user) return

    setLoading(true)
    setStatsLoading(true)

    try {
      console.log('📊 Loading user profile data for:', user.id)

      // Load user stats and game history in parallel
      const [stats, history] = await Promise.all([
        profileService.getUserStats(user.id),
        profileService.getUserGameHistory(user.id)
      ])

      setUserStats(stats)
      setGameHistory(history)

      console.log('✅ Loaded user data:', { stats, historyCount: history.length })
    } catch (err) {
      console.error('💥 Error loading user data:', err)
    } finally {
      setLoading(false)
      setStatsLoading(false)
    }
  }

  const handleGameClick = async (gameHistoryItem: GameHistory) => {
    setGameLoading(gameHistoryItem.id)
    
    try {
      // Fetch full game details
      const { data: gameData, error } = await gameService.getGameById(gameHistoryItem.id)
      
      if (error || !gameData) {
        console.error('Error loading game details:', error)
        // Fallback: navigate to dashboard if game details can't be loaded
        navigate('/dashboard')
        return
      }

      setSelectedGame(gameData)
      setIsModalOpen(true)
    } catch (err) {
      console.error('Error loading game details:', err)
      navigate('/dashboard')
    } finally {
      setGameLoading(null)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedGame(null)
  }

  const handleGameUpdate = (updatedGame: Game) => {
    setSelectedGame(updatedGame)
    // Optionally refresh the game history to reflect changes
    loadUserData()
  }

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

  const formatDate = (date: string) => {
    try {
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
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        })
      }
    } catch (error) {
      return 'Invalid Date'
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      case 'upcoming': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'organized': return 'bg-purple-100 text-purple-700'
      case 'joined': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header - Fixed overflow issues */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8 overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Profile Info - Fixed text overflow */}
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-4 sm:space-y-0">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 truncate">
                    {profile.name}
                  </h1>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="text-sm sm:text-base truncate">{profile.location}</span>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSkillLevelColor(profile.skill_level)}`}>
                    {getSkillLevelLabel(profile.skill_level)}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  <Link
                    to="/profile/edit"
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </Link>
                </div>
              </div>

              {profile.bio && (
                <div className="w-full">
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base break-words">
                    {profile.bio}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid - Improved responsive layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Fixed overflow issues */}
          <div className="xl:col-span-2 space-y-6 lg:space-y-8 min-w-0">
            {/* Preferred Sports - Fixed grid overflow */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-hidden">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600 flex-shrink-0" />
                <span className="truncate">Preferred Sports</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {profile.preferred_sports.map((sport) => (
                  <div
                    key={sport}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-center min-w-0"
                  >
                    <div className="text-xl sm:text-2xl mb-2">{SPORT_ICONS[sport] || '🏃'}</div>
                    <div className="text-xs sm:text-sm font-medium text-blue-700 truncate">
                      {sport}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Games - Fixed overflow and improved responsive design */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-hidden">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
                <span className="truncate">Recent Games</span>
              </h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Loading game history...</p>
                </div>
              ) : gameHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="mb-4">No games yet. Start by joining or creating a game!</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      to="/dashboard"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center"
                    >
                      Find Games
                    </Link>
                    <Link
                      to="/create-game"
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors text-center"
                    >
                      Create Game
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {gameHistory.map((game) => (
                    <div
                      key={`${game.id}-${game.type}`}
                      className="group relative border border-gray-200 rounded-xl p-4 cursor-pointer transition-all duration-300 ease-in-out hover:shadow-md focus-within:shadow-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50 overflow-hidden"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0)',
                        transition: 'background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)'
                      }}
                      onClick={() => handleGameClick(game)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View details for ${game.title || game.sport} game on ${formatDate(game.date)}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleGameClick(game)
                        }
                      }}
                    >
                      {/* Main Game Content - Fixed layout and overflow */}
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0 min-w-0">
                        <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
                          {/* Sport Icon */}
                          <div className="flex-shrink-0 text-xl sm:text-2xl" aria-hidden="true">
                            {SPORT_ICONS[game.sport] || '🏃'}
                          </div>
                          
                          {/* Game Details - Fixed text overflow */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-1 truncate">
                              {game.title || game.sport}
                            </h3>
                            
                            <div className="flex items-center text-gray-600 mb-2">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" aria-hidden="true" />
                              <span className="text-xs sm:text-sm truncate">{game.location}</span>
                            </div>
                            
                            <div className="flex items-center text-gray-600 mb-2">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" aria-hidden="true" />
                              <span className="text-xs sm:text-sm">
                                {formatDate(game.date)} at {game.time}
                              </span>
                            </div>
                            
                            {game.organizerName && game.type === 'joined' && (
                              <div className="flex items-center text-gray-500">
                                <User className="h-3 w-3 mr-1 flex-shrink-0" aria-hidden="true" />
                                <span className="text-xs truncate">
                                  Organized by {game.organizerName}
                                </span>
                              </div>
                            )}
                            
                            {game.players && (
                              <div className="flex items-center text-gray-500 mt-1">
                                <Users className="h-3 w-3 mr-1 flex-shrink-0" aria-hidden="true" />
                                <span className="text-xs">{game.players} players</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Status Badges and Actions - Fixed responsive layout */}
                        <div className="flex flex-col sm:items-end space-y-2 flex-shrink-0">
                          <div className="flex flex-wrap gap-2">
                            <span 
                              className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(game.type)}`}
                              aria-label={`Game type: ${game.type}`}
                            >
                              {game.type === 'organized' ? 'Organized' : 'Joined'}
                            </span>
                            <span 
                              className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium ${getResultColor(game.result)}`}
                              aria-label={`Game status: ${game.result}`}
                            >
                              {game.result.charAt(0).toUpperCase() + game.result.slice(1)}
                            </span>
                          </div>
                          
                          {/* View Details Button - Shows on Hover */}
                          <button
                            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2 w-full sm:w-auto justify-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGameClick(game)
                            }}
                            disabled={gameLoading === game.id}
                            aria-label={`View details for ${game.title || game.sport}`}
                          >
                            {gameLoading === game.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                                <span>Loading...</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                                <span>View Details</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Accessibility: Screen reader only content */}
                      <span className="sr-only">
                        {game.title || game.sport} game at {game.location} on {formatDate(game.date)} at {game.time}. 
                        Status: {game.result}. Type: {game.type}. 
                        {game.players && `Players: ${game.players}.`}
                        {game.organizerName && game.type === 'joined' && ` Organized by ${game.organizerName}.`}
                        Press Enter or Space to view details.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stats - Fixed overflow and improved responsive design */}
          <div className="space-y-6 min-w-0">
            {/* Stats Card - Fixed overflow */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-hidden">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0" />
                <span className="truncate">Your Stats</span>
              </h2>
              
              {statsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Loading stats...</p>
                </div>
              ) : userStats ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg min-w-0">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-gray-700 text-sm sm:text-base truncate">Games Joined</span>
                    </div>
                    <span className="font-bold text-blue-600 text-lg flex-shrink-0">{userStats.gamesJoined}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg min-w-0">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700 text-sm sm:text-base truncate">Games Organized</span>
                    </div>
                    <span className="font-bold text-green-600 text-lg flex-shrink-0">{userStats.gamesOrganized}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg min-w-0">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Award className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                      <span className="text-gray-700 text-sm sm:text-base truncate">Games Completed</span>
                    </div>
                    <span className="font-bold text-purple-600 text-lg flex-shrink-0">{userStats.gamesCompleted}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg min-w-0">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0" />
                      <span className="text-gray-700 text-sm sm:text-base truncate">Completion Rate</span>
                    </div>
                    <span className="font-bold text-yellow-600 text-lg flex-shrink-0">
                      {userStats.completionRate}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg min-w-0">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600 flex-shrink-0" />
                      <span className="text-gray-700 text-sm sm:text-base truncate">Upcoming Games</span>
                    </div>
                    <span className="font-bold text-cyan-600 text-lg flex-shrink-0">{userStats.upcomingGames}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>Unable to load stats</p>
                </div>
              )}
            </div>

            {/* Quick Actions - Fixed responsive design */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-hidden">
              <h2 className="text-xl font-bold text-gray-900 mb-4 truncate">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/create-game"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>Create New Game</span>
                </Link>
                
                <Link
                  to="/dashboard"
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                >
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span>Find Games</span>
                </Link>
              </div>
            </div>

            {/* Member Since - Fixed responsive design */}
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-6 border border-gray-200 overflow-hidden">
              <div className="text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Member Since</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Game Details Modal */}
        <GameDetailsModal
          game={selectedGame}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onGameUpdate={handleGameUpdate}
        />
      </div>
    </div>
  )
}