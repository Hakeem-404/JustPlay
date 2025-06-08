import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  User, 
  MapPin, 
  Target, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
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
  { value: 'beginner', label: 'Beginner', description: 'New to the sport or just starting out' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience and comfortable with basics' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced player with strong skills' }
]

export default function ProfileSetup() {
  const { user } = useAuth()
  const { refreshProfile } = useProfile()
  const navigate = useNavigate()
  
  const [currentStep, setCurrentStep] = useState(1)
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

  const totalSteps = 4

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

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          setError('Please enter your name')
          return false
        }
        break
      case 2:
        if (!formData.location.trim()) {
          setError('Please enter your location')
          return false
        }
        break
      case 3:
        if (formData.preferred_sports.length === 0) {
          setError('Please select at least one sport')
          return false
        }
        break
      case 4:
        if (!formData.skill_level) {
          setError('Please select your skill level')
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

    setLoading(true)
    setError('')

    try {
      const { error } = await profileService.createProfile(
        user.id, 
        user.email || '', 
        formData as ProfileFormData
      )

      if (error) {
        setError('Failed to create profile. Please try again.')
        console.error('Profile creation error:', error)
      } else {
        setSuccess('Profile created successfully!')
        await refreshProfile()
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Profile setup error:', err)
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
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your name?</h2>
              <p className="text-gray-600">This is how other players will see you</p>
            </div>
            
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
                autoFocus
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Where are you located?</h2>
              <p className="text-gray-600">We'll help you find games nearby</p>
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="City, State or ZIP code"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                About You (Optional)
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Tell other players a bit about yourself..."
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-orange-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Target className="h-8 w-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What sports do you play?</h2>
              <p className="text-gray-600">Select all that apply - you can change this later</p>
            </div>
            
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
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your skill level?</h2>
              <p className="text-gray-600">This helps match you with appropriate games</p>
            </div>
            
            <div className="space-y-3">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => handleInputChange('skill_level', level.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    formData.skill_level === level.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-semibold ${
                        formData.skill_level === level.value ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        {level.label}
                      </h3>
                      <p className={`text-sm ${
                        formData.skill_level === level.value ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {level.description}
                      </p>
                    </div>
                    {formData.skill_level === level.value && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
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
                    <span>Complete Setup</span>
                    <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Skip for now (you can complete this later)
          </button>
        </div>
      </div>
    </div>
  )
}