export interface Profile {
  id: string
  name: string
  email: string
  avatar_url?: string
  location: string
  bio?: string
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  preferred_sports: string[]
  games_played: number
  games_organized: number
  average_rating: number
  profile_completed: boolean
  created_at: string
  updated_at: string
}

export interface ProfileFormData {
  name: string
  location: string
  bio: string
  skill_level: 'beginner' | 'intermediate' | 'advanced' | ''
  preferred_sports: string[]
}