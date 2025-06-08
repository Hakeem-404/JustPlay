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
        max_players: gameData.maxPlayers, // Use snake_case for database
        skill_level: gameData.skillLevel, // Use snake_case for database
        description: gameData.description || null,
        organizer_id: organizerId, // Use snake_case for database
        is_private: gameData.isPrivate, // Use snake_case for database
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

    // Transform the data to match our Game interface (camelCase)
    const transformedData: Game = {
      id: data.id,
      sport: data.sport,
      title: data.title,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      date: data.date,
      time: data.time,
      maxPlayers: data.max_players, // Convert to camelCase
      currentPlayers: data.current_players, // Convert to camelCase
      skillLevel: data.skill_level, // Convert to camelCase
      description: data.description,
      organizerId: data.organizer_id, // Convert to camelCase
      organizerName: data.organizer?.name || 'Unknown',
      isPrivate: data.is_private, // Convert to camelCase
      status: data.status,
      createdAt: data.created_at, // Convert to camelCase
      updatedAt: data.updated_at // Convert to camelCase
    }

    console.log('Game created - Raw data:', data)
    console.log('Game created - Transformed data:', transformedData)

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

    // Transform the data to match our Game interface (camelCase)
    const transformedData: Game[] = data?.map(game => ({
      id: game.id,
      sport: game.sport,
      title: game.title,
      location: game.location,
      latitude: game.latitude,
      longitude: game.longitude,
      date: game.date,
      time: game.time,
      maxPlayers: game.max_players, // Convert to camelCase
      currentPlayers: game.current_players, // Convert to camelCase
      skillLevel: game.skill_level, // Convert to camelCase
      description: game.description,
      organizerId: game.organizer_id, // Convert to camelCase
      organizerName: game.organizer?.name || 'Unknown',
      isPrivate: game.is_private, // Convert to camelCase
      status: game.status,
      createdAt: game.created_at, // Convert to camelCase
      updatedAt: game.updated_at // Convert to camelCase
    })) || []

    console.log('Games fetched - Raw data sample:', data?.[0])
    console.log('Games fetched - Transformed data sample:', transformedData?.[0])

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

    // Transform the data to match our Game interface (camelCase)
    const transformedData: Game[] = data?.map(game => ({
      id: game.id,
      sport: game.sport,
      title: game.title,
      location: game.location,
      latitude: game.latitude,
      longitude: game.longitude,
      date: game.date,
      time: game.time,
      maxPlayers: game.max_players, // Convert to camelCase
      currentPlayers: game.current_players, // Convert to camelCase
      skillLevel: game.skill_level, // Convert to camelCase
      description: game.description,
      organizerId: game.organizer_id, // Convert to camelCase
      organizerName: game.organizer?.name || 'Unknown',
      isPrivate: game.is_private, // Convert to camelCase
      status: game.status,
      createdAt: game.created_at, // Convert to camelCase
      updatedAt: game.updated_at // Convert to camelCase
    })) || []

    return { data: transformedData, error: null }
  },

  async updateGame(gameId: string, updates: Partial<GameFormData>): Promise<{ error: any }> {
    // Convert camelCase to snake_case for database
    const dbUpdates: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.sport) dbUpdates.sport = updates.sport
    if (updates.title) dbUpdates.title = updates.title
    if (updates.location) dbUpdates.location = updates.location
    if (updates.latitude) dbUpdates.latitude = updates.latitude
    if (updates.longitude) dbUpdates.longitude = updates.longitude
    if (updates.date) dbUpdates.date = updates.date
    if (updates.time) dbUpdates.time = updates.time
    if (updates.maxPlayers) dbUpdates.max_players = updates.maxPlayers
    if (updates.skillLevel) dbUpdates.skill_level = updates.skillLevel
    if (updates.description) dbUpdates.description = updates.description
    if (updates.isPrivate !== undefined) dbUpdates.is_private = updates.isPrivate

    const { error } = await supabase
      .from('games')
      .update(dbUpdates)
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

  async getGameById(gameId: string): Promise<{ data: Game | null; error: any }> {
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        organizer:profiles!organizer_id(name)
      `)
      .eq('id', gameId)
      .single()

    if (error) {
      console.error('Error fetching game:', error)
      return { data: null, error }
    }

    // Transform the data to match our Game interface (camelCase)
    const transformedData: Game = {
      id: data.id,
      sport: data.sport,
      title: data.title,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      date: data.date,
      time: data.time,
      maxPlayers: data.max_players, // Convert to camelCase
      currentPlayers: data.current_players, // Convert to camelCase
      skillLevel: data.skill_level, // Convert to camelCase
      description: data.description,
      organizerId: data.organizer_id, // Convert to camelCase
      organizerName: data.organizer?.name || 'Unknown',
      isPrivate: data.is_private, // Convert to camelCase
      status: data.status,
      createdAt: data.created_at, // Convert to camelCase
      updatedAt: data.updated_at // Convert to camelCase
    }

    return { data: transformedData, error: null }
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