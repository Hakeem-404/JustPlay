import React from 'react'
import { MapPin, Filter, Search, Target } from 'lucide-react'
import { MapFilters } from '../../types/game'

interface MapControlsProps {
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  onCenterOnUser: () => void
  userLocation: { latitude: number; longitude: number } | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearch: () => void
}

const SPORTS_OPTIONS = [
  'Basketball', 'Soccer', 'Tennis', 'Baseball', 
  'Volleyball', 'Football', 'Hockey', 'Golf', 
  'Swimming', 'Running'
]

const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: 500, label: '500 km' },
  { value: 999999, label: 'No limit' }
]

export default function MapControls({
  filters,
  onFiltersChange,
  onCenterOnUser,
  userLocation,
  searchQuery,
  onSearchChange,
  onSearch
}: MapControlsProps) {
  const [showFilters, setShowFilters] = React.useState(false)

  const handleSportToggle = (sport: string) => {
    const newSports = filters.sports.includes(sport)
      ? filters.sports.filter(s => s !== sport)
      : [...filters.sports, sport]
    
    onFiltersChange({ ...filters, sports: newSports })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch()
    }
  }

  const getDistanceLabel = () => {
    const option = DISTANCE_OPTIONS.find(opt => opt.value === filters.distance)
    return option?.label || `${filters.distance} km`
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.sports.length > 0) count++
    if (filters.distance !== 100) count++ // 100km is now default
    if (filters.dateRange !== 'all') count++
    if (filters.skillLevel !== 'all') count++
    return count
  }

  return (
    <div className="absolute top-4 left-4 right-4 z-[var(--z-fixed)] pointer-events-none">
      <div className="flex flex-col space-y-4">
        {/* Search Bar */}
        <div className="flex space-x-2 pointer-events-auto">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for locations..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search locations"
            />
          </div>
          <button
            onClick={onSearch}
            className="btn btn-primary shadow-sm flex items-center justify-center"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-sm transition-colors relative ${
              showFilters 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-expanded={showFilters}
            aria-controls="map-filters-panel"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {getActiveFiltersCount() > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium" aria-label={`${getActiveFiltersCount()} active filters`}>
                {getActiveFiltersCount()}
              </span>
            )}
          </button>

          {userLocation && (
            <button
              onClick={onCenterOnUser}
              className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              aria-label="Center map on my location"
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">My Location</span>
            </button>
          )}

          {/* Quick Distance Toggle */}
          {userLocation && (
            <div className="flex items-center space-x-1 bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => onFiltersChange({ ...filters, distance: 100 })}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  filters.distance <= 100 
                    ? 'bg-green-100 text-green-700' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                aria-pressed={filters.distance <= 100}
                aria-label="Show nearby games"
              >
                Nearby
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, distance: 999999 })}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  filters.distance > 100 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                aria-pressed={filters.distance > 100}
                aria-label="Show all games worldwide"
              >
                All
              </button>
            </div>
          )}
        </div>

        {/* Location Status */}
        {userLocation && (
          <div className="bg-white rounded-lg shadow-sm px-3 py-2 pointer-events-auto">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-green-600" />
              <span>
                Showing games within {getDistanceLabel()}
                {filters.distance < 999999 && (
                  <button
                    onClick={() => onFiltersChange({ ...filters, distance: 999999 })}
                    className="ml-2 text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
                  >
                    Show all
                  </button>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div 
            id="map-filters-panel"
            className="bg-white rounded-lg shadow-lg p-4 pointer-events-auto max-h-[70vh] overflow-y-auto"
            role="region"
            aria-label="Map filters"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Filter Games</h3>
            
            {/* Sports Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sports
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPORTS_OPTIONS.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => handleSportToggle(sport)}
                    className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
                      filters.sports.includes(sport)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-pressed={filters.sports.includes(sport)}
                  >
                    {sport}
                  </button>
                ))}
              </div>
              {filters.sports.length > 0 && (
                <button
                  onClick={() => onFiltersChange({ ...filters, sports: [] })}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-2 focus:outline-none focus:underline"
                >
                  Clear all sports
                </button>
              )}
            </div>

            {/* Distance Filter */}
            <div className="mb-6">
              <label htmlFor="distance-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Distance from me
                {!userLocation && (
                  <span className="text-xs text-gray-500 ml-1">(location required)</span>
                )}
              </label>
              <select
                id="distance-filter"
                value={filters.distance}
                onChange={(e) => onFiltersChange({ ...filters, distance: Number(e.target.value) })}
                disabled={!userLocation}
                className="form-input"
                aria-describedby="distance-help"
              >
                {DISTANCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {!userLocation && (
                <p id="distance-help" className="text-xs text-gray-500 mt-1">
                  Enable location access to filter by distance
                </p>
              )}
            </div>

            {/* Date Filter */}
            <div className="mb-6">
              <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-2">
                When
              </label>
              <select
                id="date-filter"
                value={filters.dateRange}
                onChange={(e) => onFiltersChange({ ...filters, dateRange: e.target.value as any })}
                className="form-input"
              >
                <option value="all">All upcoming games</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">This week</option>
              </select>
            </div>

            {/* Skill Level Filter */}
            <div className="mb-6">
              <label htmlFor="skill-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Skill Level
              </label>
              <select
                id="skill-filter"
                value={filters.skillLevel}
                onChange={(e) => onFiltersChange({ ...filters, skillLevel: e.target.value as any })}
                className="form-input"
              >
                <option value="all">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="any">Any level welcome</option>
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => onFiltersChange({
                sports: [],
                distance: 100, // Reset to new default
                dateRange: 'all',
                skillLevel: 'all'
              })}
              className="w-full btn btn-secondary"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}