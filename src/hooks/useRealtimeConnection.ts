import { useEffect, useRef, useState, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  error?: string
  lastConnected?: Date
  reconnectAttempts: number
}

export interface RealtimeConnectionHook {
  connectionStatus: ConnectionStatus
  subscribe: (channelName: string, callback: (payload: any) => void) => RealtimeChannel | null
  unsubscribe: (channel: RealtimeChannel) => void
  reconnect: () => void
  isConnected: boolean
}

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 1000 // Start with 1 second

export function useRealtimeConnection(): RealtimeConnectionHook {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    reconnectAttempts: 0
  })
  
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>()

  // Monitor connection health with heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (supabase.realtime.isConnected()) {
        setConnectionStatus(prev => ({
          ...prev,
          status: 'connected',
          lastConnected: new Date(),
          reconnectAttempts: 0
        }))
      } else {
        setConnectionStatus(prev => ({
          ...prev,
          status: 'disconnected'
        }))
      }
    }, 5000) // Check every 5 seconds
  }, [])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = undefined
    }
  }, [])

  // Exponential backoff for reconnection
  const getReconnectDelay = (attempt: number) => {
    return Math.min(RECONNECT_DELAY * Math.pow(2, attempt), 30000) // Max 30 seconds
  }

  const reconnect = useCallback(() => {
    if (!user) return

    setConnectionStatus(prev => {
      if (prev.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        return {
          ...prev,
          status: 'error',
          error: 'Max reconnection attempts reached'
        }
      }

      const newAttempts = prev.reconnectAttempts + 1
      const delay = getReconnectDelay(newAttempts)

      console.log(`🔄 Attempting reconnection ${newAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`)

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        // Disconnect and reconnect all channels
        channelsRef.current.forEach((channel) => {
          supabase.removeChannel(channel)
        })
        
        // Clear channels and let components resubscribe
        channelsRef.current.clear()
        
        // Restart heartbeat
        startHeartbeat()
      }, delay)

      return {
        ...prev,
        status: 'connecting',
        reconnectAttempts: newAttempts
      }
    })
  }, [user, startHeartbeat])

  const subscribe = useCallback((channelName: string, callback: (payload: any) => void): RealtimeChannel | null => {
    if (!user) {
      console.warn('Cannot subscribe: user not authenticated')
      return null
    }

    // Remove existing channel if it exists
    const existingChannel = channelsRef.current.get(channelName)
    if (existingChannel) {
      supabase.removeChannel(existingChannel)
    }

    console.log(`📡 Subscribing to channel: ${channelName}`)

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log(`📨 Received real-time update on ${channelName}:`, payload)
        callback(payload)
      })
      .on('presence', { event: 'sync' }, () => {
        console.log(`👥 Presence sync on ${channelName}`)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`👋 User joined ${channelName}:`, key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`👋 User left ${channelName}:`, key, leftPresences)
      })
      .subscribe((status) => {
        console.log(`📡 Channel ${channelName} subscription status:`, status)
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus(prev => ({
            ...prev,
            status: 'connected',
            lastConnected: new Date(),
            reconnectAttempts: 0,
            error: undefined
          }))
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus(prev => ({
            ...prev,
            status: 'error',
            error: `Channel ${channelName} error`
          }))
          
          // Attempt to reconnect on channel error
          setTimeout(() => reconnect(), 2000)
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus(prev => ({
            ...prev,
            status: 'error',
            error: `Channel ${channelName} timed out`
          }))
          
          // Attempt to reconnect on timeout
          setTimeout(() => reconnect(), 2000)
        } else if (status === 'CLOSED') {
          setConnectionStatus(prev => ({
            ...prev,
            status: 'disconnected'
          }))
        }
      })

    channelsRef.current.set(channelName, channel)
    return channel
  }, [user, reconnect])

  const unsubscribe = useCallback((channel: RealtimeChannel) => {
    console.log('📡 Unsubscribing from channel')
    supabase.removeChannel(channel)
    
    // Remove from our tracking
    channelsRef.current.forEach((trackedChannel, channelName) => {
      if (trackedChannel === channel) {
        channelsRef.current.delete(channelName)
      }
    })
  }, [])

  // Initialize connection when user is available
  useEffect(() => {
    if (user) {
      console.log('🔌 Initializing real-time connection for user:', user.id)
      setConnectionStatus(prev => ({ ...prev, status: 'connecting' }))
      startHeartbeat()
    } else {
      console.log('🔌 User not available, disconnecting real-time')
      stopHeartbeat()
      
      // Clean up all channels
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel)
      })
      channelsRef.current.clear()
      
      setConnectionStatus({
        status: 'disconnected',
        reconnectAttempts: 0
      })
    }

    return () => {
      stopHeartbeat()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [user, startHeartbeat, stopHeartbeat])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🔌 Cleaning up real-time connection')
      stopHeartbeat()
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      // Remove all channels
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel)
      })
      channelsRef.current.clear()
    }
  }, [stopHeartbeat])

  return {
    connectionStatus,
    subscribe,
    unsubscribe,
    reconnect,
    isConnected: connectionStatus.status === 'connected'
  }
}