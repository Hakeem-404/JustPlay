export interface Friendship {
  id: string
  requesterId: string
  addresseeId: string
  status: 'pending' | 'accepted' | 'blocked'
  createdAt: string
  updatedAt: string
}

export interface Friend {
  id: string
  name: string
  avatarUrl?: string
  location: string
  friendshipCreatedAt: string
}

export interface FriendRequest {
  id: string
  requesterId: string
  requesterName: string
  requesterAvatarUrl?: string
  requesterLocation: string
  createdAt: string
}

export interface PrivateMessage {
  id: string
  conversationId: string
  senderId: string
  recipientId: string
  senderName: string
  senderAvatarUrl?: string
  content: string
  readAt?: string
  createdAt: string
}

export interface Conversation {
  id: string
  participant1: string
  participant2: string
  lastMessageAt: string
  createdAt: string
  otherParticipant: {
    id: string
    name: string
    avatarUrl?: string
  }
  lastMessage?: {
    content: string
    senderId: string
    createdAt: string
  }
  unreadCount: number
}