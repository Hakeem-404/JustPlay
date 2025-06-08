import React, { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { Icon } from 'leaflet'
import { MapPin, Search, Check, X, AlertCircle, RefreshCw } from 'lucide-react'

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void
  onCancel: () => void
  initialLocation?: { latitude: number; longitude: number }
}

// Custom marker icon for selected location
const selectedLocationIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#ef4444" stroke="white" stroke-width="4"/>
      <circle cx="20" cy="20" r="8" fill="white"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
})

interface MapClickHandlerProps {
  onLocationClick: (lat: number, lng: number) => void
}

function MapClickHandler({ onLocationClick }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onLocationClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

export default function LocationPicker({ onLocationSelect, onCancel, initialLocation }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number
    longitude: number
    address: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const defaultCenter = initialLocation 
    ? [initialLocation.latitude, initialLocation.longitude] as [number, number]
    : [40.7128, -74.0060] as [number, number] // NYC default

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      address: 'Selected location'
    })

    // Try to get address from coordinates using reverse geocoding
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      
      if (data.display_name) {
        setSelectedLocation({
          latitude: lat,
          longitude: lng,
          address: data.display_name
        })
      }
    } catch (error) {
      console.error('Error getting address:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
      )
      const data = await response.json()

      if (data.length > 0) {
        const result = data[0]
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)
        
        setSelectedLocation({
          latitude: lat,
          longitude: lng,
          address: result.display_name
        })
      } else {
        alert('Location not found. Please try a different search term.')
      }
    } catch (error) {
      console.error('Error searching location:', error)
      alert('Error searching for location. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation)
    }
  }

  const handleRetry = () => {
    setMapError(null)
    setMapLoaded(false)
    setRetryCount(prev => prev + 1)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Select Game Location</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search for an address or location..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-2">
            Click on the map to select a location, or search for an address above.
          </p>
        </div>

        {/* Map */}
        <div className="flex-1 relative" style={{ height: '100%' }}>
          {mapError ? (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
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
          ) : (
            <>
              {!mapLoaded && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-[999]">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg mb-4 map-loading"></div>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Loading map...</p>
                  </div>
                </div>
              )}
              
              <MapContainer
                key={retryCount}
                center={defaultCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                whenReady={() => setMapLoaded(true)}
                onError={() => setMapError('Map tiles failed to load')}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  maxZoom={19}
                  tileSize={256}
                  zoomOffset={0}
                  subdomains="abcd"
                  errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                />
                
                <MapClickHandler onLocationClick={handleMapClick} />
                
                {selectedLocation && mapLoaded && (
                  <Marker
                    position={[selectedLocation.latitude, selectedLocation.longitude]}
                    icon={selectedLocationIcon}
                  />
                )}
              </MapContainer>
            </>
          )}
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Selected Location</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedLocation.address}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLocation}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Check className="h-4 w-4" />
            <span>Confirm Location</span>
          </button>
        </div>
      </div>
    </div>
  )
}