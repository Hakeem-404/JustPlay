import { supabase } from './supabase'

export const gameParticipantService = {
  async joinGame(gameId: string): Promise<{ data: any; error: string | null }> {
    try {
      console.log('🎯 Attempting to join game:', gameId)
      
      const { data, error } = await supabase.rpc('join_game', {
        game_id_param: gameId
      })

      if (error) {
        console.error('❌ Error joining game:', error)
        return { data: null, error: error.message }
      }

      if (!data.success) {
        console.warn('⚠️ Join game failed:', data.error)
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
        console.warn('⚠️ Leave game failed:', data.error)
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
      console.log('📊 Loading participants for game:', gameId)
      
      const { data, error } = await supabase.rpc('get_game_participants', {
        game_id_param: gameId
      })

      if (error) {
        console.error('❌ Error getting game participants:', error)
        return { data: null, error: error.message }
      }

      console.log('✅ Loaded participants:', data?.length || 0, 'participants')
      console.log('📋 Participant data:', data)
      
      return { data: data || [], error: null }
    } catch (err) {
      console.error('💥 Unexpected error getting participants:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getUserParticipation(gameId: string, userId: string): Promise<{ data: any; error: string | null }> {
    try {
      console.log('👤 Checking user participation:', { gameId, userId })
      
      const { data, error } = await supabase
        .from('game_participants')
        .select('status, joined_at')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .in('status', ['joined', 'waitlist'])
        .maybeSingle()

      if (error) {
        console.error('❌ Error getting user participation:', error)
        return { data: null, error: error.message }
      }

      console.log('✅ User participation status:', data?.status || 'none')
      return { data: data || null, error: null }
    } catch (err) {
      console.error('💥 Unexpected error getting user participation:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  // Enhanced real-time subscription for game participants
  subscribeToGameParticipants(gameId: string, callback: (participants: any[]) => void) {
    console.log('🔄 Setting up real-time subscription for game participants:', gameId)
    
    const subscription = supabase
      .channel(`game_participants_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'game_participants',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          console.log('🔔 Real-time participant change detected:', payload)
          console.log('📝 Event type:', payload.eventType)
          console.log('📄 Payload:', payload)
          
          // Reload participants when changes occur
          try {
            const { data } = await gameParticipantService.getGameParticipants(gameId)
            if (data) {
              console.log('🔄 Updated participant count:', data.length)
              callback(data)
            }
          } catch (error) {
            console.error('❌ Error reloading participants after real-time update:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Participant subscription status:', status)
      })

    return subscription
  },

  // Enhanced real-time subscription for game updates (player count changes)
  subscribeToGameUpdates(gameId: string, callback: (updatedGame: any) => void) {
    console.log('🔄 Setting up real-time subscription for game updates:', gameId)
    
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
          console.log('🔔 Real-time game update detected:', payload)
          console.log('📊 Updated game data:', payload.new)
          
          // Reload game data when changes occur
          try {
            const { gameService } = await import('./gameService')
            const { data } = await gameService.getGameById(gameId)
            if (data) {
              console.log('🔄 Updated game player count:', data.currentPlayers, '/', data.maxPlayers)
              callback(data)
            }
          } catch (error) {
            console.error('❌ Error reloading game after real-time update:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Game update subscription status:', status)
      })

    return subscription
  },

  // Debug function to check participant count directly from database
  async debugParticipantCount(gameId: string): Promise<void> {
    try {
      console.log('🔍 DEBUG: Checking participant count for game:', gameId)
      
      // Get raw participant data
      const { data: rawParticipants, error: rawError } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', gameId)
        .in('status', ['joined', 'waitlist'])
      
      if (rawError) {
        console.error('❌ DEBUG: Error getting raw participants:', rawError)
        return
      }
      
      console.log('📊 DEBUG: Raw participants from database:', rawParticipants)
      console.log('🔢 DEBUG: Raw participant count:', rawParticipants?.length || 0)
      
      // Get processed participant data
      const { data: processedParticipants, error: processedError } = await this.getGameParticipants(gameId)
      
      if (processedError) {
        console.error('❌ DEBUG: Error getting processed participants:', processedError)
        return
      }
      
      console.log('📋 DEBUG: Processed participants:', processedParticipants)
      console.log('🔢 DEBUG: Processed participant count:', processedParticipants?.length || 0)
      
      // Get game data to compare
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('current_players, max_players')
        .eq('id', gameId)
        .single()
      
      if (gameError) {
        console.error('❌ DEBUG: Error getting game data:', gameError)
        return
      }
      
      console.log('🎮 DEBUG: Game current_players from database:', gameData.current_players)
      console.log('🎮 DEBUG: Game max_players from database:', gameData.max_players)
      
      // Compare counts
      const actualCount = rawParticipants?.length || 0
      const gameCount = gameData.current_players || 0
      
      if (actualCount !== gameCount) {
        console.warn('⚠️ DEBUG: MISMATCH! Participant count:', actualCount, 'vs Game count:', gameCount)
      } else {
        console.log('✅ DEBUG: Counts match! Participant count:', actualCount, 'Game count:', gameCount)
      }
      
    } catch (error) {
      console.error('💥 DEBUG: Unexpected error during debug:', error)
    }
  }
}