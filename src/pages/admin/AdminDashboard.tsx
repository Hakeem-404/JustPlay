import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  BarChart2, 
  Activity, 
  TrendingUp, 
  Map, 
  Award, 
  Clock, 
  AlertTriangle,
  User,
  LogOut,
  Settings,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { adminService } from '../../lib/adminService';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './components/AdminLayout';

// Admin dashboard stats interface
interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalGames: number;
  activeGames: number;
  completedGames: number;
  cancelledGames: number;
  averagePlayersPerGame: number;
  topSports: { sport: string; count: number }[];
  topLocations: { location: string; count: number }[];
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadDashboardStats();
  }, []);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const isAdminUser = await adminService.checkAdminStatus(user.id);
      setIsAdmin(isAdminUser);
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    }
  };

  const loadDashboardStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await adminService.getDashboardStats();
      
      if (error) {
        setError(error);
        return;
      }
      
      setStats(data);
    } catch (err) {
      console.error('Error loading admin stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the admin dashboard. Please contact an administrator if you believe this is an error.
          </p>
          <Link
            to="/dashboard"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout currentPage="dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage users, games, and view platform statistics</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button
              onClick={loadDashboardStats}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            // Loading skeletons
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-5 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))
          ) : stats ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Total Users</h3>
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex items-end space-x-2">
                  <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-sm text-green-600 font-medium">
                    +{stats.newUsers} this week
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Active Games</h3>
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex items-end space-x-2">
                  <p className="text-3xl font-bold text-gray-900">{stats.activeGames.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 font-medium">
                    of {stats.totalGames.toLocaleString()} total
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Completion Rate</h3>
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex items-end space-x-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {((stats.completedGames / (stats.completedGames + stats.cancelledGames)) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 font-medium">
                    {stats.completedGames.toLocaleString()} completed
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Avg. Players</h3>
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex items-end space-x-2">
                  <p className="text-3xl font-bold text-gray-900">{stats.averagePlayersPerGame}</p>
                  <p className="text-sm text-gray-600 font-medium">
                    per game
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* User Activity Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg">Daily</button>
                  <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Weekly</button>
                  <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Monthly</button>
                </div>
              </div>
              {loading ? (
                <div className="h-64 animate-pulse bg-gray-200 rounded-lg"></div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <BarChart2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Activity chart visualization would appear here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <Link to="/admin/reports" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </Link>
              </div>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                        {i % 3 === 0 ? <User className="h-5 w-5" /> : 
                         i % 3 === 1 ? <Calendar className="h-5 w-5" /> : 
                         <AlertTriangle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {i % 3 === 0 ? 'New user registered' : 
                           i % 3 === 1 ? 'Game created' : 
                           'Game cancelled'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {i % 3 === 0 ? 'John Smith created an account' : 
                           i % 3 === 1 ? 'Basketball game created by Sarah Johnson' : 
                           'Soccer game cancelled by Mike Williams'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {i === 0 ? '2 minutes ago' : 
                           i === 1 ? '15 minutes ago' : 
                           i === 2 ? '1 hour ago' : 
                           i === 3 ? '3 hours ago' : 
                           '1 day ago'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link
                  to="/admin/users"
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Manage Users</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
                <Link
                  to="/admin/games"
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900">Manage Games</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
                <Link
                  to="/admin/reports"
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <BarChart2 className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-gray-900">View Reports</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <LogOut className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Exit Admin Mode</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Top Sports */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Sports</h3>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="w-32 h-2 bg-gray-200 rounded-full"></div>
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <div className="space-y-3">
                  {stats.topSports.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{item.sport}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full" 
                            style={{ width: `${(item.count / stats.topSports[0].count) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Top Locations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h3>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="w-32 h-2 bg-gray-200 rounded-full"></div>
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <div className="space-y-3">
                  {stats.topLocations.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{item.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-600 rounded-full" 
                            style={{ width: `${(item.count / stats.topLocations[0].count) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}