import React from 'react'
import { Marker } from 'react-map-gl'
import { Game } from '../../types/game'

interface GameMarkerProps {
  game: Game
  gameCount?: number
  onMarkerClick: (game: Game) => void
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

export default function GameMarker({ game, gameCount = 1, onMarkerClick }: GameMarkerProps) {
  const color = SPORT_COLORS[game.sport] || '#6b7280'
  const sportIcon = SPORT_ICONS[game.sport] || '🏃'

  return (
    <Marker
      longitude={game.longitude}
      latitude={game.latitude}
      onClick={(e) => {
        e.originalEvent.stopPropagation()
        onMarkerClick(game)
      }}
    >
      <div className="custom-marker relative">
        <div
          className="w-10 h-10 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-lg transform rotate-45"
          style={{ backgroundColor: color }}
        >
          <span className="transform -rotate-45">{sportIcon}</span>
        </div>
        
        {/* Game count badge */}
        {gameCount > 1 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            {gameCount}
          </div>
        )}
        
        {/* Pointer tail */}
        <div
          className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent"
          style={{ borderTopColor: color }}
        />
      </div>
    </Marker>
  )
}