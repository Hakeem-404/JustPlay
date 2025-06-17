import { useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '../contexts/AuthContext'

interface TypingIndicatorHook {
  startTyping: () => void
  stopTyping: () => void
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void
}

const TYPING_TIMEOUT = 3000 // Stop typing indicator after 3 seconds of inactivity

export function useTypingIndicator(
  channel: RealtimeChannel | null,
  conversationId: string
): TypingIndicatorHook {
  const { user } = useAuth()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const isTypingRef = useRef(false)

  const sendTypingIndicator = useCallback((convId: string, isTyping: boolean) => {
    if (!channel || !user) return

    console.log(`⌨️ Sending typing indicator: ${isTyping} for conversation ${convId}`)
    
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversation_id: convId,
        user_id: user.id,
        user_name: user.email?.split('@')[0] || 'User',
        is_typing: isTyping,
        timestamp: new Date().toISOString()
      }
    })
  }, [channel, user])

  const startTyping = useCallback(() => {
    if (!conversationId || isTypingRef.current) return

    isTypingRef.current = true
    sendTypingIndicator(conversationId, true)

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, TYPING_TIMEOUT)
  }, [conversationId, sendTypingIndicator])

  const stopTyping = useCallback(() => {
    if (!conversationId || !isTypingRef.current) return

    isTypingRef.current = false
    sendTypingIndicator(conversationId, false)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = undefined
    }
  }, [conversationId, sendTypingIndicator])

  // Cleanup on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTypingRef.current) {
        stopTyping()
      }
    }
  }, [stopTyping])

  return {
    startTyping,
    stopTyping,
    sendTypingIndicator
  }
}