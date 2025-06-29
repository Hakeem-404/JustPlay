import React, { useState, useEffect } from 'react'
import { 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  User,
  Star,
  Share2,
  AlertCircle,
  CheckCircle,
  UserPlus,
  UserMinus,
  ExternalLink,
  Crown,
  Ban,
  MessageCircle,
  Info
} from 'lucide-react'
import { Game } from '../types/game'
import { useAuth } from '../contexts/AuthContext'
import { gameParticipantService } from '../lib/gameParticipantService'
import { gameService } from '../lib/gameService'
import { chatService } from '../lib/chatService'
import GameChat from './chat/GameChat'
import { Link } from 'react-router-dom'

interface GameDetailsModalProps {
  game: Game | null
  isOpen: boolean
  onClose: () => void
  onGameUpdate?: (updatedGame: Game) => void
}

interface Participant {
  participant_id: string
  user_id: string
  name: string
  avatar_url?: string
  status: 'joined' | 'waitlist'
  joined_at: string
  average_rating: number
}

export default function GameDetailsModal({ game, isOpen, onClose, onGameUpdate }: GameDetailsModalProps) {
  // ... rest of the component code ...

  const formatDate = (date: string) => {
    const gameDate = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (gameDate.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (gameDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      }).format(gameDate)
    }
  }

  // ... rest of the component code ...
}