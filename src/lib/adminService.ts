import { supabase } from './supabase';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalGames: number;
  activeGames: number;
  completedGames: number;
  cancelledGames: number;
  averagePlayersPerGame: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  location: string;
  created_at: string;
  games_played: number;
  games_organized: number;
  average_rating: number;
  status: 'active' | 'suspended' | 'banned';
}

export interface AdminGame {
  id: string;
  title: string;
  sport: string;
  location: string;
  date: string;
  time: string;
  maxPlayers: number;
  currentPlayers: number;
  organizerId: string;
  organizerName: string;
  status: 'active' | 'cancelled' | 'completed';
  createdAt: string;
  reportCount?: number;
}

export const adminService = {
  async checkAdminStatus(userId: string): Promise<boolean> {
    try {
      // In a real app, you would check against a proper admin role
      // This is a simplified example
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      // For demo purposes, we'll consider specific emails as admins
      // In production, use proper role-based access control
      return data.email.endsWith('@admin.justplay.com');
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  },

  async getDashboardStats(): Promise<{ data: AdminStats | null; error: string | null }> {
    try {
      // In a real implementation, this would be database queries
      // For demo purposes, we're using mock data
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock stats data
      const mockStats: AdminStats = {
        totalUsers: 1250,
        activeUsers: 876,
        newUsers: 42,
        totalGames: 3456,
        activeGames: 128,
        completedGames: 3245,
        cancelledGames: 83,
        averagePlayersPerGame: 8.4
      };
      
      return { data: mockStats, error: null };
    } catch (err) {
      console.error('Error loading admin stats:', err);
      return { data: null, error: 'Failed to load dashboard statistics' };
    }
  },

  async getUsers(
    search?: string,
    status?: 'all' | 'active' | 'suspended' | 'banned',
    page = 1,
    limit = 10
  ): Promise<{ data: AdminUser[] | null; total: number; error: string | null }> {
    try {
      // In a real implementation, this would be a database query
      // For demo purposes, we're using mock data
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock users
      const mockUsers: AdminUser[] = Array.from({ length: 50 }, (_, i) => ({
        id: `user-${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        location: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)],
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        games_played: Math.floor(Math.random() * 50),
        games_organized: Math.floor(Math.random() * 20),
        average_rating: 3 + Math.random() * 2,
        status: Math.random() > 0.9 ? (Math.random() > 0.5 ? 'suspended' : 'banned') : 'active'
      }));
      
      // Apply filters
      let filtered = [...mockUsers];
      
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(user => 
          user.name.toLowerCase().includes(query) || 
          user.email.toLowerCase().includes(query) ||
          user.location.toLowerCase().includes(query)
        );
      }
      
      if (status && status !== 'all') {
        filtered = filtered.filter(user => user.status === status);
      }
      
      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedUsers = filtered.slice(start, end);
      
      return { data: paginatedUsers, total: filtered.length, error: null };
    } catch (err) {
      console.error('Error loading users:', err);
      return { data: null, total: 0, error: 'Failed to load users' };
    }
  },

  async getGames(
    search?: string,
    status?: 'all' | 'active' | 'cancelled' | 'completed',
    page = 1,
    limit = 10
  ): Promise<{ data: AdminGame[] | null; total: number; error: string | null }> {
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
          title: `${sport} Game ${i + 1}`,
          sport,
          location,
          date: date.toISOString().split('T')[0],
          time: `${Math.floor(Math.random() * 12) + 8}:00`,
          maxPlayers: Math.floor(Math.random() * 15) + 5,
          currentPlayers: Math.floor(Math.random() * 10) + 2,
          organizerId: `user-${Math.floor(Math.random() * 20) + 1}`,
          organizerName: `Organizer ${Math.floor(Math.random() * 20) + 1}`,
          status,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          reportCount: Math.random() > 0.8 ? Math.floor(Math.random() * 5) + 1 : 0
        };
      });
      
      // Apply filters
      let filtered = [...mockGames];
      
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(game => 
          game.title.toLowerCase().includes(query) || 
          game.sport.toLowerCase().includes(query) ||
          game.location.toLowerCase().includes(query) ||
          game.organizerName.toLowerCase().includes(query)
        );
      }
      
      if (status && status !== 'all') {
        filtered = filtered.filter(game => game.status === status);
      }
      
      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedGames = filtered.slice(start, end);
      
      return { data: paginatedGames, total: filtered.length, error: null };
    } catch (err) {
      console.error('Error loading games:', err);
      return { data: null, total: 0, error: 'Failed to load games' };
    }
  },

  async updateUserStatus(
    userId: string, 
    action: 'suspend' | 'unsuspend' | 'ban' | 'unban'
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // In a real implementation, this would update the database
      // For demo purposes, we're just simulating success
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error updating user status:', err);
      return { success: false, error: 'Failed to update user status' };
    }
  },

  async updateGameStatus(
    gameId: string,
    action: 'cancel' | 'complete' | 'delete'
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // In a real implementation, this would update the database
      // For demo purposes, we're just simulating success
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error updating game status:', err);
      return { success: false, error: 'Failed to update game status' };
    }
  },

  async getReportData(
    timeRange: '7d' | '30d' | '90d' | '1y'
  ): Promise<{ data: any; error: string | null }> {
    try {
      // In a real implementation, this would query the database for analytics data
      // For demo purposes, we're using mock data
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock data based on time range
      const days = timeRange === '7d' ? 7 : 
                  timeRange === '30d' ? 30 : 
                  timeRange === '90d' ? 90 : 365;
      
      // Mock report data structure
      const reportData = {
        userActivity: {
          total: 1250,
          active: 876,
          new: 42,
          dailyActive: Array.from({ length: Math.min(days, 30) }, () => Math.floor(Math.random() * 100) + 50)
        },
        games: {
          total: 3456,
          active: 128,
          completed: 3245,
          cancelled: 83,
          creationRate: Array.from({ length: Math.min(days, 30) }, () => Math.floor(Math.random() * 30) + 5)
        },
        sports: {
          basketball: 1245,
          soccer: 987,
          tennis: 654,
          volleyball: 432,
          baseball: 321
        },
        locations: {
          'Central Park': 432,
          'Riverside Park': 321,
          'Brooklyn Bridge Park': 287,
          'Prospect Park': 254,
          'Battery Park': 198
        }
      };
      
      return { data: reportData, error: null };
    } catch (err) {
      console.error('Error loading report data:', err);
      return { data: null, error: 'Failed to load report data' };
    }
  },

  async exportData(
    type: 'users' | 'games' | 'activity'
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      // In a real implementation, this would generate a CSV or Excel file
      // For demo purposes, we're just simulating success
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return a fake download URL
      return { url: '#', error: null };
    } catch (err) {
      console.error('Error exporting data:', err);
      return { url: null, error: 'Failed to export data' };
    }
  }
};