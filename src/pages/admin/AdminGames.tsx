import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { adminService } from '../../lib/adminService';
import AdminLayout from './components/AdminLayout';
import { Game } from '../../types/game';

interface AdminGame extends Game {
  reportCount?: number;
  status: 'active' | 'cancelled' | 'completed';
}

export default function AdminGames() {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState<AdminGame | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalGames, setTotalGames] = useState(0);
  
  const gamesPerPage = 10;

  useEffect(() => {
    loadGames();
  }, [currentPage, statusFilter]);

  const loadGames = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, total, error } = await adminService.getGames(
        searchQuery,
        statusFilter,
        currentPage,
        gamesPerPage
      );
      
      if (error) {
        setError(error);
        return;
      }
      
      setGames(data || []);
      setTotalGames(total);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadGames();
  };

  const handleGameAction = async (gameId: string, action: 'cancel' | 'complete' | 'delete') => {
    setActionLoading(true);
    
    try {
      const { success, error } = await adminService.updateGameStatus(gameId, action);
      
      if (error) {
        setError(error);
        return;
      }
      
      if (success) {
        if (action === 'delete') {
          // Remove game from list
          setGames(games.filter(game => game.id !== gameId));
          if (showGameModal) {
            setShowGameModal(false);
          }
        } else {
          // Update game status
          const newStatus = action === 'cancel' ? 'cancelled' : 'completed';
          
          const updatedGames = games.map(game => {
            if (game.id === gameId) {
              return { ...game, status: newStatus as any };
            }
            return game;
          });
          
          setGames(updatedGames);
          
          // If a game is selected in the modal, update that too
          if (selectedGame && selectedGame.id === gameId) {
            const updatedGame = updatedGames.find(g => g.id === gameId);
            if (updatedGame) {
              setSelectedGame(updatedGame);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error performing game action:', err);
      setError('Failed to update game');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Active
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Cancelled
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout currentPage="games">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Game Management</h1>
              <p className="text-gray-600">
                {totalGames} game{totalGames !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={loadGames}
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
                placeholder="Search games by title, sport, location, or organizer..."
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
                <option value="all">All Games</option>
                <option value="active">Active Games</option>
                <option value="cancelled">Cancelled Games</option>
                <option value="completed">Completed Games</option>
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

        {/* Games Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading games...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">{error}</p>
              <button
                onClick={loadGames}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : games.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No games found</p>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {games.map((game) => (
                    <tr key={game.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {game.title || game.sport}
                            {game.reportCount && game.reportCount > 0 && (
                              <span className="ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                {game.reportCount} report{game.reportCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{game.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(game.date)}</div>
                        <div className="text-sm text-gray-500">{game.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {game.currentPlayers}/{game.maxPlayers}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{game.organizerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(game.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedGame(game);
                            setShowGameModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </button>
                        {game.status === 'active' ? (
                          <button
                            onClick={() => handleGameAction(game.id, 'cancel')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGameAction(game.id, 'delete')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
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
        {!loading && !error && games.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * gamesPerPage + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * gamesPerPage, totalGames)}</span> of{' '}
              <span className="font-medium">{totalGames}</span> games
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
                disabled={currentPage * gamesPerPage >= totalGames}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game Detail Modal */}
      {showGameModal && selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Game Details</h2>
                <button
                  onClick={() => setShowGameModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedGame.title || selectedGame.sport}
                </h3>
                <div className="flex items-center space-x-4 mb-2">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{selectedGame.location}</span>
                  </div>
                  {getStatusBadge(selectedGame.status)}
                </div>
                {selectedGame.description && (
                  <p className="text-gray-700 mb-4">{selectedGame.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Date & Time</div>
                  <div className="font-medium">{formatDate(selectedGame.date)} at {selectedGame.time}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Players</div>
                  <div className="font-medium">{selectedGame.currentPlayers}/{selectedGame.maxPlayers}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Skill Level</div>
                  <div className="font-medium capitalize">{selectedGame.skillLevel}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Privacy</div>
                  <div className="font-medium">{selectedGame.isPrivate ? 'Private' : 'Public'}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Organizer</div>
                  <div className="font-medium">{selectedGame.organizerName}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Created</div>
                  <div className="font-medium">{formatDate(selectedGame.createdAt)}</div>
                </div>
              </div>
              
              {selectedGame.reportCount && selectedGame.reportCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800 mb-1">Game has been reported</h4>
                      <p className="text-sm text-red-700">
                        This game has received {selectedGame.reportCount} report{selectedGame.reportCount !== 1 ? 's' : ''}.
                        Please review and take appropriate action.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Actions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedGame.status === 'active' ? (
                    <>
                      <button
                        onClick={() => handleGameAction(selectedGame.id, 'cancel')}
                        disabled={actionLoading}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            <span>Cancel Game</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleGameAction(selectedGame.id, 'complete')}
                        disabled={actionLoading}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Mark as Completed</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleGameAction(selectedGame.id, 'delete')}
                      disabled={actionLoading}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Game</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Participants</h4>
                <div className="text-center text-gray-500 py-4">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Participant list would be displayed here</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowGameModal(false)}
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