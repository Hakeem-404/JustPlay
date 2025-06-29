import { supabase } from './supabase'
import { Profile, ProfileFormData } from '../types/profile'

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  },

  async getProfileWithStats(userId: string): Promise<Profile | null> {
    try {
      console.log('📊 Loading profile with real stats for user:', userId)
      
      // Get base profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError)
        return null
      }

      // Get games organized count
      const { count: organizedCount, error: organizedError } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', userId)

      if (organizedError) {
        console.error('❌ Error fetching organized games count:', organizedError)
      }

      // Get games participated count
      const { count: participatedCount, error: participatedError } = await supabase
        .from('game_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'joined')

      if (participatedError) {
        console.error('❌ Error fetching participated games count:', participatedError)
      }

      // Get average rating - use maybeSingle() to handle cases where no player_stats record exists
      const { data: playerStats, error: playerStatsError } = await supabase
        .from('player_stats')
        .select('average_rating')
        .eq('user_id', userId)
        .maybeSingle()

      let averageRating = profile.average_rating
      if (!playerStatsError && playerStats) {
        averageRating = playerStats.average_rating
      }

      // Update profile with real stats
      const updatedProfile = {
        ...profile,
        games_organized: organizedCount || 0,
        games_played: participatedCount || 0,
        average_rating: averageRating
      }

      console.log('✅ Profile with real stats:', {
        name: updatedProfile.name,
        games_organized: updatedProfile.games_organized,
        games_played: updatedProfile.games_played,
        average_rating: updatedProfile.average_rating
      })

      return updatedProfile
    } catch (err) {
      console.error('💥 Error loading profile with stats:', err)
      return null
    }
  },

  async getUserGameHistory(userId: string) {
    try {
      console.log('📊 Loading user game history for:', userId)

      // Get organized games
      const { data: organizedGames, error: organizedError } = await supabase
        .from('games')
        .select(`
          id,
          sport,
          title,
          location,
          date,
          time,
          status,
          current_players,
          max_players,
          created_at
        `)
        .eq('organizer_id', userId)
        .order('date', { ascending: false })

      if (organizedError) {
        console.error('❌ Error fetching organized games:', organizedError)
      }

      // Get participated games
      const { data: participatedGames, error: participatedError } = await supabase
        .from('game_participants')
        .select(`
          id,
          status,
          joined_at,
          games!inner (
            id,
            sport,
            title,
            location,
            date,
            time,
            status,
            current_players,
            max_players,
            organizer_id,
            profiles!organizer_id (name)
          )
        `)
        .eq('user_id', userId)
        .in('status', ['joined', 'left'])
        .order('joined_at', { ascending: false })

      if (participatedError) {
        console.error('❌ Error fetching participated games:', participatedError)
      }

      // Transform and combine the data
      const organizedHistory = (organizedGames || []).map(game => ({
        id: game.id,
        sport: game.sport,
        title: game.title,
        location: game.location,
        date: game.date,
        time: game.time,
        status: game.status,
        type: 'organized' as const,
        result: game.status === 'completed' ? 'completed' : 
                game.status === 'cancelled' ? 'cancelled' : 'upcoming',
        players: `${game.current_players}/${game.max_players}`,
        gameDate: new Date(game.date)
      }))

      const participatedHistory = (participatedGames || []).map(participation => ({
        id: participation.games.id,
        sport: participation.games.sport,
        title: participation.games.title,
        location: participation.games.location,
        date: participation.games.date,
        time: participation.games.time,
        status: participation.games.status,
        type: 'joined' as const,
        result: participation.games.status === 'completed' ? 'completed' : 
                participation.games.status === 'cancelled' ? 'cancelled' : 'upcoming',
        players: `${participation.games.current_players}/${participation.games.max_players}`,
        organizerName: participation.games.profiles?.name || 'Unknown',
        participationStatus: participation.status,
        gameDate: new Date(participation.games.date)
      }))

      // Combine and sort by date
      const allGames = [...organizedHistory, ...participatedHistory]
        .sort((a, b) => b.gameDate.getTime() - a.gameDate.getTime())

      console.log('✅ Loaded game history:', allGames.length, 'games')
      return allGames
    } catch (err) {
      console.error('💥 Error loading game history:', err)
      return []
    }
  },

  async getUserStats(userId: string) {
    try {
      console.log('📊 Calculating user stats for:', userId)

      // Get player stats from player_stats table - use maybeSingle() to handle missing records
      const { data: playerStats, error: playerStatsError } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (!playerStatsError && playerStats) {
        console.log('✅ Found player stats in player_stats table:', playerStats)
        return {
          gamesOrganized: await this.getOrganizedGamesCount(userId),
          gamesJoined: await this.getJoinedGamesCount(userId),
          gamesCompleted: playerStats.games_completed,
          gamesCancelled: 0, // Not stored in player_stats
          upcomingGames: await this.getUpcomingGamesCount(userId),
          pastGames: await this.getPastGamesCount(userId),
          completionRate: playerStats.completion_rate
        }
      }

      // If no player_stats record, calculate manually
      console.log('📊 No player_stats record found, calculating manually')

      // Get organized games stats
      const { data: organizedStats, error: organizedError } = await supabase
        .from('games')
        .select('status')
        .eq('organizer_id', userId)

      if (organizedError) {
        console.error('❌ Error fetching organized stats:', organizedError)
      }

      // Get participated games stats
      const { data: participatedStats, error: participatedError } = await supabase
        .from('game_participants')
        .select(`
          status,
          games!inner (
            status,
            date
          )
        `)
        .eq('user_id', userId)

      if (participatedError) {
        console.error('❌ Error fetching participated stats:', participatedError)
      }

      // Calculate stats
      const organized = organizedStats || []
      const participated = participatedStats || []

      const stats = {
        gamesOrganized: organized.length,
        gamesJoined: participated.filter(p => p.status === 'joined').length,
        gamesCompleted: participated.filter(p => 
          p.status === 'joined' && p.games.status === 'completed'
        ).length,
        gamesCancelled: participated.filter(p => 
          p.games.status === 'cancelled'
        ).length,
        upcomingGames: participated.filter(p => 
          p.status === 'joined' && 
          p.games.status === 'active' && 
          new Date(p.games.date) >= new Date()
        ).length,
        pastGames: participated.filter(p => 
          p.status === 'joined' && 
          new Date(p.games.date) < new Date()
        ).length,
        completionRate: 0
      }

      // Calculate completion rate
      if (stats.gamesJoined > 0) {
        stats.completionRate = Math.round((stats.gamesCompleted / stats.gamesJoined) * 100)
      }

      console.log('✅ Calculated user stats:', stats)
      return stats
    } catch (err) {
      console.error('💥 Error calculating user stats:', err)
      return {
        gamesOrganized: 0,
        gamesJoined: 0,
        gamesCompleted: 0,
        gamesCancelled: 0,
        upcomingGames: 0,
        pastGames: 0,
        completionRate: 0
      }
    }
  },

  async getOrganizedGamesCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', userId)

    if (error) {
      console.error('Error getting organized games count:', error)
      return 0
    }

    return count || 0
  },

  async getJoinedGamesCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('game_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'joined')

    if (error) {
      console.error('Error getting joined games count:', error)
      return 0
    }

    return count || 0
  },

  async getUpcomingGamesCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    
    const { count, error } = await supabase
      .from('game_participants')
      .select(`
        id,
        games!inner (
          id,
          date,
          status
        )
      `, { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'joined')
      .eq('games.status', 'active')
      .gte('games.date', today)

    if (error) {
      console.error('Error getting upcoming games count:', error)
      return 0
    }

    return count || 0
  },

  async getPastGamesCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    
    const { count, error } = await supabase
      .from('game_participants')
      .select(`
        id,
        games!inner (
          id,
          date
        )
      `, { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'joined')
      .lt('games.date', today)

    if (error) {
      console.error('Error getting past games count:', error)
      return 0
    }

    return count || 0
  },

  async createProfile(userId: string, email: string, profileData: ProfileFormData): Promise<{ error: any }> {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        name: profileData.name,
        location: profileData.location,
        bio: profileData.bio || null,
        skill_level: profileData.skill_level,
        preferred_sports: profileData.preferred_sports,
        profile_completed: true
      })

    return { error }
  },

  async updateProfile(userId: string, profileData: Partial<ProfileFormData>): Promise<{ error: any }> {
    const updateData: any = {
      ...profileData,
      updated_at: new Date().toISOString()
    }

    // If we're updating core profile fields, mark as completed
    if (profileData.name || profileData.location || profileData.skill_level || profileData.preferred_sports) {
      updateData.profile_completed = true
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    return { error }
  },

  async checkProfileExists(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    return !error && !!data
  }
}