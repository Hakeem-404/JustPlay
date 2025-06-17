import React, { useState, useEffect } from 'react'
import { X, Bell, Mail, BellOff, MailOff, Loader2, Save, CheckCircle, AlertCircle } from 'lucide-react'
import { useNotifications } from '../../contexts/NotificationContext'
import { NotificationPreferences } from '../../lib/notificationService'

interface NotificationPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationPreferencesModal({ isOpen, onClose }: NotificationPreferencesModalProps) {
  const { preferences, loadingPreferences, updatePreferences, requestPushPermission } = useNotifications()
  
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
  }, [isOpen])
  
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
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative z-[10003]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        {loadingPreferences ? (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading preferences...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Error/Success Messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}
              
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-green-700 text-sm">{success}</span>
                </div>
              )}
              
              {/* Notification Channels */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Notification Channels</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-xs text-gray-500">Receive notifications via email</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.emailEnabled}
                        onChange={(e) => handleChange('emailEnabled', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">Push Notifications</p>
                        <p className="text-xs text-gray-500">Receive notifications in your browser</p>
                      </div>
                    </div>
                    {pushPermissionStatus === 'default' ? (
                      <button
                        type="button"
                        onClick={handleRequestPushPermission}
                        className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Enable
                      </button>
                    ) : pushPermissionStatus === 'denied' ? (
                      <span className="text-xs text-red-600">Blocked by browser</span>
                    ) : (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.pushEnabled}
                          onChange={(e) => handleChange('pushEnabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Notification Types */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Notification Types</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="gameInvitations" className="text-gray-900">Game Invitations</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="gameInvitations"
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.gameInvitations}
                        onChange={(e) => handleChange('gameInvitations', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label htmlFor="gameUpdates" className="text-gray-900">Game Updates</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="gameUpdates"
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.gameUpdates}
                        onChange={(e) => handleChange('gameUpdates', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label htmlFor="chatMessages" className="text-gray-900">Chat Messages</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="chatMessages"
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.chatMessages}
                        onChange={(e) => handleChange('chatMessages', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label htmlFor="friendRequests" className="text-gray-900">Friend Requests</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="friendRequests"
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.friendRequests}
                        onChange={(e) => handleChange('friendRequests', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label htmlFor="gameReminders" className="text-gray-900">Game Reminders</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="gameReminders"
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
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
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