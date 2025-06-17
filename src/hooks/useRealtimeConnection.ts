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
const HEARTBEAT_INTERVAL = 10000 // Check every 10 seconds

export function useRealtimeConnection(): RealtimeConnectionHook {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    reconnectAttempts: 0
  })
  
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>()
  const isInitializedRef = useRef(false)

  // Check if we have a valid connection
  const checkConnection = useCallback(() => {
    if (!user) {
      setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }))
      return false
    }

    // Check if Supabase realtime is connected
    const isRealtimeConnected = supabase.realtime.isConnected()
    
    // Also check if we have any active channels
    const hasActiveChannels = channelsRef.current.size > 0
    
    console.log('🔍 Connection check:', {
      isRealtimeConnected,
      hasActiveChannels,
      channelCount: channelsRef.current.size,
      user: !!user
    })

    if (isRealtimeConnected || hasActiveChannels) {
      setConnectionStatus(prev => ({
        ...prev,
        status: 'connected',
        lastConnected: new Date(),
        reconnectAttempts: 0,
        error: undefined
      }))
      return true
    } else {
      // Only set to disconnected if we were previously connected or trying to connect
      setConnectionStatus(prev => {
        if (prev.status === 'connected' || prev.status === 'connecting') {
          return { ...prev, status: 'disconnected' }
        }
        return prev
      })
      return false
    }
  }, [user])

  // Monitor connection health with heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    // Initial check
    checkConnection()

    heartbeatIntervalRef.current = setInterval(() => {
      checkConnection()
    }, HEARTBEAT_INTERVAL)
  }, [checkConnection])

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
        // Force reconnect Supabase realtime
        supabase.realtime.disconnect()
        
        setTimeout(() => {
          // Restart heartbeat which will trigger connection check
          startHeartbeat()
        }, 1000)
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
      channelsRef.current.delete(channelName)
    }

    console.log(`📡 Subscribing to channel: ${channelName}`)

    // Set status to connecting when we start subscribing
    setConnectionStatus(prev => ({ ...prev, status: 'connecting' }))

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
        console.log(`📡 Removed channel ${channelName} from tracking`)
      }
    })

    // Update connection status if no channels remain
    if (channelsRef.current.size === 0) {
      setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }))
    }
  }, [])

  // Initialize connection when user is available
  useEffect(() => {
    if (user && !isInitializedRef.current) {
      console.log('🔌 Initializing real-time connection for user:', user.id)
      isInitializedRef.current = true
      setConnectionStatus(prev => ({ ...prev, status: 'connecting' }))
      startHeartbeat()
    } else if (!user) {
      console.log('🔌 User not available, disconnecting real-time')
      isInitializedRef.current = false
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
      if (!user) {
        stopHeartbeat()
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
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
      isInitializedRef.current = false
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