export interface Game {
  id: string
  sport: string
  title?: string
  location: string
  latitude: number
  longitude: number
  date: string
  time: string
  maxPlayers: number
  currentPlayers: number
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'any'
  description?: string
  organizerId: string
  organizerName: string
  isPrivate: boolean
  status: 'active' | 'cancelled' | 'completed'
  createdAt: string
  updatedAt?: string
}

// Database interface (snake_case) - for reference
export interface GameDB {
  id: string
  sport: string
  title?: string
  location: string
  latitude: number
  longitude: number
  date: string
  time: string
  max_players: number
  current_players: number
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'any'
  description?: string
  organizer_id: string
  is_private: boolean
  status: 'active' | 'cancelled' | 'completed'
  created_at: string
  updated_at?: string
}

export interface GameFormData {
  sport: string
  title: string
  location: string
  latitude?: number
  longitude?: number
  date: string
  time: string
  maxPlayers: number
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'any'
  description: string
  isPrivate: boolean
}

export interface MapFilters {
  sports: string[]
  distance: number
  dateRange: 'today' | 'tomorrow' | 'week' | 'all'
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'any' | 'all'
}