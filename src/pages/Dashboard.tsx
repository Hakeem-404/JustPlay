import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, List, Map as MapIcon, AlertCircle, RefreshCw } from 'lucide-react'
import GameMap from '../components/map/GameMap'
import GameDetailsModal from '../components/GameDetailsModal'
import { gameService } from '../lib/gameService'
import { Game, MapFilters } from '../types/game'
import { useGeolocation } from '../hooks/useGeolocation'

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { latitude, longitude } = useGeolocation()

  const [filters, setFilters] = useState<MapFilters>({
    sports: [],
    distance: 10,
    dateRange: 'all',
    skillLevel: 'all'
  })

  const loadGames = async () => {
    setLoading(true)
    setError(null)

    try {
      // Build filter object for API
      const apiFilters: any = {}
      
      if (filters.sports.length > 0) {
        // For now, we'll filter on the frontend since we're getting all games
        // In a real app, you'd want to filter on the backend
      }

      if (latitude && longitude) {
        apiFilters.latitude = latitude
        apiFilters.longitude = longitude
        apiFilters.maxDistance = filters.distance
      }

      // Date filtering
      const today = new Date()
      switch (filters.dateRange) {
        case 'today':
          apiFilters.dateFrom = today.toISOString().split('T')[0]
          apiFilters.dateTo = today.toISOString().split('T')[0]
          break
        case 'tomorrow':
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          apiFilters.dateFrom = tomorrow.toISOString().split('T')[0]
          apiFilters.dateTo = tomorrow.toISOString().split('T')[0]
          break
        case 'week':
          const weekFromNow = new Date(today)
          weekFromNow.setDate(weekFromNow.getDate() + 7)
          apiFilters.dateFrom = today.toISOString().split('T')[0]
          apiFilters.dateTo = weekFromNow.toISOString().split('T')[0]
          break
      }

      if (filters.skillLevel !== 'all') {
        apiFilters.skillLevel = filters.skillLevel
      }

      const { data, error } = await gameService.getGames(apiFilters)

      if (error) {
        setError('Failed to load games. Please try again.')
        console.error('Error loading games:', error)
      } else {
        // Apply frontend filters for sports (since backend doesn't support array filtering yet)
        let filteredGames = data || []
        
        if (filters.sports.length > 0) {
          filteredGames = filteredGames.filter(game => 
            filters.sports.includes(game.sport)
          )
        }

        setGames(filteredGames)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Error loading games:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGames()
  }, [filters, latitude, longitude])

  const handleGameClick = (game: Game) => {
    setSelectedGame(game)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedGame(null)
  }

  const handleGameUpdate = (updatedGame: Game) => {
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
                    <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                    return (
                      <div
                        key={game.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleGameClick(game)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              {game.title || game.sport}
                            </h3>
                            <p className="text-gray-600">{game.location}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSkillLevelColor(game.skillLevel)}`}>
                            {game.skillLevel === 'any' ? 'Any Level' : game.skillLevel.charAt(0).toUpperCase() + game.skillLevel.slice(1)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Date:</span> {formatDate(game.date)}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Time:</span> {game.time}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Players:</span> {game.currentPlayers}/{game.maxPlayers}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Organizer:</span> {game.organizerName}
                          </div>
                        </div>

                        {game.description && (
                          <p className="text-gray-700 mb-4">{game.description}</p>
                        )}

                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-500">
                            {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Game full'}
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