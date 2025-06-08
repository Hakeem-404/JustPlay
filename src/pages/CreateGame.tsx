import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Users,
  Target,
  FileText,
  Play
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { gameService } from '../lib/gameService'
import { GameFormData } from '../types/game'
import LocationPicker from '../components/map/LocationPicker'

const SPORTS_OPTIONS = [
  { value: 'Basketball', icon: '🏀', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'Soccer', icon: '⚽', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'Tennis', icon: '🎾', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'Baseball', icon: '⚾', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'Volleyball', icon: '🏐', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'Football', icon: '🏈', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'Hockey', icon: '🏒', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'Golf', icon: '⛳', color: 'bg-lime-100 text-lime-700 border-lime-200' },
  { value: 'Swimming', icon: '🏊', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'Running', icon: '🏃', color: 'bg-red-100 text-red-700 border-red-200' }
]

const SKILL_LEVELS = [
  { 
    value: 'beginner', 
    label: 'Beginner', 
    description: 'New to the sport or just starting out',
    color: 'bg-green-50 border-green-200 text-green-700'
  },
  { 
    value: 'intermediate', 
    label: 'Intermediate', 
    description: 'Some experience and comfortable with basics',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700'
  },
  { 
    value: 'advanced', 
    label: 'Advanced', 
    description: 'Experienced player with strong skills',
    color: 'bg-red-50 border-red-200 text-red-700'
  },
  { 
    value: 'any', 
    label: 'Any Level', 
    description: 'All skill levels welcome',
    color: 'bg-blue-50 border-blue-200 text-blue-700'
  }
]

const POPULAR_VENUES = [
  'Central Park Basketball Courts',
  'Riverside Park Soccer Field',
  'Brooklyn Bridge Park',
  'Prospect Park Baseball Fields',
  'Wollman Rink',
  'Van Cortlandt Golf Course'
]

export default function CreateGame() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  const [formData, setFormData] = useState<GameFormData>({
    sport: '',
    title: '',
    location: '',
    latitude: undefined,
    longitude: undefined,
    date: '',
    time: '',
    maxPlayers: 10,
    skillLevel: 'any',
    description: '',
    isPrivate: false
  })

  const totalSteps = 5

  const handleInputChange = (field: keyof GameFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  const handleLocationSelect = (location: { latitude: number; longitude: number; address: string }) => {
    setFormData(prev => ({
      ...prev,
      location: location.address,
      latitude: location.latitude,
      longitude: location.longitude
    }))
    setShowLocationPicker(false)
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.sport) {
          setError('Please select a sport')
          return false
        }
        break
      case 2:
        if (!formData.date) {
          setError('Please select a date')
          return false
        }
        if (!formData.time) {
          setError('Please select a time')
          return false
        }
        // Validate future date
        const selectedDate = new Date(`${formData.date}T${formData.time}`)
        const now = new Date()
        if (selectedDate <= now) {
          setError('Please select a future date and time')
          return false
        }
        break
      case 3:
        if (!formData.location.trim()) {
          setError('Please enter a location')
          return false
        }
        break
      case 4:
        if (formData.maxPlayers < 2 || formData.maxPlayers > 100) {
          setError('Max players must be between 2 and 100')
          return false
        }
        break
    }
    return true
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError('')
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep) || !user) return

    // Final validation
    if (!formData.latitude || !formData.longitude) {
      setError('Please set location coordinates using the map picker')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error } = await gameService.createGame(formData, user.id)

      if (error) {
        setError('Failed to create game. Please try again.')
        console.error('Game creation error:', error)
      } else {
        setSuccess('Game created successfully!')
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Game creation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Play className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Sport</h2>
              <p className="text-gray-600">What sport would you like to organize?</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {SPORTS_OPTIONS.map((sport) => (
                <button
                  key={sport.value}
                  type="button"
                  onClick={() => handleInputChange('sport', sport.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                    formData.sport === sport.value
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : `border-gray-200 hover:border-gray-300 ${sport.color}`
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{sport.icon}</span>
                    <div>
                      <h3 className="font-semibold">{sport.value}</h3>
                      {formData.sport === sport.value && (
                        <CheckCircle className="h-5 w-5 text-blue-600 mt-1" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Optional Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Game Title (Optional)
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder={formData.sport ? `${formData.sport} Game` : "e.g., Pickup Basketball"}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">When is your game?</h2>
              <p className="text-gray-600">Choose the date and time for your game</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    id="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="time"
                    id="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {formData.date && formData.time && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium">
                    Game scheduled for {new Date(`${formData.date}T${formData.time}`).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} at {new Date(`${formData.date}T${formData.time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-orange-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Where will you play?</h2>
              <p className="text-gray-600">Set the location for your game</p>
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter the game location"
                    list="popular-venues"
                  />
                  <datalist id="popular-venues">
                    {POPULAR_VENUES.map((venue) => (
                      <option key={venue} value={venue} />
                    ))}
                  </datalist>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 whitespace-nowrap"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Pick on Map</span>
                </button>
              </div>
              {formData.latitude && formData.longitude && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 text-sm">
                      Location coordinates set ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Popular Venues */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Popular Venues</h3>
              <div className="grid grid-cols-1 gap-2">
                {POPULAR_VENUES.slice(0, 4).map((venue) => (
                  <button
                    key={venue}
                    type="button"
                    onClick={() => handleInputChange('location', venue)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      formData.location === venue
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {venue}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Game Details</h2>
              <p className="text-gray-600">Set the player limit and skill level</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Players *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="maxPlayers"
                    min="2"
                    max="100"
                    value={formData.maxPlayers}
                    onChange={(e) => handleInputChange('maxPlayers', parseInt(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Including yourself as organizer</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skill Level
                </label>
                <div className="space-y-2">
                  {SKILL_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => handleInputChange('skillLevel', level.value)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        formData.skillLevel === level.value
                          ? 'border-blue-500 bg-blue-50'
                          : `border-gray-200 hover:border-gray-300 ${level.color}`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{level.label}</h4>
                          <p className="text-sm text-gray-600">{level.description}</p>
                        </div>
                        {formData.skillLevel === level.value && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                  placeholder="Add any additional details about the game..."
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isPrivate"
                checked={formData.isPrivate}
                onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700">
                Make this a private game (invite only)
              </label>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Confirm</h2>
              <p className="text-gray-600">Double-check your game details before creating</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700">Sport</h3>
                  <p className="text-gray-900">{formData.sport}</p>
                </div>
                {formData.title && (
                  <div>
                    <h3 className="font-medium text-gray-700">Title</h3>
                    <p className="text-gray-900">{formData.title}</p>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-700">Date & Time</h3>
                  <p className="text-gray-900">
                    {new Date(`${formData.date}T${formData.time}`).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} at {new Date(`${formData.date}T${formData.time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Max Players</h3>
                  <p className="text-gray-900">{formData.maxPlayers} players</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Skill Level</h3>
                  <p className="text-gray-900">
                    {SKILL_LEVELS.find(level => level.value === formData.skillLevel)?.label}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Privacy</h3>
                  <p className="text-gray-900">{formData.isPrivate ? 'Private' : 'Public'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">Location</h3>
                <p className="text-gray-900">{formData.location}</p>
                {formData.latitude && formData.longitude && (
                  <p className="text-sm text-gray-500">
                    Coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                  </p>
                )}
              </div>

              {formData.description && (
                <div>
                  <h3 className="font-medium text-gray-700">Description</h3>
                  <p className="text-gray-900">{formData.description}</p>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm font-medium text-gray-600">
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          )}

          {/* Step Content */}
          {getStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Create Game</span>
                    <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Tips for a Great Game</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li>• Use the map picker to set exact coordinates for easy finding</li>
            <li>• Be specific about the location and include parking information</li>
            <li>• Set realistic player limits based on the sport and venue</li>
            <li>• Include skill level to help players decide if it's a good fit</li>
            <li>• Add contact information or meeting instructions in the description</li>
          </ul>
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          onCancel={() => setShowLocationPicker(false)}
          initialLocation={formData.latitude && formData.longitude ? {
            latitude: formData.latitude,
            longitude: formData.longitude
          } : undefined}
        />
      )}
    </div>
  )
}