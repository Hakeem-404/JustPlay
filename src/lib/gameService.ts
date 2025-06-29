import { supabase } from './supabase'
import { Game, GameFormData } from '../types/game'

export const gameService = {
  async createGame(gameData: GameFormData, organizerId: string): Promise<{ data: Game | null; error: any }> {
    console.log('🎮 Creating new game:', gameData)
    
    try {
      // Start a transaction by creating the game first
      const { data: gameRecord, error: gameError } = await supabase
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
          current_players: 1 // Start with 1 (the organizer)
        })
        .select(`
          *,
          organizer:profiles!organizer_id(name)
        `)
        .single()

      if (gameError) {
        console.error('❌ Error creating game:', gameError)
        return { data: null, error: gameError }
      }

      console.log('✅ Game created successfully:', gameRecord)

      // Now add the organizer as a participant with special status
      const { error: participantError } = await supabase
        .from('game_participants')
        .insert({
          game_id: gameRecord.id,
          user_id: organizerId,
          status: 'joined', // Organizer is always 'joined'
          joined_at: new Date().toISOString()
        })

      if (participantError) {
        console.error('❌ Error adding organizer as participant:', participantError)
        // Try to clean up the game if participant insertion fails
        await supabase.from('games').delete().eq('id', gameRecord.id)
        return { data: null, error: participantError }
      }

      console.log('✅ Organizer added as participant successfully')

      // Transform the data to match our Game interface (camelCase)
      const transformedData: Game = {
        id: gameRecord.id,
        sport: gameRecord.sport,
        title: gameRecord.title,
        location: gameRecord.location,
        latitude: gameRecord.latitude,
        longitude: gameRecord.longitude,
        date: gameRecord.date,
        time: gameRecord.time,
        maxPlayers: gameRecord.max_players,
        currentPlayers: gameRecord.current_players, // This is 1 (organizer)
        skillLevel: gameRecord.skill_level,
        description: gameRecord.description,
        organizerId: gameRecord.organizer_id,
        organizerName: gameRecord.organizer?.name || 'Unknown',
        isPrivate: gameRecord.is_private,
        status: gameRecord.status,
        createdAt: gameRecord.created_at,
        updatedAt: gameRecord.updated_at
      }

      return { data: transformedData, error: null }
    } catch (err) {
      console.error('💥 Unexpected error creating game:', err)
      return { data: null, error: err }
    }
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
    console.log('📊 DEBUG: ===== GAME SERVICE GET GAMES =====')
    console.log('📊 DEBUG: Filters received:', filters)
    
    let query = supabase
      .from('games')
      .select(`
        *,
        organizer:profiles!organizer_id(name)
      `)
      .eq('status', 'active')

    console.log('📊 DEBUG: Base query: status = active')

    // Only filter by future dates if no specific date filters are provided
    if (!filters?.dateFrom && !filters?.dateTo) {
      const today = new Date().toISOString().split('T')[0]
      query = query.gte('date', today)
      console.log('📊 DEBUG: Added future date filter:', today)
    }

    // Apply filters
    if (filters?.sport) {
      query = query.eq('sport', filters.sport)
      console.log('📊 DEBUG: Added sport filter:', filters.sport)
    }

    if (filters?.skillLevel && filters.skillLevel !== 'any' && filters.skillLevel !== 'all') {
      query = query.in('skill_level', [filters.skillLevel, 'any'])
      console.log('📊 DEBUG: Added skill level filter:', filters.skillLevel)
    }

    if (filters?.dateFrom) {
      query = query.gte('date', filters.dateFrom)
      console.log('📊 DEBUG: Added dateFrom filter:', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('date', filters.dateTo)
      console.log('📊 DEBUG: Added dateTo filter:', filters.dateTo)
    }

    // Add ordering
    query = query.order('date', { ascending: true }).order('time', { ascending: true })
    console.log('📊 DEBUG: Added ordering by date and time')

    console.log('📊 DEBUG: Executing query...')
    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching games:', error)
      return { data: null, error }
    }

    console.log('📊 DEBUG: ===== RAW DATABASE RESULTS =====')
    console.log('📊 DEBUG: Total games from database:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('📊 DEBUG: Raw game data from database:')
      data.forEach((game, index) => {
        console.log(`📊 DEBUG: DB Game ${index + 1}:`, {
          id: game.id,
          sport: game.sport,
          title: game.title,
          location: game.location,
          date: game.date,
          time: game.time,
          coordinates: { lat: game.latitude, lng: game.longitude },
          max_players: game.max_players,
          current_players: game.current_players,
          skill_level: game.skill_level,
          status: game.status,
          is_private: game.is_private,
          organizer_id: game.organizer_id,
          organizer_name: game.organizer?.name
        })
      })
    } else {
      console.log('📊 DEBUG: No games returned from database')
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
      maxPlayers: game.max_players,
      currentPlayers: game.current_players, // Includes organizer
      skillLevel: game.skill_level,
      description: game.description,
      organizerId: game.organizer_id,
      organizerName: game.organizer?.name || 'Unknown',
      isPrivate: game.is_private,
      status: game.status,
      createdAt: game.created_at,
      updatedAt: game.updated_at
    })) || []

    console.log('📊 DEBUG: ===== TRANSFORMED RESULTS =====')
    console.log('📊 DEBUG: Transformed games count:', transformedData.length)
    console.log('📊 DEBUG: Transformed game data:')
    transformedData.forEach((game, index) => {
      console.log(`📊 DEBUG: Transformed Game ${index + 1}:`, {
        id: game.id,
        sport: game.sport,
        title: game.title,
        location: game.location,
        date: game.date,
        time: game.time,
        coordinates: { lat: game.latitude, lng: game.longitude },
        maxPlayers: game.maxPlayers,
        currentPlayers: game.currentPlayers,
        skillLevel: game.skillLevel,
        status: game.status,
        isPrivate: game.isPrivate,
        organizerId: game.organizerId,
        organizerName: game.organizerName
      })
    })

    // CRITICAL FIX: Apply distance filter if coordinates provided AND maxDistance is not "no limit"
    if (filters?.latitude && filters?.longitude && filters?.maxDistance && filters.maxDistance < 999999) {
      console.log('📊 DEBUG: Applying distance filter:', {
        userLat: filters.latitude,
        userLng: filters.longitude,
        maxDistance: filters.maxDistance
      })
      
      const filteredByDistance = transformedData.filter(game => {
        const distance = calculateDistance(
          filters.latitude!,
          filters.longitude!,
          game.latitude,
          game.longitude
        )
        const withinDistance = distance <= filters.maxDistance!
        console.log(`📊 DEBUG: Game ${game.id} distance: ${distance.toFixed(2)}km, within ${filters.maxDistance}km: ${withinDistance}`)
        return withinDistance
      })
      
      console.log('📊 DEBUG: After distance filtering:', filteredByDistance.length, 'games')
      return { data: filteredByDistance, error: null }
    } else if (filters?.maxDistance && filters.maxDistance >= 999999) {
      console.log('📊 DEBUG: No limit distance filter - showing all games globally')
    } else {
      console.log('📊 DEBUG: No distance filtering applied - no coordinates provided')
    }

    console.log('📊 DEBUG: Final result count:', transformedData.length)
    return { data: transformedData, error: null }
  },

  async getUserGames(userId: string): Promise<{ data: Game[] | null; error: any }> {
    console.log('👤 Loading user games for:', userId)
    
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
      console.error('❌ Error fetching user games:', error)
      return { data: null, error }
    }

    console.log('✅ Loaded user games:', data?.length || 0)

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
      maxPlayers: game.max_players,
      currentPlayers: game.current_players, // Includes organizer
      skillLevel: game.skill_level,
      description: game.description,
      organizerId: game.organizer_id,
      organizerName: game.organizer?.name || 'Unknown',
      isPrivate: game.is_private,
      status: game.status,
      createdAt: game.created_at,
      updatedAt: game.updated_at
    })) || []

    return { data: transformedData, error: null }
  },

  async updateGame(gameId: string, updates: Partial<GameFormData>): Promise<{ error: any }> {
    console.log('🔄 Updating game:', gameId, updates)
    
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

    if (error) {
      console.error('❌ Error updating game:', error)
    } else {
      console.log('✅ Game updated successfully')
    }

    return { error }
  },

  // Add a specific method for updating game status
  async updateGameStatus(gameId: string, status: 'active' | 'cancelled' | 'completed'): Promise<{ error: any }> {
    console.log('🔄 Updating game status:', gameId, status)
    
    // Convert camelCase to snake_case for database
    const dbUpdates: any = {
      status: status,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('games')
      .update(dbUpdates)
      .eq('id', gameId)

    if (error) {
      console.error('❌ Error updating game status:', error)
    } else {
      console.log('✅ Game status updated successfully to:', status)
    }

    return { error }
  },

  async deleteGame(gameId: string): Promise<{ error: any }> {
    console.log('🗑️ Deleting game:', gameId)
    
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId)

    if (error) {
      console.error('❌ Error deleting game:', error)
    } else {
      console.log('✅ Game deleted successfully')
    }

    return { error }
  },

  async getGameById(gameId: string): Promise<{ data: Game | null; error: any }> {
    console.log('🎮 Loading game by ID:', gameId)
    
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        organizer:profiles!organizer_id(name)
      `)
      .eq('id', gameId)
      .single()

    if (error) {
      console.error('❌ Error fetching game:', error)
      return { data: null, error }
    }

    console.log('✅ Loaded game:', data)

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
      maxPlayers: data.max_players,
      currentPlayers: data.current_players, // Includes organizer
      skillLevel: data.skill_level,
      description: data.description,
      organizerId: data.organizer_id,
      organizerName: data.organizer?.name || 'Unknown',
      isPrivate: data.is_private,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    return { data: transformedData, error: null }
  },

  // Enhanced real-time subscription for game updates
  subscribeToGameUpdates(gameId: string, callback: (game: Game) => void) {
    console.log('📡 Setting up game update subscription for:', gameId)
    
    const subscription = supabase
      .channel(`game_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        async (payload) => {
          console.log('🔔 Game update received:', payload)
          
          // Reload game data when changes occur
          const { data } = await gameService.getGameById(gameId)
          if (data) {
            console.log('🔄 Updated game data:', data)
            callback(data)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Game subscription status:', status)
      })

    return subscription
  },

  // Subscribe to all games updates for dashboard
  subscribeToGamesUpdates(callback: () => void) {
    console.log('📡 Setting up global games update subscription')
    
    const subscription = supabase
      .channel('games_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games'
        },
        (payload) => {
          console.log('🔔 Global game update received:', payload.eventType)
          callback()
        }
      )
      .subscribe((status) => {
        console.log('📡 Global games subscription status:', status)
      })

    return subscription
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