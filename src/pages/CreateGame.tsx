import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Clock, Users, Info, Target } from 'lucide-react'
import LocationPicker from '../components/map/LocationPicker'
import { GameFormData } from '../types/game'

export default function CreateGame() {
  const navigate = useNavigate()
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [gameData, setGameData] = useState<GameFormData>({
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

  const handleInputChange = (field: keyof GameFormData, value: any) => {
    setGameData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLocationSelect = (location: { latitude: number; longitude: number; address: string }) => {
    setGameData(prev => ({
      ...prev,
      location: location.address,
      latitude: location.latitude,
      longitude: location.longitude
    }))
    setShowLocationPicker(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!gameData.sport || !gameData.location || !gameData.date || !gameData.time) {
      alert('Please fill in all required fields')
      return
    }

    // TODO: Submit game data to backend
    console.log('Creating game:', gameData)
    
    // For now, just navigate back to dashboard
    navigate('/dashboard')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Game</h1>
        <p className="text-gray-600">Organize a pickup game and invite players to join</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sport Selection */}
          <div>
            <label htmlFor="sport" className="block text-sm font-medium text-gray-700 mb-2">
              Sport *
            </label>
            <select
              id="sport"
              required
              value={gameData.sport}
              onChange={(e) => handleInputChange('sport', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">Select a sport</option>
              <option value="Basketball">Basketball</option>
              <option value="Soccer">Soccer</option>
              <option value="Tennis">Tennis</option>
              <option value="Baseball">Baseball</option>
              <option value="Volleyball">Volleyball</option>
              <option value="Football">Football</option>
              <option value="Hockey">Hockey</option>
              <option value="Golf">Golf</option>
              <option value="Swimming">Swimming</option>
              <option value="Running">Running</option>
            </select>
          </div>

          {/* Game Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Game Title
            </label>
            <input
              type="text"
              id="title"
              value={gameData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., Pickup Basketball, Sunday Soccer"
            />
          </div>

          {/* Location */}
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
                  required
                  value={gameData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter the game location"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Pick on Map</span>
              </button>
            </div>
            {gameData.latitude && gameData.longitude && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Location coordinates set ({gameData.latitude.toFixed(4)}, {gameData.longitude.toFixed(4)})
              </p>
            )}
          </div>

          {/* Date and Time */}
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
                  required
                  value={gameData.date}
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
                  required
                  value={gameData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Max Players and Skill Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-2">
                Max Players *
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  id="maxPlayers"
                  required
                  min="2"
                  max="50"
                  value={gameData.maxPlayers}
                  onChange={(e) => handleInputChange('maxPlayers', parseInt(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
            <div>
              <label htmlFor="skillLevel" className="block text-sm font-medium text-gray-700 mb-2">
                Skill Level
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="skillLevel"
                  value={gameData.skillLevel}
                  onChange={(e) => handleInputChange('skillLevel', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="any">Any Level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <div className="relative">
              <Info className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                id="description"
                rows={4}
                value={gameData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Add any additional details about the game..."
              />
            </div>
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isPrivate"
              checked={gameData.isPrivate}
              onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700">
              Make this a private game (invite only)
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Create Game
            </button>
            <Link
              to="/dashboard"
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
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

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          onCancel={() => setShowLocationPicker(false)}
          initialLocation={gameData.latitude && gameData.longitude ? {
            latitude: gameData.latitude,
            longitude: gameData.longitude
          } : undefined}
        />
      )}
    </div>
  )
}