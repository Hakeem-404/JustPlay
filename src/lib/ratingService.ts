import { supabase } from './supabase'

export interface GameRating {
  id: string
  gameId: string
  raterId: string
  ratedId: string
  rating: number
  comment?: string
  createdAt: string
}

export interface PlayerStats {
  id: string
  userId: string
  totalRatings: number
  averageRating: number
  gamesCompleted: number
  gamesNoShow: number
  completionRate: number
  positiveFeedbackCount: number
  verifiedPlayer: boolean
  updatedAt: string
}

export interface PlayerRating {
  ratingId: string
  gameId: string
  gameSport: string
  gameDate: string
  raterName: string
  rating: number
  comment?: string
  createdAt: string
}

export interface RatingSubmission {
  rated_id: string
  rating: number
  comment?: string
}

export const ratingService = {
  async submitGameRatings(gameId: string, ratings: RatingSubmission[]): Promise<{ data: any; error: string | null }> {
    try {
      console.log('⭐ Submitting ratings for game:', gameId, ratings)
      
      const { data, error } = await supabase.rpc('submit_game_ratings', {
        game_id_param: gameId,
        ratings_data: ratings
      })

      if (error) {
        console.error('❌ Error submitting ratings:', error)
        return { data: null, error: error.message }
      }

      if (!data.success) {
        console.warn('⚠️ Rating submission failed:', data.error)
        return { data: null, error: data.error }
      }

      console.log('✅ Ratings submitted successfully:', data)
      return { data, error: null }
    } catch (err) {
      console.error('💥 Unexpected error submitting ratings:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getPlayerStats(userId: string): Promise<{ data: PlayerStats | null; error: string | null }> {
    try {
      console.log('📊 Loading player stats for:', userId)
      
      const { data, error } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('❌ Error loading player stats:', error)
        return { data: null, error: error.message }
      }

      // If no stats exist yet, try to calculate them
      if (!data) {
        console.log('📊 No player stats found, triggering calculation')
        
        // Call RPC to calculate stats for this user
        const { error: calcError } = await supabase.rpc('update_player_stats', {
          user_id_param: userId
        })
        
        if (calcError) {
          console.error('❌ Error calculating player stats:', calcError)
          return { data: null, error: calcError.message }
        }
        
        // Try to fetch the newly calculated stats
        const { data: freshData, error: freshError } = await supabase
          .from('player_stats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
          
        if (freshError) {
          console.error('❌ Error loading fresh player stats:', freshError)
          return { data: null, error: freshError.message }
        }
        
        if (!freshData) {
          console.warn('⚠️ Still no player stats after calculation')
          return { data: null, error: 'No player stats available' }
        }
        
        // Transform snake_case to camelCase
        const transformedData: PlayerStats = {
          id: freshData.id,
          userId: freshData.user_id,
          totalRatings: freshData.total_ratings,
          averageRating: freshData.average_rating,
          gamesCompleted: freshData.games_completed,
          gamesNoShow: freshData.games_no_show,
          completionRate: freshData.completion_rate,
          positiveFeedbackCount: freshData.positive_feedback_count,
          verifiedPlayer: freshData.verified_player,
          updatedAt: freshData.updated_at
        }
        
        console.log('✅ Loaded fresh player stats:', transformedData)
        return { data: transformedData, error: null }
      }

      // Transform snake_case to camelCase
      const transformedData: PlayerStats = {
        id: data.id,
        userId: data.user_id,
        totalRatings: data.total_ratings,
        averageRating: data.average_rating,
        gamesCompleted: data.games_completed,
        gamesNoShow: data.games_no_show,
        completionRate: data.completion_rate,
        positiveFeedbackCount: data.positive_feedback_count,
        verifiedPlayer: data.verified_player,
        updatedAt: data.updated_at
      }

      console.log('✅ Loaded player stats:', transformedData)
      return { data: transformedData, error: null }
    } catch (err) {
      console.error('💥 Unexpected error loading player stats:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getPlayerRatings(userId: string, limit = 10, offset = 0): Promise<{ data: PlayerRating[] | null; error: string | null }> {
    try {
      console.log('⭐ Loading player ratings for:', userId)
      
      const { data, error } = await supabase.rpc('get_player_ratings', {
        user_id_param: userId,
        limit_param: limit,
        offset_param: offset
      })

      if (error) {
        console.error('❌ Error loading player ratings:', error)
        return { data: null, error: error.message }
      }

      // Transform snake_case to camelCase
      const transformedData: PlayerRating[] = data?.map((rating: any) => ({
        ratingId: rating.rating_id,
        gameId: rating.game_id,
        gameSport: rating.game_sport,
        gameDate: rating.game_date,
        raterName: rating.rater_name,
        rating: rating.rating,
        comment: rating.comment,
        createdAt: rating.created_at
      })) || []

      console.log('✅ Loaded player ratings:', transformedData.length)
      return { data: transformedData, error: null }
    } catch (err) {
      console.error('💥 Unexpected error loading player ratings:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async getGameParticipantsForRating(gameId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      console.log('👥 Loading participants for rating in game:', gameId)
      
      const { data, error } = await supabase.rpc('get_game_participants_for_rating', {
        game_id_param: gameId
      })

      if (error) {
        console.error('❌ Error loading participants for rating:', error)
        return { data: null, error: error.message }
      }

      console.log('✅ Loaded participants for rating:', data?.length || 0)
      return { data: data || [], error: null }
    } catch (err) {
      console.error('💥 Unexpected error loading participants for rating:', err)
      return { data: null, error: 'An unexpected error occurred' }
    }
  },

  async hasUserRatedGame(gameId: string): Promise<{ data: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('game_ratings')
        .select('id')
        .eq('game_id', gameId)
        .eq('rater_id', (await supabase.auth.getUser()).data.user?.id)
        .limit(1)

      if (error) {
        console.error('❌ Error checking if user rated game:', error)
        return { data: false, error: error.message }
      }

      return { data: (data?.length || 0) > 0, error: null }
    } catch (err) {
      console.error('💥 Unexpected error checking rating status:', err)
      return { data: false, error: 'An unexpected error occurred' }
    }
  }
}