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
  topSports: { sport: string; count: number }[];
  topLocations: { location: string; count: number }[];
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
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      // For demo purposes, we'll consider specific emails as admins
      return data.email.endsWith('@admin.justplay.com');
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  },

  async getDashboardStats(): Promise<{ data: AdminStats | null; error: string | null }> {
    try {
      // Get current date and 30 days ago for recent activity metrics
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
      
      // Run queries in parallel for better performance
      const [
        totalUsersResult,
        newUsersResult,
        activeUsersResult,
        totalGamesResult,
        activeGamesResult,
        completedGamesResult,
        cancelledGamesResult,
        topSportsResult,
        topLocationsResult,
        averagePlayersResult
      ] = await Promise.all([
        // Total users count
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        
        // New users in last 30 days
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgoStr),
        
        // Active users (participated in games in last 30 days)
        supabase
          .from('game_participants')
          .select('user_id', { count: 'exact', head: true, distinct: true })
          .gte('joined_at', thirtyDaysAgoStr),
        
        // Total games
        supabase
          .from('games')
          .select('*', { count: 'exact', head: true }),
        
        // Active games
        supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        
        // Completed games
        supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed'),
        
        // Cancelled games
        supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'cancelled'),
        
        // Top sports
        supabase
          .from('games')
          .select('sport, count')
          .not('sport', 'is', null)
          .group('sport')
          .order('count', { ascending: false })
          .limit(5),
        
        // Top locations
        supabase
          .from('games')
          .select('location, count')
          .not('location', 'is', null)
          .group('location')
          .order('count', { ascending: false })
          .limit(5),
        
        // Average players per game
        supabase
          .from('games')
          .select('current_players')
          .gt('current_players', 0)
      ]);
      
      // Check for errors in any of the queries
      if (totalUsersResult.error) throw totalUsersResult.error;
      if (newUsersResult.error) throw newUsersResult.error;
      if (activeUsersResult.error) throw activeUsersResult.error;
      if (totalGamesResult.error) throw totalGamesResult.error;
      if (activeGamesResult.error) throw activeGamesResult.error;
      if (completedGamesResult.error) throw completedGamesResult.error;
      if (cancelledGamesResult.error) throw cancelledGamesResult.error;
      if (topSportsResult.error) throw topSportsResult.error;
      if (topLocationsResult.error) throw topLocationsResult.error;
      if (averagePlayersResult.error) throw averagePlayersResult.error;
      
      // Calculate average players per game
      let averagePlayers = 0;
      if (averagePlayersResult.data && averagePlayersResult.data.length > 0) {
        const totalPlayers = averagePlayersResult.data.reduce((sum, game) => sum + game.current_players, 0);
        averagePlayers = parseFloat((totalPlayers / averagePlayersResult.data.length).toFixed(1));
      }
      
      // Format top sports data
      const topSports = topSportsResult.data?.map(item => ({
        sport: item.sport,
        count: item.count
      })) || [];
      
      // Format top locations data
      const topLocations = topLocationsResult.data?.map(item => ({
        location: item.location,
        count: item.count
      })) || [];
      
      // Compile stats
      const stats: AdminStats = {
        totalUsers: totalUsersResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        newUsers: newUsersResult.count || 0,
        totalGames: totalGamesResult.count || 0,
        activeGames: activeGamesResult.count || 0,
        completedGames: completedGamesResult.count || 0,
        cancelledGames: cancelledGamesResult.count || 0,
        averagePlayersPerGame: averagePlayers,
        topSports,
        topLocations
      };
      
      return { data: stats, error: null };
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
      let query = supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          location,
          created_at,
          games_played,
          games_organized,
          average_rating,
          status:profile_completed
        `, { count: 'exact' });
      
      // Apply search filter if provided
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,location.ilike.%${search}%`);
      }
      
      // Apply status filter if provided
      // Note: In a real app, you would have a proper status field
      // For this demo, we're using profile_completed as a proxy
      if (status && status !== 'all') {
        if (status === 'active') {
          query = query.eq('profile_completed', true);
        } else if (status === 'suspended' || status === 'banned') {
          query = query.eq('profile_completed', false);
        }
      }
      
      // Apply pagination
      query = query.range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Transform data to match AdminUser interface
      const transformedData: AdminUser[] = data.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        location: user.location,
        created_at: user.created_at,
        games_played: user.games_played || 0,
        games_organized: user.games_organized || 0,
        average_rating: user.average_rating || 0,
        // For demo purposes, most users are active, some are suspended/banned
        status: user.status ? 'active' : Math.random() > 0.5 ? 'suspended' : 'banned'
      }));
      
      return { data: transformedData, total: count || 0, error: null };
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
      let query = supabase
        .from('games')
        .select(`
          id,
          title,
          sport,
          location,
          date,
          time,
          max_players,
          current_players,
          organizer_id,
          status,
          created_at,
          profiles!organizer_id(name)
        `, { count: 'exact' });
      
      // Apply search filter if provided
      if (search) {
        query = query.or(`title.ilike.%${search}%,sport.ilike.%${search}%,location.ilike.%${search}%`);
      }
      
      // Apply status filter if provided
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      // Apply pagination
      query = query.range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Transform data to match AdminGame interface
      const transformedData: AdminGame[] = data.map(game => ({
        id: game.id,
        title: game.title || game.sport,
        sport: game.sport,
        location: game.location,
        date: game.date,
        time: game.time,
        maxPlayers: game.max_players,
        currentPlayers: game.current_players,
        organizerId: game.organizer_id,
        organizerName: game.profiles?.name || 'Unknown',
        status: game.status,
        createdAt: game.created_at,
        // For demo purposes, some games have reports
        reportCount: Math.random() > 0.8 ? Math.floor(Math.random() * 5) + 1 : 0
      }));
      
      return { data: transformedData, total: count || 0, error: null };
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
      // In a real implementation, you would update a status field
      // For this demo, we'll update profile_completed as a proxy
      const newStatus = action === 'unsuspend' || action === 'unban';
      
      const { error } = await supabase
        .from('profiles')
        .update({ profile_completed: newStatus })
        .eq('id', userId);
      
      if (error) throw error;
      
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
      if (action === 'delete') {
        // Delete the game
        const { error } = await supabase
          .from('games')
          .delete()
          .eq('id', gameId);
        
        if (error) throw error;
      } else {
        // Update game status
        const newStatus = action === 'cancel' ? 'cancelled' : 'completed';
        
        const { error } = await supabase
          .from('games')
          .update({ status: newStatus })
          .eq('id', gameId);
        
        if (error) throw error;
      }
      
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
      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
      
      const startDateStr = startDate.toISOString();
      
      // Run queries in parallel
      const [
        userSignupsResult,
        gameCreationResult,
        sportPopularityResult,
        locationPopularityResult
      ] = await Promise.all([
        // User signups over time
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', startDateStr)
          .order('created_at', { ascending: true }),
        
        // Game creation over time
        supabase
          .from('games')
          .select('created_at')
          .gte('created_at', startDateStr)
          .order('created_at', { ascending: true }),
        
        // Sport popularity
        supabase
          .from('games')
          .select('sport, count')
          .not('sport', 'is', null)
          .group('sport')
          .order('count', { ascending: false }),
        
        // Location popularity
        supabase
          .from('games')
          .select('location, count')
          .not('location', 'is', null)
          .group('location')
          .order('count', { ascending: false })
          .limit(10)
      ]);
      
      // Check for errors
      if (userSignupsResult.error) throw userSignupsResult.error;
      if (gameCreationResult.error) throw gameCreationResult.error;
      if (sportPopularityResult.error) throw sportPopularityResult.error;
      if (locationPopularityResult.error) throw locationPopularityResult.error;
      
      // Process user signups data for chart
      const userSignups = userSignupsResult.data || [];
      const userSignupsByDay = this.aggregateDataByTimeUnit(userSignups, timeRange);
      
      // Process game creation data for chart
      const gameCreations = gameCreationResult.data || [];
      const gameCreationsByDay = this.aggregateDataByTimeUnit(gameCreations, timeRange);
      
      // Process sport popularity data
      const sportPopularity = sportPopularityResult.data || [];
      
      // Process location popularity data
      const locationPopularity = locationPopularityResult.data || [];
      
      // Compile report data
      const reportData = {
        userActivity: {
          total: userSignups.length,
          dailyActive: userSignupsByDay.map(day => day.count),
          labels: userSignupsByDay.map(day => day.label)
        },
        games: {
          total: gameCreations.length,
          creationRate: gameCreationsByDay.map(day => day.count),
          labels: gameCreationsByDay.map(day => day.label)
        },
        sports: sportPopularity.reduce((acc, item) => {
          acc[item.sport] = item.count;
          return acc;
        }, {}),
        locations: locationPopularity.reduce((acc, item) => {
          acc[item.location] = item.count;
          return acc;
        }, {})
      };
      
      return { data: reportData, error: null };
    } catch (err) {
      console.error('Error loading report data:', err);
      return { data: null, error: 'Failed to load report data' };
    }
  },
  
  // Helper method to aggregate data by time unit (day, week, month)
  aggregateDataByTimeUnit(data: any[], timeRange: '7d' | '30d' | '90d' | '1y'): { label: string; count: number }[] {
    const result: { [key: string]: number } = {};
    const format = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: timeRange === '7d' || timeRange === '30d' ? 'numeric' : undefined,
      year: timeRange === '1y' ? 'numeric' : undefined
    });
    
    // Initialize result with all dates in range
    const now = new Date();
    const startDate = new Date();
    let increment: number;
    let dateFormat: string;
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        increment = 1; // 1 day
        dateFormat = 'day';
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        increment = 1; // 1 day
        dateFormat = 'day';
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        increment = 7; // 1 week
        dateFormat = 'week';
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        increment = 30; // ~1 month
        dateFormat = 'month';
        break;
    }
    
    // Initialize all dates with 0 count
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + increment)) {
      const key = format.format(d);
      result[key] = 0;
    }
    
    // Count items by date
    data.forEach(item => {
      const date = new Date(item.created_at);
      const key = format.format(date);
      if (result[key] !== undefined) {
        result[key]++;
      }
    });
    
    // Convert to array format for charts
    return Object.entries(result).map(([label, count]) => ({ label, count }));
  },

  async exportData(
    type: 'users' | 'games' | 'activity'
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      let data;
      
      switch (type) {
        case 'users':
          const { data: users } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          data = users;
          break;
        
        case 'games':
          const { data: games } = await supabase
            .from('games')
            .select(`
              *,
              profiles!organizer_id(name)
            `)
            .order('created_at', { ascending: false });
          data = games;
          break;
        
        case 'activity':
          const { data: activity } = await supabase
            .from('game_participants')
            .select(`
              *,
              profiles!user_id(name),
              games!game_id(*)
            `)
            .order('joined_at', { ascending: false })
            .limit(1000);
          data = activity;
          break;
      }
      
      if (!data) {
        throw new Error('No data available for export');
      }
      
      // In a real implementation, this would generate a CSV or Excel file
      // For demo purposes, we'll create a data URL for a JSON file
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      return { url, error: null };
    } catch (err) {
      console.error('Error exporting data:', err);
      return { url: null, error: 'Failed to export data' };
    }
  },
  
  async loginAsAdmin(email: string, password: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Validate admin email
      if (!email.endsWith('@admin.justplay.com')) {
        return { success: false, error: 'Invalid admin email address' };
      }
      
      // In a real implementation, this would authenticate against a secure admin system
      // For demo purposes, we're using the regular auth system with email validation
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error logging in as admin:', err);
      return { success: false, error: 'Failed to log in as admin' };
    }
  }
};