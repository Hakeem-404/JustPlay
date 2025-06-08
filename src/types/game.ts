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