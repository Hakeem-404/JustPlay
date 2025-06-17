import React, { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import { NotificationProvider } from './contexts/NotificationContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ProfileSetupGuard from './components/ProfileSetupGuard'
import { GameCardSkeleton, ProfileSkeleton } from './components/SkeletonLoader'

// Lazy-loaded components
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CreateGame = lazy(() => import('./pages/CreateGame'))
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'))
const Profile = lazy(() => import('./pages/Profile'))
const ProfileEdit = lazy(() => import('./pages/ProfileEdit'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const Friends = lazy(() => import('./pages/Friends'))
const Messages = lazy(() => import('./pages/Messages'))
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminGames = lazy(() => import('./pages/admin/AdminGames'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))

function App() {
  // Request notification permission on app load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // We'll request permission when user interacts with the site
      const requestPermission = () => {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission)
        })
        
        // Remove event listeners after first interaction
        document.removeEventListener('click', requestPermission)
        document.removeEventListener('keydown', requestPermission)
      }
      
      document.addEventListener('click', requestPermission)
      document.addEventListener('keydown', requestPermission)
      
      return () => {
        document.removeEventListener('click', requestPermission)
        document.removeEventListener('keydown', requestPermission)
      }
    }
  }, [])

  // Register for push notifications if supported
  useEffect(() => {
    const registerPush = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready
          
          // Check if already subscribed
          const subscription = await registration.pushManager.getSubscription()
          if (!subscription) {
            console.log('No push subscription found')
          }
        } catch (error) {
          console.error('Error setting up push notifications:', error)
        }
      }
    }
    
    registerPush()
  }, [])

  // Loading fallbacks for different page types
  const DashboardFallback = () => (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )

  const ProfileFallback = () => (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <ProfileSkeleton />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-xl shadow-sm border border-gray-200 animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  )

  const SimpleFallback = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <AuthProvider>
      <ProfileProvider>
        <NotificationProvider>
          <Router>
            <Suspense fallback={<SimpleFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/profile/setup" element={
                  <ProtectedRoute>
                    <ProfileSetup />
                  </ProtectedRoute>
                } />
                <Route
                  path="/*"
                  element={
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route 
                          path="/dashboard" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<DashboardFallback />}>
                                  <Dashboard />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/create-game" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<SimpleFallback />}>
                                  <CreateGame />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/profile" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<ProfileFallback />}>
                                  <Profile />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/profile/edit" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<SimpleFallback />}>
                                  <ProfileEdit />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/profile/:userId" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<ProfileFallback />}>
                                  <UserProfile />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/friends" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<SimpleFallback />}>
                                  <Friends />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/messages" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<SimpleFallback />}>
                                  <Messages />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/notifications" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<SimpleFallback />}>
                                  <NotificationSettings />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        {/* Admin Routes */}
                        <Route 
                          path="/admin" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<SimpleFallback />}>
                                  <AdminDashboard />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/users" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<SimpleFallback />}>
                                  <AdminUsers />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/games" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<SimpleFallback />}>
                                  <AdminGames />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/reports" 
                          element={
                            <ProtectedRoute>
                              <ProfileSetupGuard>
                                <Suspense fallback={<SimpleFallback />}>
                                  <AdminReports />
                                </Suspense>
                              </ProfileSetupGuard>
                            </ProtectedRoute>
                          } 
                        />
                      </Routes>
                    </Layout>
                  }
                />
              </Routes>
            </Suspense>
          </Router>
        </NotificationProvider>
      </ProfileProvider>
    </AuthProvider>
  )
}

export default App