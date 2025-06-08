import React, { createContext, useContext, useEffect, useState } from 'react'
import { Profile } from '../types/profile'
import { profileService } from '../lib/profileService'
import { useAuth } from './AuthContext'

interface ProfileContextType {
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  needsProfileSetup: boolean
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

interface ProfileProviderProps {
  children: React.ReactNode
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const profileData = await profileService.getProfile(user.id)
      setProfile(profileData)
    } catch (error) {
      console.error('Error loading profile:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshProfile()
  }, [user])

  const needsProfileSetup = user && (!profile || !profile.profile_completed)

  const value = {
    profile,
    loading,
    refreshProfile,
    needsProfileSetup: !!needsProfileSetup
  }

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}