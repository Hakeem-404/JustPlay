import { supabase } from './supabase'
import { Game, GameFormData } from '../types/game'

export const gameService = {
  async createGame(gameData: GameFormData, organizerId: string): Promise<{ data: Game | null; error: any }> {
    const { data, error } = await supabase
      .from('games')
      .insert({
        sport: gameData.sport,
        title: gameData.title || null,
        location: gameData.location,
        latitude: gameData.latitude,
        longitude: gameData.longitude,
        date: gameData.date,
        time: gameData.time,
        max_players: gameData.maxPlayers,
        skill_level: gameData.skillLevel,
        description: gameData.description || null,
        organizer_id: organizerId,
        is_private: gameData.isPrivate,
        current_players: 1 // Organizer is automatically a participant
      })
      .select(`
        *,
        organizer:profiles!organizer_id(name)
      `)
      .single()

    if (error) {
      console.error('Error creating game:', error)
      return { data: null, error }
    }

    // Transform the data to match our Game interface
    const transformedData: Game = {
      ...data,
      organizerName: data.organizer?.name || 'Unknown'
    }

    return { data: transformedData, error: null }
  },

  async getGames(filters?: {
    sport?: string
    latitude?: number
    longitude?: number
    maxDistance?: number
    dateFrom?: string
    dateTo?: string
    skillLevel?: string
  }): Promise<{ data: Game[] | null; error: any }> {
    let query = supabase
      .from('games')
      .select(`
        *,
        organizer:profiles!organizer_id(name)
      `)
      .eq('status', 'active')
      .gte('date', new Date().toISOString().split('T')[0]) // Only future games
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    // Apply filters
    if (filters?.sport) {
      query = query.eq('sport', filters.sport)
    }

    if (filters?.skillLevel && filters.skillLevel !== 'any' && filters.skillLevel !== 'all') {
      query = query.in('skill_level', [filters.skillLevel, 'any'])
    }

    if (filters?.dateFrom) {
      query = query.gte('date', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('date', filters.dateTo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching games:', error)
      return { data: null, error }
    }

    // Transform the data to match our Game interface
    const transformedData: Game[] = data?.map(game => ({
      ...game,
      organizerName: game.organizer?.name || 'Unknown'
    })) || []

    // Apply distance filter if coordinates provided
    if (filters?.latitude && filters?.longitude && filters?.maxDistance) {
      const filteredByDistance = transformedData.filter(game => {
        const distance = calculateDistance(
          filters.latitude!,
          filters.longitude!,
          game.latitude,
          game.longitude
        )
        return distance <= filters.maxDistance!
      })
      return { data: filteredByDistance, error: null }
    }

    return { data: transformedData, error: null }
  },

  async getUserGames(userId: string): Promise<{ data: Game[] | null; error: any }> {
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        organizer:profiles!organizer_id(name)
      `)
      .eq('organizer_id', userId)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (error) {
      console.error('Error fetching user games:', error)
      return { data: null, error }
    }

    // Transform the data to match our Game interface
    const transformedData: Game[] = data?.map(game => ({
      ...game,
      organizerName: game.organizer?.name || 'Unknown'
    })) || []

    return { data: transformedData, error: null }
  },

  async updateGame(gameId: string, updates: Partial<GameFormData>): Promise<{ error: any }> {
    const { error } = await supabase
      .from('games')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)

    return { error }
  },

  async deleteGame(gameId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId)

    return { error }
  },

  async joinGame(gameId: string): Promise<{ error: any }> {
    // This would typically involve a separate participants table
    // For now, we'll just increment current_players
    const { error } = await supabase.rpc('increment_game_players', {
      game_id: gameId
    })

    return { error }
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}