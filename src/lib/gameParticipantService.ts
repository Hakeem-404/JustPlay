import { supabase } from './supabase'

export const gameParticipantService = {
  async joinGame(gameId: string): Promise<{ data: any; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('join_game', {
        game_id_param: gameId
      })

      if (error) {
        console.error('Error joining game:', error)
        return { data: null, error: error.message }
      }

      if (!data.success) {
        return { data: null, error: data.error }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error joining game:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async leaveGame(gameId: string): Promise<{ data: any; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('leave_game', {
        game_id_param: gameId
      })

      if (error) {
        console.error('Error leaving game:', error)
        return { data: null, error: error.message }
      }

      if (!data.success) {
        return { data: null, error: data.error }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error leaving game:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getGameParticipants(gameId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('get_game_participants', {
        game_id_param: gameId
      })

      if (error) {
        console.error('Error getting game participants:', error)
        return { data: null, error: error.message }
      }

      return { data: data || [], error: null }
    } catch (err) {
      console.error('Unexpected error getting participants:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getUserParticipation(gameId: string, userId: string): Promise<{ data: any; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('game_participants')
        .select('status, joined_at')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .in('status', ['joined', 'waitlist'])
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error getting user participation:', error)
        return { data: null, error: error.message }
      }

      return { data: data || null, error: null }
    } catch (err) {
      console.error('Unexpected error getting user participation:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  // Real-time subscription for game participants
  subscribeToGameParticipants(gameId: string, callback: (participants: any[]) => void) {
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
        async () => {
          // Reload participants when changes occur
          const { data } = await this.getGameParticipants(gameId)
          if (data) {
            callback(data)
          }
        }
      )
      .subscribe()

    return subscription
  }
}