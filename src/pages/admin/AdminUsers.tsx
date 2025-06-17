import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  User,
  Shield,
  AlertTriangle,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw,
  MapPin,
  Activity
} from 'lucide-react';
import { adminService } from '../../lib/adminService';
import AdminLayout from './components/AdminLayout';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  
  const usersPerPage = 10;

  useEffect(() => {
    loadUsers();
  }, [currentPage, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, total, error } = await adminService.getUsers(
        searchQuery,
        statusFilter,
        currentPage,
        usersPerPage
      );
      
      if (error) {
        setError(error);
        return;
      }
      
      setUsers(data || []);
      setFilteredUsers(data || []);
      setTotalUsers(total);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers();
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'unsuspend' | 'ban' | 'unban') => {
    setActionLoading(true);
    
    try {
      const { success, error } = await adminService.updateUserStatus(userId, action);
      
      if (error) {
        setError(error);
        return;
      }
      
      if (success) {
        // Reload users to reflect changes
        await loadUsers();
        
        // If a user is selected in the modal, update that too
        if (selectedUser && selectedUser.id === userId) {
          const updatedUser = users.find(u => u.id === userId);
          if (updatedUser) {
            setSelectedUser(updatedUser);
          }
        }
      }
    } catch (err) {
      console.error('Error performing user action:', err);
      setError('Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <AdminLayout currentPage="users">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
              <p className="text-gray-600">
                {totalUsers} user{totalUsers !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={loadUsers}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search users by name, email, or location..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Status Filter */}
            <div className="w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value="active">Active Users</option>
                <option value="suspended">Suspended Users</option>
                <option value="banned">Banned Users</option>
              </select>
            </div>
            
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">{error}</p>
              <button
                onClick={loadUsers}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No users found</p>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Games</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(user.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.games_played} played / {user.games_organized} organized
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <svg className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                          <span className="ml-1 text-sm text-gray-900">{user.average_rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' :
                          user.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleUserAction(user.id, 'suspend')}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Suspend
                          </button>
                        ) : user.status === 'suspended' ? (
                          <button
                            onClick={() => handleUserAction(user.id, 'unsuspend')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(user.id, 'unban')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Unban
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && filteredUsers.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * usersPerPage + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * usersPerPage, totalUsers)}</span> of{' '}
              <span className="font-medium">{totalUsers}</span> users
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage * usersPerPage >= totalUsers}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">User Details</h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h3>
                  <p className="text-gray-600">{selectedUser.email}</p>
                  <div className="flex items-center mt-1">
                    <MapPin className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-600">{selectedUser.location}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Member Since</div>
                  <div className="font-medium">{formatDate(selectedUser.created_at)}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Status</div>
                  <div className={`font-medium ${
                    selectedUser.status === 'active' ? 'text-green-600' :
                    selectedUser.status === 'suspended' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Games Played</div>
                  <div className="font-medium">{selectedUser.games_played}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Games Organized</div>
                  <div className="font-medium">{selectedUser.games_organized}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Average Rating</div>
                  <div className="font-medium flex items-center">
                    <svg className="h-4 w-4 text-yellow-400 fill-current mr-1" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    {selectedUser.average_rating.toFixed(1)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">User ID</div>
                  <div className="font-mono text-xs overflow-x-auto">{selectedUser.id}</div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Actions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedUser.status === 'active' ? (
                    <>
                      <button
                        onClick={() => handleUserAction(selectedUser.id, 'suspend')}
                        disabled={actionLoading}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4" />
                            <span>Suspend User</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleUserAction(selectedUser.id, 'ban')}
                        disabled={actionLoading}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <Ban className="h-4 w-4" />
                        <span>Ban User</span>
                      </button>
                    </>
                  ) : selectedUser.status === 'suspended' ? (
                    <button
                      onClick={() => handleUserAction(selectedUser.id, 'unsuspend')}
                      disabled={actionLoading}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Unsuspend User</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserAction(selectedUser.id, 'unban')}
                      disabled={actionLoading}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Unban User</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Recent Activity</h4>
                <div className="text-center text-gray-500 py-4">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>User activity would be displayed here</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}