import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, List, Map as MapIcon } from 'lucide-react'
import GameMap from '../components/map/GameMap'
import { mockGames } from '../data/mockGames'
import { Game } from '../types/game'

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  const handleGameClick = (game: Game) => {
    setSelectedGame(game)
  }

  const handleJoinGame = (gameId: string) => {
    // TODO: Implement join game functionality
    console.log('Joining game:', gameId)
    setSelectedGame(null)
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

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Find Games</h1>
            <p className="text-gray-600">Discover pickup games happening near you</p>
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
            games={mockGames}
            onGameClick={handleGameClick}
            className="h-full"
          />
        ) : (
          <div className="h-full overflow-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-4">
                {mockGames.map((game) => {
                  const spotsLeft = game.maxPlayers - game.currentPlayers
                  return (
                    <div
                      key={game.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleGameClick(game)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{game.sport}</h3>
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
                            handleJoinGame(game.id)
                          }}
                          disabled={spotsLeft === 0}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            spotsLeft > 0
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {spotsLeft > 0 ? 'Join Game' : 'Game Full'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Detail Modal */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedGame.sport}</h2>
                  <p className="text-gray-600">{selectedGame.location}</p>
                </div>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Date</span>
                    <p className="text-gray-900">{formatDate(selectedGame.date)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Time</span>
                    <p className="text-gray-900">{selectedGame.time}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Players</span>
                    <p className="text-gray-900">{selectedGame.currentPlayers}/{selectedGame.maxPlayers}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Skill Level</span>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelColor(selectedGame.skillLevel)}`}>
                      {selectedGame.skillLevel === 'any' ? 'Any Level' : selectedGame.skillLevel.charAt(0).toUpperCase() + selectedGame.skillLevel.slice(1)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Organizer</span>
                  <p className="text-gray-900">{selectedGame.organizerName}</p>
                </div>

                {selectedGame.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Description</span>
                    <p className="text-gray-900 mt-1">{selectedGame.description}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedGame(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleJoinGame(selectedGame.id)}
                  disabled={selectedGame.currentPlayers >= selectedGame.maxPlayers}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    selectedGame.currentPlayers >= selectedGame.maxPlayers
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {selectedGame.currentPlayers >= selectedGame.maxPlayers ? 'Game Full' : 'Join Game'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}