import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Play, 
  Menu, 
  X, 
  User,
  LogOut, 
  Settings, 
  Users, 
  MessageCircle,
  Bell,
  Crown,
  Trophy,
  MapPin,
  Shield
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import NotificationCenter from './notifications/NotificationCenter'
import NotificationBadge from './notifications/NotificationBadge'
import OfflineBanner from './OfflineBanner'
import Footer from './Footer'
import { adminService } from '../lib/adminService'
import BoltBadge from './BoltBadge'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const isAdminUser = await adminService.checkAdminStatus(user.id)
          setIsAdmin(isAdminUser)
        } catch (err) {
          console.error('Error checking admin status:', err)
          setIsAdmin(false)
        }
      }
    }
    
    checkAdminStatus()
  }, [user])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  // Track scroll position for header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const getUserInitials = (name: string) => {
    if (!name) return 'U'
    const names = name.split(' ')
    return names.length > 1 
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0][0].toUpperCase()
  }

  const navigation = [
    { name: 'Find Games', href: '/dashboard', icon: MapPin },
    { name: 'Friends', href: '/friends', icon: Users },
    { name: 'Messages', href: '/messages', icon: MessageCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fixed Header */}
      <header className={`bg-white border-b border-gray-200 sticky top-0 z-50 transition-shadow ${isScrolled ? 'shadow-md' : 'shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Play className="h-6 w-6 text-white" fill="white" />
              </div>
              <span className="font-bold text-xl text-gray-900">JustPlay</span>
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:flex items-center space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
                
                {/* Admin Link (only for admins) */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                )}
              </nav>
            )}

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  {/* Notifications */}
                  <NotificationCenter />

                  {/* User Menu */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {profile ? getUserInitials(profile.name) : 'U'}
                      </div>
                      <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {profile?.location || 'Location'}
                        </p>
                      </div>
                    </button>

                    {/* FIXED: User Dropdown with proper z-index */}
                    {isUserMenuOpen && (
                      <>
                        {/* Backdrop overlay to handle clicks outside */}
                        <div
                          className="fixed inset-0 z-[999999]"
                          onClick={() => setIsUserMenuOpen(false)}
                        />
                        
                        {/* Dropdown menu with highest z-index */}
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[10001]">
                          {/* Profile Section */}
                          <div className="px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                                {profile ? getUserInitials(profile.name) : 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {profile?.name || 'User Name'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="py-1">
                            <Link
                              to="/profile"
                              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <User className="h-4 w-4" />
                              <span>Your Profile</span>
                            </Link>

                            <Link
                              to="/profile/edit"
                              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Settings className="h-4 w-4" />
                              <span>Edit Profile</span>
                            </Link>

                            <Link
                              to="/friends"
                              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Users className="h-4 w-4" />
                              <span>Friends</span>
                            </Link>

                            <Link
                              to="/messages"
                              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>Messages</span>
                            </Link>
                            
                            <Link
                              to="/notifications"
                              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Bell className="h-4 w-4" />
                              <span>Notification Settings</span>
                            </Link>
                            
                            {/* Admin Dashboard Link (only for admins) */}
                            {isAdmin && (
                              <Link
                                to="/admin"
                                className="flex items-center space-x-3 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                <Shield className="h-4 w-4" />
                                <span>Admin Dashboard</span>
                              </Link>
                            )}
                          </div>

                          {/* Stats Section (Optional) */}
                          {profile && (
                            <div className="border-t border-gray-200 px-4 py-3">
                              <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                  <p className="text-lg font-semibold text-blue-600">
                                    {profile.games_organized || 0}
                                  </p>
                                  <p className="text-xs text-gray-500">Organized</p>
                                </div>
                                <div>
                                  <p className="text-lg font-semibold text-green-600">
                                    {profile.games_played || 0}
                                  </p>
                                  <p className="text-xs text-gray-500">Played</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Sign Out */}
                          <div className="border-t border-gray-200 py-1">
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false)
                                handleSignOut()
                              }}
                              className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <LogOut className="h-4 w-4" />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Mobile menu button */}
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                  >
                    {isMenuOpen ? (
                      <X className="h-6 w-6" />
                    ) : (
                      <Menu className="h-6 w-6" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FIXED: Mobile Navigation with proper z-index */}
        {isMenuOpen && user && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-25 z-[9999] md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Mobile menu */}
            <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-[10000]">
              <div className="px-4 py-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="relative">
                        <Icon className="h-5 w-5" />
                        {item.name === 'Messages' && <NotificationBadge className="absolute -top-1 -right-1" />}
                      </div>
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
                
                {/* Admin Link (only for admins) */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Shield className="h-5 w-5" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}

                {/* Mobile profile quick access */}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    <span>Your Profile</span>
                  </Link>
                  
                  <Link
                    to="/notifications"
                    className="flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors relative"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="relative">
                      <Bell className="h-5 w-5" />
                      <NotificationBadge className="absolute -top-1 -right-1" />
                    </div>
                    <span>Notifications</span>
                  </Link>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      handleSignOut()
                    }}
                    className="flex items-center space-x-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <Footer />

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Bolt Badge */}
      <BoltBadge />
    </div>
  )
}