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
  { value: 1, label: '1 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' }
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

  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
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
            />
          </div>
          <button
            onClick={onSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-2 pointer-events-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-sm transition-colors ${
              showFilters 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {(filters.sports.length > 0 || filters.distance !== 10 || filters.dateRange !== 'all') && (
              <span className="bg-red-500 text-white text-xs rounded-full w-2 h-2"></span>
            )}
          </button>

          {userLocation && (
            <button
              onClick={onCenterOnUser}
              className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">My Location</span>
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-lg p-4 pointer-events-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Filter Games</h3>
            
            {/* Sports Filter */}
            <div className="mb-4">
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
                  >
                    {sport}
                  </button>
                ))}
              </div>
              {filters.sports.length > 0 && (
                <button
                  onClick={() => onFiltersChange({ ...filters, sports: [] })}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                >
                  Clear all sports
                </button>
              )}
            </div>

            {/* Distance Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance from me
              </label>
              <select
                value={filters.distance}
                onChange={(e) => onFiltersChange({ ...filters, distance: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {DISTANCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Within {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                When
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => onFiltersChange({ ...filters, dateRange: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All upcoming games</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">This week</option>
              </select>
            </div>

            {/* Skill Level Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skill Level
              </label>
              <select
                value={filters.skillLevel}
                onChange={(e) => onFiltersChange({ ...filters, skillLevel: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                distance: 10,
                dateRange: 'all',
                skillLevel: 'all'
              })}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}