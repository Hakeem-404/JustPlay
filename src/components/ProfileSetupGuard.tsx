import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'

interface ProfileSetupGuardProps {
  children: React.ReactNode
}

export default function ProfileSetupGuard({ children }: ProfileSetupGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, needsProfileSetup } = useProfile()
  const location = useLocation()

  // Don't redirect if we're already on the profile setup page
  if (location.pathname === '/profile/setup') {
    return <>{children}</>
  }
  
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  

  if (user && needsProfileSetup) {
    return <Navigate to="/profile/setup" replace />
  }

  return <>{children}</>
}