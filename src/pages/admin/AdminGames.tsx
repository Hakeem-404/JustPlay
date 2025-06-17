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
import { supabase } from '../../lib/supabase';
import { Game } from '../../types/game';

interface AdminGame extends Game {
  reportCount?: number;
  status: 'active' | 'cancelled' | 'completed';
}

export default function AdminGames() {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [filteredGames, setFilteredGames] = useState<AdminGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState<AdminGame | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const gamesPerPage = 10;

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    filterGames();
  }, [searchQuery, statusFilter, games]);

  const loadGames = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would be a database query
      // For demo purposes, we're using mock data
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock games
      const mockGames: AdminGame[] = Array.from({ length: 50 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(Math.random() * 14) - 7); // -7 to +7 days
        
        const sports = ['Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Baseball'];
        const sport = sports[Math.floor(Math.random() * sports.length)];
        
        const locations = ['Central Park', 'Riverside Park', 'Brooklyn Bridge Park', 'Prospect Park', 'Battery Park'];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        const maxPlayers = Math.floor(Math.random() * 15) + 5; // 5 to 20
        const currentPlayers = Math.floor(Math.random() * (maxPlayers + 1)); // 0 to maxPlayers
        
        const statuses: ('active' | 'cancelled' | 'completed')[] = ['active', 'cancelled', 'completed'];
        const statusWeights = [0.6, 0.2, 0.2]; // 60% active, 20% cancelled, 20% completed
        const randomValue = Math.random();
        let statusIndex = 0;
        let cumulativeWeight = 0;
        
        for (let j = 0; j < statuses.length; j++) {
          cumulativeWeight += statusWeights[j];
          if (randomValue <= cumulativeWeight) {
            statusIndex = j;
            break;
          }
        }
        
        const status = statuses[statusIndex];
        
        return {
          id: `game-${i + 1}`,
          sport,
          title: `${sport} Game ${i + 1}`,
          location,
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.006 + (Math.random() - 0.5) * 0.1,
          date: date.toISOString().split('T')[0],
          time: `${Math.floor(Math.random() * 12) + 8}:00`,
          maxPlayers,
          currentPlayers,
          skillLevel: ['beginner', 'intermediate', 'advanced', 'any'][Math.floor(Math.random() * 4)] as any,
          description: `This is a ${sport} game at ${location}.`,
          organizerId: `user-${Math.floor(Math.random() * 20) + 1}`,
          organizerName: `Organizer ${Math.floor(Math.random() * 20) + 1}`,
          isPrivate: Math.random() > 0.8,
          status,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          reportCount: Math.random() > 0.8 ? Math.floor(Math.random() * 5) + 1 : 0
        };
      });
      
      setGames(mockGames);
      setFilteredGames(mockGames);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const filterGames = () => {
    let filtered = [...games];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(game => 
        game.title?.toLowerCase().includes(query) || 
        game.sport.toLowerCase().includes(query) ||
        game.location.toLowerCase().includes(query) ||
        game.organizerName.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(game => game.status === statusFilter);
    }
    
    setFilteredGames(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleGameAction = async (gameId: string, action: 'cancel' | 'complete' | 'delete') => {
    setActionLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      
      // Success message would go here
    } catch (err) {
      console.error('Error performing game action:', err);
      // Error message would go here
    } finally {
      setActionLoading(false);
    }
  };

  // Pagination
  const indexOfLastGame = currentPage * gamesPerPage;
  const indexOfFirstGame = indexOfLastGame - gamesPerPage;
  const currentGames = filteredGames.slice(indexOfFirstGame, indexOfLastGame);
  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Game Management</h1>
              <p className="text-gray-600">
                {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
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
          ) : filteredGames.length === 0 ? (
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
                  {currentGames.map((game) => (
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
        {!loading && !error && filteredGames.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{indexOfFirstGame + 1}</span> to{' '}
              <span className="font-medium">{Math.min(indexOfLastGame, filteredGames.length)}</span> of{' '}
              <span className="font-medium">{filteredGames.length}</span> games
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
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
    </div>
  );
}