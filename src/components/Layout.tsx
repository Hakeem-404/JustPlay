import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Play, Menu, X, User, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut, loading } = useAuth()
  const { profile } = useProfile()

  const isActive = (path: string) => location.pathname === path

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
      setIsUserMenuOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getUserDisplayName = () => {
    if (profile?.name) return profile.name
    if (!user) return ''
    return user.email?.split('@')[0] || 'User'
  }

  const getUserInitials = () => {
    if (profile?.name) {
      const names = profile.name.split(' ')
      return names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase()
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
                <Play className="h-5 w-5 text-white" fill="white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">JustPlay</h1>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-8">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/') 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  Home
                </Link>
                
                {user && (
                  <>
                    <Link
                      to="/dashboard"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive('/dashboard') 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/create-game"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive('/create-game') 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                    >
                      Create Game
                    </Link>
                  </>
                )}

                {/* User Menu or Login Button */}
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {getUserInitials()}
                      </div>
                      <span className="max-w-32 truncate">{getUserDisplayName()}</span>
                    </button>

                    {/* User Dropdown */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900 truncate">{getUserDisplayName()}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <User className="h-4 w-4" />
                          <span>View Profile</span>
                        </Link>
                        <Link
                          to="/profile/edit"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Edit Profile</span>
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <User className="h-4 w-4" />
                    <span>Login</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <Link
                  to="/"
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive('/') 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                
                {user && (
                  <>
                    <Link
                      to="/dashboard"
                      className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive('/dashboard') 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/create-game"
                      className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive('/create-game') 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Create Game
                    </Link>
                    
                    {/* Mobile User Info */}
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="px-3 py-2 flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                          {getUserInitials()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <Link
                        to="/profile"
                        className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        View Profile
                      </Link>
                      <Link
                        to="/profile/edit"
                        className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Edit Profile
                      </Link>
                      <button
                        onClick={() => {
                          handleSignOut()
                          setIsMenuOpen(false)
                        }}
                        className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}

                {!user && (
                  <Link
                    to="/login"
                    className="block bg-blue-600 text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Click outside to close user menu */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}