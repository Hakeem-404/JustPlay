import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Game, MapFilters } from '../../types/game'
import { useGeolocation } from '../../hooks/useGeolocation'
import GameMarker from './GameMarker'
import MapControls from './MapControls'

interface GameMapProps {
  games: Game[]
  onGameClick: (game: Game) => void
  className?: string
  // CRITICAL FIX: Accept mapFilters and onMapFiltersChange as props
  mapFilters: MapFilters
  onMapFiltersChange: (filters: MapFilters) => void
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

export default function GameMap({ 
  games, 
  onGameClick, 
  className = '',
  mapFilters,
  onMapFiltersChange
}: GameMapProps) {
  const { latitude, longitude, error: locationError, requestLocation } = useGeolocation()
  const mapRef = useRef<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [popupInfo, setPopupInfo] = useState<{ game: Game; longitude: number; latitude: number } | null>(null)

  const [viewState, setViewState] = useState({
    longitude: -74.0060, // NYC default
    latitude: 40.7128,
    zoom: 10
  })

  // Debug games prop
  useEffect(() => {
    console.log('🗺️ DEBUG: GameMap received games:', games.length)
    console.log('🗺️ DEBUG: Games data:', games.map(g => ({
      id: g.id,
      sport: g.sport,
      location: g.location,
      coordinates: { lat: g.latitude, lng: g.longitude },
      date: g.date,
      time: g.time
    })))
  }, [games])

  // Update view when user location is available OR when showing global games
  useEffect(() => {
    if (mapLoaded) {
      if (mapFilters.distance >= 999999 && games.length > 0) {
        // For global view, fit all games on the map
        console.log('🗺️ DEBUG: Fitting map to show all games globally')
        const bounds = games.reduce((bounds, game) => {
          return [
            [Math.min(bounds[0][0], game.longitude), Math.min(bounds[0][1], game.latitude)],
            [Math.max(bounds[1][0], game.longitude), Math.max(bounds[1][1], game.latitude)]
          ]
        }, [[180, 90], [-180, -90]])
        
        if (mapRef.current) {
          mapRef.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 10
          })
        }
      } else if (latitude && longitude) {
        // For local view, center on user location
        console.log('🗺️ DEBUG: Updating map view to user location:', { latitude, longitude })
        setViewState(prev => ({
          ...prev,
          longitude,
          latitude,
          zoom: 12
        }))
      }
    }
  }, [latitude, longitude, mapLoaded, mapFilters.distance, games])

  // CRITICAL FIX: Use games prop directly instead of filtering here
  // All filtering is now done in Dashboard component
  const displayGames = useMemo(() => {
    console.log('🗺️ DEBUG: ===== DISPLAYING GAMES IN MAP =====')
    console.log('🗺️ DEBUG: Input games from Dashboard:', games.length)
    console.log('🗺️ DEBUG: Game IDs:', games.map(g => g.id))
    
    // Limit to 50 games for performance
    const limited = games.slice(0, 50)
    if (limited.length < games.length) {
      console.log('🗺️ DEBUG: Limited to first 50 games for performance')
    }
    
    console.log('🗺️ DEBUG: Final games to display:', limited.length)
    return limited
  }, [games])

  const handleCenterOnUser = useCallback(() => {
    if (latitude && longitude && mapRef.current) {
      console.log('🗺️ DEBUG: Centering map on user location')
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 1000
      })
    } else {
      console.log('🗺️ DEBUG: Requesting user location')
      requestLocation()
    }
  }, [latitude, longitude, requestLocation])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !MAPBOX_TOKEN) return

    console.log('🗺️ DEBUG: Searching for location:', searchQuery)

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center
        console.log('🗺️ DEBUG: Search result:', { lat, lng })
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
      console.error('🗺️ DEBUG: Error searching location:', error)
      alert('Error searching for location. Please try again.')
    }
  }

  const handleMarkerClick = useCallback((game: Game) => {
    console.log('🗺️ DEBUG: Marker clicked for game:', game.id)
    setPopupInfo({
      game,
      longitude: game.longitude,
      latitude: game.latitude
    })
  }, [])

  const handlePopupClose = useCallback(() => {
    console.log('🗺️ DEBUG: Popup closed')
    setPopupInfo(null)
  }, [])

  // Simple marker grouping for nearby games
  const groupedGames = useMemo(() => {
    console.log('🗺️ DEBUG: Grouping games for markers, input:', displayGames.length)
    
    const groups: { [key: string]: Game[] } = {}
    const threshold = 0.001 // ~100 meters

    displayGames.forEach(game => {
      const key = `${Math.round(game.latitude / threshold)}_${Math.round(game.longitude / threshold)}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(game)
    })

    const result = Object.values(groups)
    console.log('🗺️ DEBUG: Grouped into', result.length, 'marker groups')
    
    return result
  }, [displayGames])

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

  console.log('🗺️ DEBUG: Rendering map with', groupedGames.length, 'marker groups')

  return (
    <div className={`relative ${className}`} style={{ height: '100%', width: '100%' }}>
      {/* Location Error */}
      {locationError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1001] bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center space-x-2 shadow-sm">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">{locationError}</span>
        </div>
      )}

      {/* Map Controls - CRITICAL FIX: Pass props instead of internal state */}
      <MapControls
        filters={mapFilters}
        onFiltersChange={onMapFiltersChange}
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
        onLoad={() => {
          console.log('🗺️ DEBUG: Map loaded successfully')
          setMapLoaded(true)
        }}
        onError={(error) => {
          console.error('🗺️ DEBUG: Mapbox error:', error)
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

        {/* User Location Marker */}
        {latitude && longitude && (
          <Marker longitude={longitude} latitude={latitude}>
            <div className="w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1"></div>
            </div>
          </Marker>
        )}

        {/* Game Markers */}
        {groupedGames.map((gameGroup, index) => {
          const primaryGame = gameGroup[0]
          console.log(`🗺️ DEBUG: Rendering marker group ${index + 1} with ${gameGroup.length} games at`, primaryGame.latitude, primaryGame.longitude)
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
            maxWidth="320px"
          >
            <GamePopup game={popupInfo.game} onGameClick={onGameClick} onClose={handlePopupClose} />
          </Popup>
        )}
      </Map>

      {/* Results Counter */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm px-3 py-2 z-[1000]">
        <span className="text-sm text-gray-600">
          {displayGames.length} game{displayGames.length !== 1 ? 's' : ''} found
          {displayGames.length === 50 && games.length > 50 && ' (showing first 50)'}
          {mapFilters.distance >= 999999 && (
            <span className="ml-2 text-blue-600 font-medium">• Worldwide</span>
          )}
        </span>
      </div>
    </div>
  )
}

// Enhanced GamePopup Component with better error handling
function GamePopup({ game, onGameClick, onClose }: { game: Game; onGameClick: (game: Game) => void; onClose: () => void }) {
  console.log('🗺️ GamePopup: Rendering for game:', game?.id, 'Players:', game?.currentPlayers, '/', game?.maxPlayers)
  
  // Early return if game is null/undefined
  if (!game) {
    return (
      <div className="p-4 w-full max-w-[280px]">
        <div className="text-center text-gray-500">
          <p>Game information unavailable</p>
          <button
            onClick={onClose}
            className="mt-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const getSkillLevelColor = (level?: string) => {
    if (!level) return 'bg-gray-100 text-gray-700'
    
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-700'
      case 'intermediate': return 'bg-yellow-100 text-yellow-700'
      case 'advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getSkillLevelLabel = (level?: string) => {
    if (!level) return 'Any Level'
    if (level === 'any') return 'Any Level'
    
    try {
      return level.charAt(0).toUpperCase() + level.slice(1)
    } catch (error) {
      return 'Any Level'
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return 'Date TBD'
    
    try {
      const gameDate = new Date(date)
      
      // Check if date is valid
      if (isNaN(gameDate.getTime())) {
        return 'Invalid Date'
      }
      
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
      return 'Date Error'
    }
  }

  // Safe property access with fallbacks
  const sport = game.sport || 'Unknown Sport'
  const location = game.location || 'Location TBD'
  const skillLevel = game.skillLevel || 'any'
  const date = game.date || ''
  const time = game.time || 'Time TBD'
  const currentPlayers = game.currentPlayers ?? 0
  const maxPlayers = game.maxPlayers ?? 0
  const organizerName = game.organizerName || 'Unknown Organizer'
  const description = game.description || ''

  const spotsLeft = Math.max(maxPlayers - currentPlayers, 0)

  return (
    <div className="p-4 w-full max-w-[280px] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">
            {sport}
          </h3>
          <p className="text-sm text-gray-600 truncate">{location}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getSkillLevelColor(skillLevel)}`}>
          {getSkillLevelLabel(skillLevel)}
        </span>
      </div>

      {/* Game Details */}
      <div className="space-y-2 mb-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Date:</span> {formatDate(date)} at {time}
        </div>
        
        <div className="text-sm text-gray-600">
          <span className="font-medium">Players:</span> {currentPlayers}/{maxPlayers}
          {spotsLeft > 0 && (
            <span className="ml-2 text-green-600 font-medium">
              ({spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left)
            </span>
          )}
          {spotsLeft === 0 && maxPlayers > 0 && (
            <span className="ml-2 text-red-600 font-medium">(Full)</span>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium">Organizer:</span> 
          <span className="truncate ml-1">{organizerName}</span>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-2 break-words">
          {description}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={onClose}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
        >
          Close
        </button>
        <button
          onClick={() => {
            try {
              console.log('🗺️ GamePopup: Opening game details for:', game.id)
              onGameClick(game)
            } catch (error) {
              console.error('Error handling game click:', error)
            }
          }}
          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
        >
          View Details
        </button>
      </div>
    </div>
  )
}