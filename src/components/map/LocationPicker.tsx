import React, { useState, useCallback } from 'react'
import Map, { Marker, NavigationControl } from 'react-map-gl'
import { MapPin, Search, Check, X, AlertCircle, RefreshCw } from 'lucide-react'

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void
  onCancel: () => void
  initialLocation?: { latitude: number; longitude: number }
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

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

  const [viewState, setViewState] = useState({
    longitude: initialLocation?.longitude || -74.0060,
    latitude: initialLocation?.latitude || 40.7128,
    zoom: 13
  })

  const handleMapClick = useCallback(async (event: any) => {
    const { lng, lat } = event.lngLat
    
    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      address: 'Selected location'
    })

    // Try to get address from coordinates using reverse geocoding
    if (MAPBOX_TOKEN) {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi`
        )
        const data = await response.json()
        
        if (data.features && data.features.length > 0) {
          setSelectedLocation({
            latitude: lat,
            longitude: lng,
            address: data.features[0].place_name
          })
        }
      } catch (error) {
        console.error('Error getting address:', error)
      }
    }
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !MAPBOX_TOKEN) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const [lng, lat] = feature.center
        
        setSelectedLocation({
          latitude: lat,
          longitude: lng,
          address: feature.place_name
        })
        
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

  if (!MAPBOX_TOKEN) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mapbox Token Required</h3>
            <p className="text-gray-600 mb-4">
              Please add your Mapbox access token to use the location picker.
            </p>
            <button
              onClick={onCancel}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
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
        <div className="flex-1 relative">
          {mapError ? (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Failed to Load</h3>
                <p className="text-gray-600 mb-4">{mapError}</p>
                <button
                  onClick={() => setMapError(null)}
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
              
              <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                onClick={handleMapClick}
                mapboxAccessToken={MAPBOX_TOKEN}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/light-v11"
                onLoad={() => setMapLoaded(true)}
                onError={(error) => {
                  console.error('Mapbox error:', error)
                  setMapError('Failed to load map. Please check your internet connection.')
                }}
                cursor="crosshair"
              >
                <NavigationControl position="bottom-right" />
                
                {selectedLocation && (
                  <Marker
                    longitude={selectedLocation.longitude}
                    latitude={selectedLocation.latitude}
                  >
                    <div className="w-8 h-8 bg-red-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                  </Marker>
                )}
              </Map>
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