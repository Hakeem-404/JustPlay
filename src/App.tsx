import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ProfileSetupGuard from './components/ProfileSetupGuard'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreateGame from './pages/CreateGame'
import ProfileSetup from './pages/ProfileSetup'
import Profile from './pages/Profile'
import ProfileEdit from './pages/ProfileEdit'
import UserProfile from './pages/UserProfile'
import Friends from './pages/Friends'
import Messages from './pages/Messages'

function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <Router>
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
                            <Dashboard />
                          </ProfileSetupGuard>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/create-game" 
                      element={
                        <ProtectedRoute>
                          <ProfileSetupGuard>
                            <CreateGame />
                          </ProfileSetupGuard>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile" 
                      element={
                        <ProtectedRoute>
                          <ProfileSetupGuard>
                            <Profile />
                          </ProfileSetupGuard>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile/edit" 
                      element={
                        <ProtectedRoute>
                          <ProfileSetupGuard>
                            <ProfileEdit />
                          </ProfileSetupGuard>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile/:userId" 
                      element={
                        <ProtectedRoute>
                          <ProfileSetupGuard>
                            <UserProfile />
                          </ProfileSetupGuard>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/friends" 
                      element={
                        <ProtectedRoute>
                          <ProfileSetupGuard>
                            <Friends />
                          </ProfileSetupGuard>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/messages" 
                      element={
                        <ProtectedRoute>
                          <ProfileSetupGuard>
                            <Messages />
                          </ProfileSetupGuard>
                        </ProtectedRoute>
                      } 
                    />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </Router>
      </ProfileProvider>
    </AuthProvider>
  )
}

export default App