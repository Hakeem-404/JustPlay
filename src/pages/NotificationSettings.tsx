import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Bell, 
  Mail, 
  BellOff, 
  MailOff, 
  Save, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Calendar,
  MessageCircle,
  UserPlus,
  Clock,
  Info
} from 'lucide-react'
import { useNotifications } from '../contexts/NotificationContext'
import { NotificationPreferences } from '../lib/notificationService'

export default function NotificationSettings() {
  const { preferences, loadingPreferences, updatePreferences, requestPushPermission } = useNotifications()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState<Partial<NotificationPreferences>>({
    emailEnabled: true,
    pushEnabled: true,
    gameInvitations: true,
    gameUpdates: true,
    chatMessages: true,
    friendRequests: true,
    gameReminders: true
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pushPermissionStatus, setPushPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default')
  
  // Update form data when preferences change
  useEffect(() => {
    if (preferences) {
      setFormData({
        emailEnabled: preferences.emailEnabled,
        pushEnabled: preferences.pushEnabled,
        gameInvitations: preferences.gameInvitations,
        gameUpdates: preferences.gameUpdates,
        chatMessages: preferences.chatMessages,
        friendRequests: preferences.friendRequests,
        gameReminders: preferences.gameReminders
      })
    }
  }, [preferences])
  
  // Check push notification permission status
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermissionStatus(Notification.permission as 'default' | 'granted' | 'denied')
    }
  }, [])
  
  const handleChange = (field: keyof NotificationPreferences, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      const { success } = await updatePreferences(formData)
      
      if (success) {
        setSuccess('Notification preferences updated successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to update notification preferences')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error updating notification preferences:', err)
    } finally {
      setSaving(false)
    }
  }
  
  const handleRequestPushPermission = async () => {
    const granted = await requestPushPermission()
    
    if (granted) {
      setPushPermissionStatus('granted')
      setFormData(prev => ({
        ...prev,
        pushEnabled: true
      }))
    } else {
      setPushPermissionStatus('denied')
    }
  }
  
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Settings</h1>
        <p className="text-gray-600">Manage how and when you receive notifications</p>
      </div>
      
      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {loadingPreferences ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading preferences...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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
            
            <div className="space-y-8">
              {/* Notification Channels */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.emailEnabled}
                        onChange={(e) => handleChange('emailEnabled', e.target.checked)}
                      />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-6 w-6 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">Push Notifications</p>
                        <p className="text-sm text-gray-600">Receive notifications in your browser</p>
                      </div>
                    </div>
                    {pushPermissionStatus === 'default' ? (
                      <button
                        type="button"
                        onClick={handleRequestPushPermission}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Enable Push Notifications
                      </button>
                    ) : pushPermissionStatus === 'denied' ? (
                      <div className="flex items-center space-x-2 text-red-600">
                        <BellOff className="h-5 w-5" />
                        <span className="text-sm font-medium">Blocked by browser</span>
                      </div>
                    ) : (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.pushEnabled}
                          onChange={(e) => handleChange('pushEnabled', e.target.checked)}
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Notification Types */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <p className="font-medium text-gray-900">Game Invitations</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.gameInvitations}
                        onChange={(e) => handleChange('gameInvitations', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Info className="h-5 w-5 text-green-600" />
                      <p className="font-medium text-gray-900">Game Updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.gameUpdates}
                        onChange={(e) => handleChange('gameUpdates', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="h-5 w-5 text-purple-600" />
                      <p className="font-medium text-gray-900">Chat Messages</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.chatMessages}
                        onChange={(e) => handleChange('chatMessages', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                      <p className="font-medium text-gray-900">Friend Requests</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.friendRequests}
                        onChange={(e) => handleChange('friendRequests', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <p className="font-medium text-gray-900">Game Reminders</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.gameReminders}
                        onChange={(e) => handleChange('gameReminders', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Browser Notification Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  About Browser Notifications
                </h3>
                <p className="text-sm text-blue-700 mb-2">
                  Browser notifications allow you to receive alerts even when you're not actively using JustPlay.
                </p>
                <p className="text-sm text-blue-700">
                  {pushPermissionStatus === 'granted' ? (
                    'You have enabled browser notifications. You can disable them in your browser settings.'
                  ) : pushPermissionStatus === 'denied' ? (
                    'You have blocked browser notifications. To enable them, you need to change your browser settings.'
                  ) : (
                    'Click the "Enable Push Notifications" button above to start receiving browser notifications.'
                  )}
                </p>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
              <Link
                to="/dashboard"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}