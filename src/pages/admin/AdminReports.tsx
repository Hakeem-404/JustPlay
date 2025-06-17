import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  ArrowLeft,
  Download,
  Calendar,
  Users,
  MapPin,
  Activity,
  TrendingUp,
  RefreshCw,
  Filter,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { adminService } from '../../lib/adminService';
import AdminLayout from './components/AdminLayout';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
  }[];
}

export default function AdminReports() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false);
  
  // Report data
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    loadReportData();
  }, [timeRange]);

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await adminService.getReportData(timeRange);
      
      if (error) {
        setError(error);
        return;
      }
      
      setReportData(data);
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (type: 'users' | 'games' | 'activity') => {
    try {
      const { url, error } = await adminService.exportData(type);
      
      if (error) {
        setError(error);
        return;
      }
      
      if (url) {
        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `justplay_${type}_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data');
    }
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last Year';
      default: return 'Last 30 Days';
    }
  };

  return (
    <AdminLayout currentPage="reports">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Reports</h1>
              <p className="text-gray-600">
                View platform statistics and generate reports
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <button
                  onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Time Range: {getTimeRangeLabel()}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showTimeRangeDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        setTimeRange('7d');
                        setShowTimeRangeDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Last 7 Days
                    </button>
                    <button
                      onClick={() => {
                        setTimeRange('30d');
                        setShowTimeRangeDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Last 30 Days
                    </button>
                    <button
                      onClick={() => {
                        setTimeRange('90d');
                        setShowTimeRangeDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Last 90 Days
                    </button>
                    <button
                      onClick={() => {
                        setTimeRange('1y');
                        setShowTimeRangeDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Last Year
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleExportData('users')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Time Range Selector (Mobile) */}
        <div className="sm:hidden mb-6">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadReportData}
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-40 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : reportData ? (
          <>
            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* User Activity Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
                  </div>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <BarChart2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>User activity chart visualization would appear here</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {reportData.userActivity.total} active users in selected period
                    </p>
                  </div>
                </div>
              </div>

              {/* Game Creation Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Game Creation</h3>
                  </div>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <BarChart2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Game creation chart visualization would appear here</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {reportData.games.total} games created in selected period
                    </p>
                  </div>
                </div>
              </div>

              {/* Sport Popularity Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Sport Popularity</h3>
                  </div>
                </div>
                <div className="h-64 flex flex-col justify-between">
                  <div className="space-y-3">
                    {Object.entries(reportData.sports)
                      .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                      .slice(0, 5)
                      .map(([sport, count]: [string, any], index) => (
                        <div key={sport} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{sport}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-600 rounded-full" 
                                style={{ 
                                  width: `${(count / Object.entries(reportData.sports)[0][1]) * 100}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{count}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  <p className="text-sm text-gray-400 text-center mt-4">
                    Top sport: {Object.entries(reportData.sports)[0]?.[0]} with {Object.entries(reportData.sports)[0]?.[1]} games
                  </p>
                </div>
              </div>

              {/* Location Popularity Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-pink-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Popular Locations</h3>
                  </div>
                </div>
                <div className="h-64 flex flex-col justify-between">
                  <div className="space-y-3">
                    {Object.entries(reportData.locations)
                      .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                      .slice(0, 5)
                      .map(([location, count]: [string, any], index) => (
                        <div key={location} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{location}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-pink-600 rounded-full" 
                                style={{ 
                                  width: `${(count / Object.entries(reportData.locations)[0][1]) * 100}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{count}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  <p className="text-sm text-gray-400 text-center mt-4">
                    Top location: {Object.entries(reportData.locations)[0]?.[0]} with {Object.entries(reportData.locations)[0]?.[1]} games
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Key Metrics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-700 font-medium">User Retention</div>
                      <div className="text-2xl font-bold text-blue-900">76%</div>
                    </div>
                  </div>
                  <div className="text-xs text-blue-700">
                    +5% from previous period
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm text-green-700 font-medium">Game Completion</div>
                      <div className="text-2xl font-bold text-green-900">92%</div>
                    </div>
                  </div>
                  <div className="text-xs text-green-700">
                    +2% from previous period
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm text-purple-700 font-medium">Avg. Rating</div>
                      <div className="text-2xl font-bold text-purple-900">4.2</div>
                    </div>
                  </div>
                  <div className="text-xs text-purple-700">
                    +0.3 from previous period
                  </div>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm text-orange-700 font-medium">Active Games</div>
                      <div className="text-2xl font-bold text-orange-900">{reportData.games.total}</div>
                    </div>
                  </div>
                  <div className="text-xs text-orange-700">
                    +15 from previous period
                  </div>
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Reports</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => handleExportData('users')}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">User Report</span>
                  </div>
                  <Download className="h-4 w-4 text-gray-500" />
                </button>
                
                <button
                  onClick={() => handleExportData('games')}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900">Game Report</span>
                  </div>
                  <Download className="h-4 w-4 text-gray-500" />
                </button>
                
                <button
                  onClick={() => handleExportData('activity')}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-gray-900">Activity Report</span>
                  </div>
                  <Download className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}