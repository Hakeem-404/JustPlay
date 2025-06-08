import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, List, Map as MapIcon, AlertCircle, RefreshCw, Users, Calendar, MapPin, Clock, User, Star, Crown } from 'lucide-react'
import GameMap from '../components/map/GameMap'
import GameDetailsModal from '../components/GameDetailsModal'
import { gameService } from '../lib/gameService'
import { gameParticipantService } from '../lib/gameParticipantService'
import { Game, MapFilters } from '../types/game'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [games, setGames] = useState<Game[]>([])
  const [userParticipations, setUserParticipations] = useState<{ [gameId: string]: 'joined' | 'waitlist' }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { latitude, longitude } = useGeolocation()

  const [filters, setFilters] = useState<MapFilters>({
    sports: [],
    distance: 100, // Increased default from 10km to 100km
    dateRange: 'all',
    skillLevel: 'all'
  })

  // Helper function to calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const loadGames = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('🔍 DEBUG: ===== STARTING GAME LOAD =====')
      console.log('🔍 DEBUG: Current filters:', filters)
      console.log('🔍 DEBUG: User location:', { latitude, longitude })

      // Build filter object for API
      const apiFilters: any = {}
      
      // CRITICAL FIX: Only apply distance filter if user location is available AND distance is not "no limit"
      const isNoLimit = filters.distance >= 999999
      console.log('🔍 DEBUG: Distance filter check:', {
        distance: filters.distance,
        isNoLimit,
        hasLocation: !!(latitude && longitude)
      })

      if (latitude && longitude && !isNoLimit) {
        apiFilters.latitude = latitude
        apiFilters.longitude = longitude
        apiFilters.maxDistance = filters.distance
        console.log('🔍 DEBUG: Distance filtering ENABLED:', apiFilters)
      } else {
        console.log('🔍 DEBUG: Distance filtering DISABLED:', {
          reason: isNoLimit ? 'No limit selected' : 'No user location'
        })
      }

      // Date filtering
      const today = new Date()
      const todayString = today.toISOString().split('T')[0]
      console.log('🔍 DEBUG: Today date:', todayString)
      
      switch (filters.dateRange) {
        case 'today':
          apiFilters.dateFrom = todayString
          apiFilters.dateTo = todayString
          console.log('🔍 DEBUG: Today filter applied:', apiFilters.dateFrom)
          break
        case 'tomorrow':
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          const tomorrowString = tomorrow.toISOString().split('T')[0]
          apiFilters.dateFrom = tomorrowString
          apiFilters.dateTo = tomorrowString
          console.log('🔍 DEBUG: Tomorrow filter applied:', apiFilters.dateFrom)
          break
        case 'week':
          const weekFromNow = new Date(today)
          weekFromNow.setDate(weekFromNow.getDate() + 7)
          const weekString = weekFromNow.toISOString().split('T')[0]
          apiFilters.dateFrom = todayString
          apiFilters.dateTo = weekString
          console.log('🔍 DEBUG: Week filter applied:', apiFilters.dateFrom, 'to', apiFilters.dateTo)
          break
        default:
          console.log('🔍 DEBUG: No date filter applied (showing all future games)')
      }

      if (filters.skillLevel !== 'all') {
        apiFilters.skillLevel = filters.skillLevel
        console.log('🔍 DEBUG: Skill level filter applied:', apiFilters.skillLevel)
      }

      console.log('🔍 DEBUG: Final API filters being sent:', apiFilters)

      const { data, error } = await gameService.getGames(apiFilters)

      if (error) {
        setError('Failed to load games. Please try again.')
        console.error('❌ Error loading games:', error)
        return
      }

      console.log('🔍 DEBUG: ===== RAW GAMES FROM DATABASE =====')
      console.log('🔍 DEBUG: Total games received:', data?.length || 0)
      
      if (data && data.length > 0) {
        data.forEach((game, index) => {
          const distance = latitude && longitude ? 
            calculateDistance(latitude, longitude, game.latitude, game.longitude) : null
          
          console.log(`🔍 DEBUG: Game ${index + 1}:`, {
            id: game.id,
            sport: game.sport,
            title: game.title,
            location: game.location,
            date: game.date,
            time: game.time,
            coordinates: { lat: game.latitude, lng: game.longitude },
            players: `${game.currentPlayers}/${game.maxPlayers}`,
            skillLevel: game.skillLevel,
            status: game.status,
            isPrivate: game.isPrivate,
            organizerId: game.organizerId,
            distance: distance ? `${distance.toFixed(1)}km` : 'N/A'
          })
        })
      } else {
        console.log('🔍 DEBUG: No games received from database')
      }

      // Apply frontend filters for sports (since backend doesn't support array filtering yet)
      let filteredGames = data || []
      
      console.log('🔍 DEBUG: ===== APPLYING FRONTEND FILTERS =====')
      console.log('🔍 DEBUG: Before any filtering:', filteredGames.length, 'games')
      
      // Sports filter
      if (filters.sports.length > 0) {
        console.log('🔍 DEBUG: Applying sports filter:', filters.sports)
        const beforeSportsFilter = filteredGames.length
        filteredGames = filteredGames.filter(game => {
          const included = filters.sports.includes(game.sport)
          console.log(`🔍 DEBUG: Game "${game.sport}" ${included ? 'INCLUDED' : 'EXCLUDED'} by sports filter`)
          return included
        })
        console.log('🔍 DEBUG: After sports filtering:', filteredGames.length, 'games (removed', beforeSportsFilter - filteredGames.length, ')')
      } else {
        console.log('🔍 DEBUG: No sports filter applied')
      }

      console.log('🔍 DEBUG: ===== FINAL RESULTS =====')
      console.log('🔍 DEBUG: Games being set in state:', filteredGames.length)
      console.log('🔍 DEBUG: Game IDs:', filteredGames.map(g => g.id))

      setGames(filteredGames)

      // Load user participations for each game
      if (user && filteredGames.length > 0) {
        console.log('🔍 DEBUG: Loading user participations for', filteredGames.length, 'games')
        loadUserParticipations(filteredGames)
      }

    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('💥 Error loading games:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUserParticipations = async (gamesList: Game[]) => {
    if (!user) return

    console.log('🔍 DEBUG: Loading user participations for', gamesList.length, 'games')

    const participations: { [gameId: string]: 'joined' | 'waitlist' } = {}

    await Promise.all(
      gamesList.map(async (game) => {
        try {
          const { data } = await gameParticipantService.getUserParticipation(game.id, user.id)
          if (data && data.status) {
            participations[game.id] = data.status
            console.log(`🔍 DEBUG: User participation in game ${game.id}:`, data.status)
          } else {
            console.log(`🔍 DEBUG: User not participating in game ${game.id}`)
          }
        } catch (error) {
          // Silently handle errors for individual games
          console.warn(`⚠️ Failed to load participation for game ${game.id}:`, error)
        }
      })
    )

    console.log('🔍 DEBUG: Final user participations:', participations)
    setUserParticipations(participations)
  }

  useEffect(() => {
    console.log('🔍 DEBUG: useEffect triggered - loading games')
    console.log('🔍 DEBUG: Current filters:', filters)
    console.log('🔍 DEBUG: User location:', { latitude, longitude })
    loadGames()
  }, [filters, latitude, longitude])

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return

    console.log('🔍 DEBUG: Setting up real-time subscriptions')

    // Subscribe to games updates
    const gamesSubscription = gameService.subscribeToGamesUpdates(() => {
      console.log('🔍 DEBUG: Real-time game update received - reloading games')
      loadGames()
    })

    return () => {
      console.log('🔍 DEBUG: Cleaning up real-time subscriptions')
      gamesSubscription.unsubscribe()
    }
  }, [user, filters, latitude, longitude])

  const handleGameClick = (game: Game) => {
    console.log('🔍 DEBUG: Game clicked:', game.id, game.sport)
    setSelectedGame(game)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    console.log('🔍 DEBUG: Modal closed')
    setIsModalOpen(false)
    setSelectedGame(null)
  }

  const handleGameUpdate = (updatedGame: Game) => {
    console.log('🔍 DEBUG: Game updated:', updatedGame.id, 'Players:', updatedGame.currentPlayers)
    setGames(prevGames => 
      prevGames.map(game => 
        game.id === updatedGame.id ? updatedGame : game
      )
    )
    setSelectedGame(updatedGame)
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
        weekday: 'short', 
        month: 'short', 
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

  const getParticipationStatus = (gameId: string) => {
    return userParticipations[gameId] || 'none'
  }

  const getParticipationBadge = (gameId: string) => {
    const status = getParticipationStatus(gameId)
    
    switch (status) {
      case 'joined':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Users className="h-3 w-3 mr-1" />
            Joined
          </span>
        )
      case 'waitlist':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Waitlist
          </span>
        )
      default:
        return null
    }
  }

  const isUserOrganizer = (game: Game) => {
    return user && game.organizerId === user.id
  }

  const getGameDistance = (game: Game) => {
    if (!latitude || !longitude) return null
    const distance = calculateDistance(latitude, longitude, game.latitude, game.longitude)
    return distance
  }

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`
    } else if (distance < 10) {
      return `${distance.toFixed(1)}km away`
    } else {
      return `${Math.round(distance)}km away`
    }
  }

  const getDistanceStatusText = () => {
    if (filters.distance >= 999999) {
      return 'Showing all games worldwide'
    } else if (latitude && longitude) {
      return `Within ${filters.distance === 100 ? '100km' : `${filters.distance}km`}`
    } else {
      return 'Location access needed for distance filtering'
    }
  }

  if (loading && games.length === 0) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Find Games</h1>
              <p className="text-gray-600">Discover pickup games happening near you</p>
            </div>
            <Link
              to="/create-game"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Game</span>
            </Link>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading games...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Find Games</h1>
              <p className="text-gray-600">Discover pickup games happening near you</p>
            </div>
            <Link
              to="/create-game"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Game</span>
            </Link>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Games</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadGames}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  console.log('🔍 DEBUG: Rendering Dashboard with', games.length, 'games')

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Find Games</h1>
            <p className="text-gray-600">
              {games.length} game{games.length !== 1 ? 's' : ''} found
              {loading && <span className="ml-2 text-blue-600">• Loading...</span>}
              <span className="ml-2 text-gray-500">
                • {getDistanceStatusText()}
              </span>
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapIcon className="h-4 w-4" />
                <span>Map</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-4 w-4" />
                <span>List</span>
              </button>
            </div>

            {/* Create Game Button */}
            <Link
              to="/create-game"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Game</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {viewMode === 'map' ? (
          <GameMap
            games={games}
            onGameClick={handleGameClick}
            className="h-full"
          />
        ) : (
          <div className="h-full overflow-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              {games.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="h-16 w-16 mx-auto\" fill="none\" viewBox="0 0 24 24\" stroke="currentColor">
                      <path strokeLinecap="round\" strokeLinejoin="round\" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No games found</h3>
                  <p className="text-gray-600 mb-6">
                    No games match your current filters. Try adjusting your search criteria or create a new game.
                  </p>
                  <Link
                    to="/create-game"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create First Game</span>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {games.map((game) => {
                    const spotsLeft = game.maxPlayers - game.currentPlayers
                    const participationStatus = getParticipationStatus(game.id)
                    const isOrganizer = isUserOrganizer(game)
                    const distance = getGameDistance(game)
                    
                    return (
                      <div
                        key={game.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleGameClick(game)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">
                                {game.title || game.sport}
                              </h3>
                              {getParticipationBadge(game.id)}
                              {isOrganizer && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Organizer
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-gray-600 mb-2">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span className="truncate">{game.location}</span>
                              {distance && (
                                <span className="ml-2 text-sm text-gray-500">
                                  • {formatDistance(distance)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSkillLevelColor(game.skillLevel)}`}>
                            {game.skillLevel === 'any' ? 'Any Level' : game.skillLevel.charAt(0).toUpperCase() + game.skillLevel.slice(1)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            <div>
                              <span className="font-medium">Date:</span>
                              <p>{formatDate(game.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-2" />
                            <div>
                              <span className="font-medium">Time:</span>
                              <p>{game.time}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-2" />
                            <div>
                              <span className="font-medium">Players:</span>
                              <p>{game.currentPlayers}/{game.maxPlayers}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <User className="h-4 w-4 mr-2" />
                            <div>
                              <span className="font-medium">Organizer:</span>
                              <p className="truncate">{game.organizerName}</p>
                            </div>
                          </div>
                        </div>

                        {game.description && (
                          <p className="text-gray-700 mb-4 line-clamp-2">{game.description}</p>
                        )}

                        <div className="flex justify-between items-center">
                          <div className="text-sm">
                            {spotsLeft > 0 ? (
                              <span className="text-green-600 font-medium">
                                {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                              </span>
                            ) : (
                              <span className="text-red-600 font-medium">Game full</span>
                            )}
                            {participationStatus === 'waitlist' && (
                              <span className="text-yellow-600 font-medium ml-2">• On waitlist</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGameClick(game)
                            }}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Game Details Modal */}
      <GameDetailsModal
        game={selectedGame}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onGameUpdate={handleGameUpdate}
      />
    </div>
  )
}