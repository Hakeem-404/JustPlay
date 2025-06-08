import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Map, { Marker, Popup, Source, Layer, NavigationControl, GeolocateControl } from 'react-map-gl'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Game, MapFilters } from '../../types/game'
import { useGeolocation } from '../../hooks/useGeolocation'
import GameMarker from './GameMarker'
import MapControls from './MapControls'

interface GameMapProps {
  games: Game[]
  onGameClick: (game: Game) => void
  className?: string
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

export default function GameMap({ games, onGameClick, className = '' }: GameMapProps) {
  const { latitude, longitude, error: locationError, requestLocation } = useGeolocation()
  const mapRef = useRef<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [popupInfo, setPopupInfo] = useState<{ game: Game; longitude: number; latitude: number } | null>(null)

  const [filters, setFilters] = useState<MapFilters>({
    sports: [],
    distance: 10,
    dateRange: 'all',
    skillLevel: 'all'
  })

  const [viewState, setViewState] = useState({
    longitude: -74.0060, // NYC default
    latitude: 40.7128,
    zoom: 10
  })

  // Update view when user location is available
  useEffect(() => {
    if (latitude && longitude && mapLoaded) {
      setViewState(prev => ({
        ...prev,
        longitude,
        latitude,
        zoom: 12
      }))
    }
  }, [latitude, longitude, mapLoaded])

  // Debounced filter changes
  const [debouncedFilters, setDebouncedFilters] = useState(filters)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters])

  // Filter games based on current filters
  const filteredGames = useMemo(() => {
    const filtered = games.filter(game => {
      // Sport filter
      if (debouncedFilters.sports.length > 0 && !debouncedFilters.sports.includes(game.sport)) {
        return false
      }

      // Distance filter (only if user location is available)
      if (latitude && longitude) {
        const distance = calculateDistance(
          latitude, longitude,
          game.latitude, game.longitude
        )
        if (distance > debouncedFilters.distance) {
          return false
        }
      }

      // Date filter
      const gameDate = new Date(game.date)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const weekFromNow = new Date(today)
      weekFromNow.setDate(weekFromNow.getDate() + 7)

      switch (debouncedFilters.dateRange) {
        case 'today':
          if (gameDate.toDateString() !== today.toDateString()) return false
          break
        case 'tomorrow':
          if (gameDate.toDateString() !== tomorrow.toDateString()) return false
          break
        case 'week':
          if (gameDate > weekFromNow) return false
          break
      }

      // Skill level filter
      if (debouncedFilters.skillLevel !== 'all' && game.skillLevel !== debouncedFilters.skillLevel) {
        return false
      }

      return true
    })

    // Limit to 50 games for performance
    return filtered.slice(0, 50)
  }, [games, debouncedFilters, latitude, longitude])

  const handleCenterOnUser = useCallback(() => {
    if (latitude && longitude && mapRef.current) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 1000
      })
    } else {
      requestLocation()
    }
  }, [latitude, longitude, requestLocation])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !MAPBOX_TOKEN) return

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center
        setViewState(prev => ({
          ...prev,
          longitude: lng,
          latitude: lat,
          zoom: 15
        }))
      } else {
        alert('Location not found. Please try a different search term.')
      }
    } catch (error) {
      console.error('Error searching location:', error)
      alert('Error searching for location. Please try again.')
    }
  }

  const handleMarkerClick = useCallback((game: Game) => {
    setPopupInfo({
      game,
      longitude: game.longitude,
      latitude: game.latitude
    })
  }, [])

  const handlePopupClose = useCallback(() => {
    setPopupInfo(null)
  }, [])

  // Calculate distance between two points in kilometers
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  // Simple marker grouping for nearby games
  const groupedGames = useMemo(() => {
    const groups: { [key: string]: Game[] } = {}
    const threshold = 0.001 // ~100 meters

    filteredGames.forEach(game => {
      const key = `${Math.round(game.latitude / threshold)}_${Math.round(game.longitude / threshold)}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(game)
    })

    return Object.values(groups)
  }, [filteredGames])

  // Create circle layer for user location radius
  const circleGeoJSON = useMemo(() => {
    if (!latitude || !longitude) return null

    const radiusInKm = filters.distance
    const radiusInMeters = radiusInKm * 1000
    const points = 64
    const coords = []

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI
      const dx = radiusInMeters * Math.cos(angle)
      const dy = radiusInMeters * Math.sin(angle)
      
      const deltaLat = dy / 111320
      const deltaLng = dx / (111320 * Math.cos(latitude * Math.PI / 180))
      
      coords.push([longitude + deltaLng, latitude + deltaLat])
    }
    coords.push(coords[0]) // Close the circle

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    }
  }, [latitude, longitude, filters.distance])

  // Show error state
  if (mapError) {
    return (
      <div className={`relative ${className} flex items-center justify-center bg-gray-100`}>
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Failed to Load</h3>
          <p className="text-gray-600 mb-4">{mapError}</p>
          <button
            onClick={() => {
              setMapError(null)
              setMapLoaded(false)
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    )
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`relative ${className} flex items-center justify-center bg-gray-100`}>
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Mapbox Token Required</h3>
          <p className="text-gray-600 mb-4">
            Please add your Mapbox access token to the .env file as VITE_MAPBOX_ACCESS_TOKEN
          </p>
          <p className="text-sm text-gray-500">
            Get a free token at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">mapbox.com</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ height: '100%', width: '100%' }}>
      {/* Location Error */}
      {locationError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1001] bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center space-x-2 shadow-sm">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">{locationError}</span>
        </div>
      )}

      {/* Map Controls */}
      <MapControls
        filters={filters}
        onFiltersChange={setFilters}
        onCenterOnUser={handleCenterOnUser}
        userLocation={latitude && longitude ? { latitude, longitude } : null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={handleSearch}
      />

      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-[999]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-lg mb-4 map-loading"></div>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading map...</p>
            <p className="text-gray-500 text-xs mt-1">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onLoad={() => setMapLoaded(true)}
        onError={(error) => {
          console.error('Mapbox error:', error)
          setMapError('Failed to load map. Please check your internet connection.')
        }}
        attributionControl={false}
      >
        {/* Navigation Controls */}
        <NavigationControl position="bottom-right" />
        
        {/* Geolocate Control */}
        <GeolocateControl
          position="bottom-right"
          trackUserLocation={false}
          showUserHeading={false}
        />

        {/* User Location Circle */}
        {latitude && longitude && circleGeoJSON && (
          <Source id="user-radius\" type="geojson\" data={circleGeoJSON}>
            <Layer
              id="user-radius-fill"
              type="fill"
              paint={{
                'fill-color': '#3b82f6',
                'fill-opacity': 0.1
              }}
            />
            <Layer
              id="user-radius-line"
              type="line"
              paint={{
                'line-color': '#3b82f6',
                'line-width': 2,
                'line-opacity': 0.5
              }}
            />
          </Source>
        )}

        {/* User Location Marker */}
        {latitude && longitude && (
          <Marker longitude={longitude} latitude={latitude}>
            <div className="w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
          </Marker>
        )}

        {/* Game Markers */}
        {groupedGames.map((gameGroup, index) => {
          const primaryGame = gameGroup[0]
          return (
            <GameMarker
              key={`group-${index}`}
              game={primaryGame}
              gameCount={gameGroup.length}
              onMarkerClick={handleMarkerClick}
            />
          )
        })}

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            onClose={handlePopupClose}
            closeButton={false}
            closeOnClick={false}
            offset={[0, -40]}
          >
            <GamePopup game={popupInfo.game} onGameClick={onGameClick} onClose={handlePopupClose} />
          </Popup>
        )}
      </Map>

      {/* Results Counter */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm px-3 py-2 z-[1000]">
        <span className="text-sm text-gray-600">
          {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''} found
          {filteredGames.length === 50 && games.length > 50 && ' (showing first 50)'}
        </span>
      </div>
    </div>
  )
}

// Game Popup Component
function GamePopup({ game, onGameClick, onClose }: { game: Game; onGameClick: (game: Game) => void; onClose: () => void }) {
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
    <div className="p-4 min-w-[280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900 mb-1">
            {game.sport}
          </h3>
          <p className="text-sm text-gray-600">{game.location}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelColor(game.skillLevel)}`}>
          {game.skillLevel === 'any' ? 'Any Level' : game.skillLevel.charAt(0).toUpperCase() + game.skillLevel.slice(1)}
        </span>
      </div>

      {/* Game Details */}
      <div className="space-y-2 mb-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Date:</span> {formatDate(game.date)} at {game.time}
        </div>
        
        <div className="text-sm text-gray-600">
          <span className="font-medium">Players:</span> {game.currentPlayers}/{game.maxPlayers}
          {spotsLeft > 0 && (
            <span className="ml-2 text-green-600 font-medium">
              ({spotsLeft} spots left)
            </span>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium">Organizer:</span> {game.organizerName}
        </div>
      </div>

      {/* Description */}
      {game.description && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
          {game.description}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={onClose}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
        <button
          onClick={() => onGameClick(game)}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            spotsLeft > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={spotsLeft === 0}
        >
          {spotsLeft > 0 ? 'View Details' : 'Game Full'}
        </button>
      </div>
    </div>
  )
}