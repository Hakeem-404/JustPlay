export interface ChatMessage {
  id: string
  gameId: string
  userId: string
  userName: string
  userAvatarUrl?: string
  content: string
  messageType: 'text' | 'system' | 'join' | 'leave'
  status: 'sent' | 'delivered' | 'read' | 'deleted'
  replyTo?: string
  editedAt?: string
  deletedAt?: string
  createdAt: string
  reactions: MessageReaction[]
}

export interface MessageReaction {
  emoji: string
  count: number
  users: {
    user_id: string
    name: string
  }[]
}

export interface ChatState {
  messages: ChatMessage[]
  loading: boolean
  hasMore: boolean
  unreadCount: number
  typingUsers: string[]
  error: string | null
}

export interface SendMessageData {
  content: string
  messageType?: 'text' | 'system'
  replyTo?: string
}