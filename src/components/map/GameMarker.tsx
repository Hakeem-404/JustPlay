import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import { Icon, DivIcon } from 'leaflet'
import { MapPin, Users, Clock, Target, Calendar } from 'lucide-react'
import { Game } from '../../types/game'

interface GameMarkerProps {
  game: Game
  onGameClick: (game: Game) => void
}

// Sport-specific marker colors
const SPORT_COLORS: { [key: string]: string } = {
  'Basketball': '#f97316', // orange
  'Soccer': '#22c55e', // green
  'Tennis': '#eab308', // yellow
  'Baseball': '#3b82f6', // blue
  'Volleyball': '#ec4899', // pink
  'Football': '#8b5cf6', // purple
  'Hockey': '#06b6d4', // cyan
  'Golf': '#84cc16', // lime
  'Swimming': '#0ea5e9', // sky
  'Running': '#ef4444' // red
}

// Sport icons (using emoji for simplicity)
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

export default function GameMarker({ game, onGameClick }: GameMarkerProps) {
  const color = SPORT_COLORS[game.sport] || '#6b7280'
  const sportIcon = SPORT_ICONS[game.sport] || '🏃'

  // Create custom marker icon
  const customIcon = new DivIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transform: rotate(-45deg);
      ">
        <span style="transform: rotate(45deg);">${sportIcon}</span>
      </div>
    `,
    className: 'custom-game-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  })

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-700'
      case 'intermediate': return 'bg-yellow-100 text-yellow-700'
      case 'advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
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
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const spotsLeft = game.maxPlayers - game.currentPlayers

  return (
    <Marker
      position={[game.latitude, game.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: () => onGameClick(game)
      }}
    >
      <Popup className="game-popup" closeButton={false}>
        <div className="p-4 min-w-[280px]">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">
                {game.sport}
              </h3>
              <p className="text-sm text-gray-600 flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {game.location}
              </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelColor(game.skillLevel)}`}>
              {game.skillLevel === 'any' ? 'Any Level' : game.skillLevel.charAt(0).toUpperCase() + game.skillLevel.slice(1)}
            </span>
          </div>

          {/* Game Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{formatDate(game.date)} at {game.time}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-2" />
              <span>{game.currentPlayers}/{game.maxPlayers} players</span>
              {spotsLeft > 0 && (
                <span className="ml-2 text-green-600 font-medium">
                  ({spotsLeft} spots left)
                </span>
              )}
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Target className="h-4 w-4 mr-2" />
              <span>Organized by {game.organizerName}</span>
            </div>
          </div>

          {/* Description */}
          {game.description && (
            <p className="text-sm text-gray-700 mb-4 line-clamp-2">
              {game.description}
            </p>
          )}

          {/* Action Button */}
          <button
            onClick={() => onGameClick(game)}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              spotsLeft > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={spotsLeft === 0}
          >
            {spotsLeft > 0 ? 'Join Game' : 'Game Full'}
          </button>
        </div>
      </Popup>
    </Marker>
  )
}