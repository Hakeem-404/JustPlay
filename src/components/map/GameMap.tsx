import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet'
import { Icon } from 'leaflet'
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

// Custom user location marker
const userLocationIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="3"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

export default function GameMap({ games, onGameClick, className = '' }: GameMapProps) {
  const { latitude, longitude, error: locationError, requestLocation } = useGeolocation()
  const [mapRef, setMapRef] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [filters, setFilters] = useState<MapFilters>({
    sports: [],
    distance: 10,
    dateRange: 'all',
    skillLevel: 'all'
  })

  // Default center (NYC) if no user location
  const defaultCenter: [number, number] = [40.7128, -74.0060]
  const mapCenter: [number, number] = latitude && longitude 
    ? [latitude, longitude] 
    : defaultCenter

  // Debounced filter changes
  const [debouncedFilters, setDebouncedFilters] = useState(filters)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters])

  // Handle map ready event
  useEffect(() => {
    if (mapRef) {
      const timer = setTimeout(() => {
        try {
          mapRef.invalidateSize()
          setMapLoaded(true)
          setMapError(null)
        } catch (error) {
          console.error('Map initialization error:', error)
          setMapError('Failed to initialize map')
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [mapRef])

  // Filter games based on current filters (limit to 20 for performance)
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

    // Limit to 20 games for performance
    return filtered.slice(0, 20)
  }, [games, debouncedFilters, latitude, longitude])

  const handleCenterOnUser = () => {
    if (latitude && longitude && mapRef) {
      mapRef.setView([latitude, longitude], 15)
    } else {
      requestLocation()
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapRef) return

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      )
      const data = await response.json()

      if (data.length > 0) {
        const result = data[0]
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)
        mapRef.setView([lat, lng], 15)
      } else {
        alert('Location not found. Please try a different search term.')
      }
    } catch (error) {
      console.error('Error searching location:', error)
      alert('Error searching for location. Please try again.')
    }
  }

  const handleRetry = () => {
    setMapError(null)
    setMapLoaded(false)
    setRetryCount(prev => prev + 1)
  }

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

  // Simple marker grouping for nearby games (instead of clustering library)
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

  // Show error state
  if (mapError) {
    return (
      <div className={`relative ${className} flex items-center justify-center bg-gray-100`}>
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Failed to Load</h3>
          <p className="text-gray-600 mb-4">{mapError}</p>
          <button
            onClick={handleRetry}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
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

      {/* Loading Overlay with Skeleton */}
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
      <div style={{ height: '100%', width: '100%' }}>
        <MapContainer
          key={retryCount} // Force remount on retry
          center={mapCenter}
          zoom={10} // Reduced initial zoom for faster loading
          maxZoom={18} // Limit max zoom
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          ref={setMapRef}
          whenReady={() => {
            setTimeout(() => {
              setMapLoaded(true)
              setMapError(null)
            }, 200)
          }}
          onError={() => {
            setMapError('Map tiles failed to load')
            setMapLoaded(false)
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={18}
            tileSize={256}
            zoomOffset={0}
            subdomains="abcd"
            errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
          />

          {/* User Location */}
          {latitude && longitude && mapLoaded && (
            <>
              <Marker position={[latitude, longitude]} icon={userLocationIcon} />
              <Circle
                center={[latitude, longitude]}
                radius={filters.distance * 1000} // Convert km to meters
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  weight: 2
                }}
              />
            </>
          )}

          {/* Game Markers */}
          {mapLoaded && groupedGames.map((gameGroup, index) => {
            // For groups with multiple games, show the first one with a count indicator
            const primaryGame = gameGroup[0]
            return (
              <GameMarker
                key={`group-${index}`}
                game={primaryGame}
                onGameClick={onGameClick}
                gameCount={gameGroup.length}
              />
            )
          })}
        </MapContainer>
      </div>

      {/* Results Counter */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm px-3 py-2 z-[1000]">
        <span className="text-sm text-gray-600">
          {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''} found
          {filteredGames.length === 20 && games.length > 20 && ' (showing first 20)'}
        </span>
      </div>
    </div>
  )
}