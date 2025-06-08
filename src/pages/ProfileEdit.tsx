import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Target, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Save
} from 'lucide-react'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { profileService } from '../lib/profileService'
import { ProfileFormData } from '../types/profile'

const SPORTS_OPTIONS = [
  'Basketball',
  'Soccer', 
  'Tennis',
  'Baseball',
  'Volleyball',
  'Football',
  'Hockey',
  'Golf',
  'Swimming',
  'Running'
]

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
]

export default function ProfileEdit() {
  const { profile, refreshProfile } = useProfile()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    location: '',
    bio: '',
    skill_level: '',
    preferred_sports: []
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        location: profile.location,
        bio: profile.bio || '',
        skill_level: profile.skill_level,
        preferred_sports: profile.preferred_sports
      })
    }
  }, [profile])

  const handleInputChange = (field: keyof ProfileFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  const handleSportToggle = (sport: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_sports: prev.preferred_sports.includes(sport)
        ? prev.preferred_sports.filter(s => s !== sport)
        : [...prev.preferred_sports, sport]
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Name is required')
      return false
    }
    if (!formData.location.trim()) {
      setError('Location is required')
      return false
    }
    if (formData.preferred_sports.length === 0) {
      setError('Please select at least one sport')
      return false
    }
    if (!formData.skill_level) {
      setError('Please select your skill level')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !user) return

    setLoading(true)
    setError('')

    try {
      const { error } = await profileService.updateProfile(user.id, formData)

      if (error) {
        setError('Failed to update profile. Please try again.')
        console.error('Profile update error:', error)
      } else {
        setSuccess('Profile updated successfully!')
        await refreshProfile()
        setTimeout(() => {
          navigate('/profile')
        }, 1500)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Profile update error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/profile"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Profile</h1>
        <p className="text-gray-600">Update your information and preferences</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="City, State or ZIP code"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  About You
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Tell other players a bit about yourself..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sports Preferences */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-green-600" />
              Sports Preferences
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {SPORTS_OPTIONS.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => handleSportToggle(sport)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.preferred_sports.includes(sport)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{sport}</span>
                    {formData.preferred_sports.includes(sport) && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Skill Level */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-purple-600" />
              Skill Level
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => handleInputChange('skill_level', level.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    formData.skill_level === level.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{level.label}</div>
                  {formData.skill_level === level.value && (
                    <CheckCircle className="h-5 w-5 text-blue-600 mx-auto mt-2" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
            <Link
              to="/profile"
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}