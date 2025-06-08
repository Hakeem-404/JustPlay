import { supabase } from './supabase'

export const gameParticipantService = {
  async joinGame(gameId: string): Promise<{ data: any; error: string | null }> {
    try {
      console.log('🎮 Attempting to join game:', gameId)
      
      const { data, error } = await supabase.rpc('join_game', {
        game_id_param: gameId
      })

      if (error) {
        console.error('❌ Error joining game:', error)
        return { data: null, error: error.message }
      }

      if (!data.success) {
        console.error('❌ Join game failed:', data.error)
        return { data: null, error: data.error }
      }

      console.log('✅ Successfully joined game:', data)
      return { data, error: null }
    } catch (err) {
      console.error('💥 Unexpected error joining game:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async leaveGame(gameId: string): Promise<{ data: any; error: string | null }> {
    try {
      console.log('🚪 Attempting to leave game:', gameId)
      
      const { data, error } = await supabase.rpc('leave_game', {
        game_id_param: gameId
      })

      if (error) {
        console.error('❌ Error leaving game:', error)
        return { data: null, error: error.message }
      }

      if (!data.success) {
        console.error('❌ Leave game failed:', data.error)
        return { data: null, error: data.error }
      }

      console.log('✅ Successfully left game:', data)
      return { data, error: null }
    } catch (err) {
      console.error('💥 Unexpected error leaving game:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getGameParticipants(gameId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      console.log('👥 Loading participants for game:', gameId)
      
      const { data, error } = await supabase.rpc('get_game_participants', {
        game_id_param: gameId
      })

      if (error) {
        console.error('❌ Error getting game participants:', error)
        return { data: null, error: error.message }
      }

      console.log('✅ Loaded participants:', data?.length || 0, 'participants')
      console.log('📊 Participant data:', data)
      
      return { data: data || [], error: null }
    } catch (err) {
      console.error('💥 Unexpected error getting participants:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getUserParticipation(gameId: string, userId: string): Promise<{ data: any; error: string | null }> {
    try {
      console.log('🔍 Checking user participation for game:', gameId, 'user:', userId)
      
      const { data, error } = await supabase
        .from('game_participants')
        .select('status, joined_at')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .in('status', ['joined', 'waitlist'])
        .maybeSingle() // Use maybeSingle() instead of single() to handle no results

      if (error) {
        console.error('❌ Error getting user participation:', error)
        return { data: null, error: error.message }
      }

      console.log('✅ User participation status:', data?.status || 'none')
      
      // Return null data if user hasn't joined (no error)
      return { data: data || null, error: null }
    } catch (err) {
      console.error('💥 Unexpected error getting user participation:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getGameCurrentCount(gameId: string): Promise<{ data: { currentPlayers: number; maxPlayers: number } | null; error: string | null }> {
    try {
      console.log('🔢 Getting current player count for game:', gameId)
      
      // Get current count from participants table (source of truth)
      const { data: participantsData, error: participantsError } = await supabase
        .from('game_participants')
        .select('status')
        .eq('game_id', gameId)
        .eq('status', 'joined')

      if (participantsError) {
        console.error('❌ Error counting participants:', participantsError)
        return { data: null, error: participantsError.message }
      }

      // Get max players from game
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('max_players')
        .eq('id', gameId)
        .single()

      if (gameError) {
        console.error('❌ Error getting game max players:', gameError)
        return { data: null, error: gameError.message }
      }

      const currentPlayers = participantsData?.length || 0
      const maxPlayers = gameData?.max_players || 0

      console.log('📊 Current count - Joined:', currentPlayers, 'Max:', maxPlayers)

      return { 
        data: { 
          currentPlayers, 
          maxPlayers 
        }, 
        error: null 
      }
    } catch (err) {
      console.error('💥 Unexpected error getting game count:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  // Real-time subscription for game participants
  subscribeToGameParticipants(gameId: string, callback: (participants: any[]) => void) {
    console.log('🔔 Setting up real-time subscription for game participants:', gameId)
    
    const subscription = supabase
      .channel(`game_participants_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          console.log('🔄 Participant change detected:', payload.eventType, payload)
          
          // Reload participants when changes occur
          const { data } = await this.getGameParticipants(gameId)
          if (data) {
            console.log('🔄 Updated participants list:', data.length, 'participants')
            callback(data)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Participant subscription status:', status)
      })

    return subscription
  },

  // Real-time subscription for game updates (player count changes)
  subscribeToGameUpdates(gameId: string, callback: (count: { currentPlayers: number; maxPlayers: number }) => void) {
    console.log('🔔 Setting up real-time subscription for game updates:', gameId)
    
    const subscription = supabase
      .channel(`game_updates_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        async (payload) => {
          console.log('🔄 Game update detected:', payload)
          
          // Get updated count
          const { data } = await this.getGameCurrentCount(gameId)
          if (data) {
            console.log('🔄 Updated game count:', data)
            callback(data)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Game update subscription status:', status)
      })

    return subscription
  }
}