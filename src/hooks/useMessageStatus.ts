import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export interface MessageStatus {
  id: string
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: Date
  error?: string
}

interface MessageStatusHook {
  messageStatuses: Map<string, MessageStatus>
  updateMessageStatus: (messageId: string, status: MessageStatus['status'], error?: string) => void
  getMessageStatus: (messageId: string) => MessageStatus | undefined
  clearMessageStatus: (messageId: string) => void
  retryFailedMessage: (messageId: string, retryFn: () => Promise<void>) => Promise<void>
}

export function useMessageStatus(): MessageStatusHook {
  const { user } = useAuth()
  const [messageStatuses, setMessageStatuses] = useState<Map<string, MessageStatus>>(new Map())
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const updateMessageStatus = useCallback((
    messageId: string, 
    status: MessageStatus['status'], 
    error?: string
  ) => {
    console.log(`📊 Updating message ${messageId} status to: ${status}`, error ? `Error: ${error}` : '')
    
    setMessageStatuses(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(messageId)
      
      newMap.set(messageId, {
        id: messageId,
        status,
        timestamp: new Date(),
        error: error || existing?.error
      })
      
      return newMap
    })

    // Clear retry timeout if message is successful
    if (status === 'sent' || status === 'delivered' || status === 'read') {
      const timeout = retryTimeoutsRef.current.get(messageId)
      if (timeout) {
        clearTimeout(timeout)
        retryTimeoutsRef.current.delete(messageId)
      }
    }
  }, [])

  const getMessageStatus = useCallback((messageId: string): MessageStatus | undefined => {
    return messageStatuses.get(messageId)
  }, [messageStatuses])

  const clearMessageStatus = useCallback((messageId: string) => {
    setMessageStatuses(prev => {
      const newMap = new Map(prev)
      newMap.delete(messageId)
      return newMap
    })

    // Clear any retry timeout
    const timeout = retryTimeoutsRef.current.get(messageId)
    if (timeout) {
      clearTimeout(timeout)
      retryTimeoutsRef.current.delete(messageId)
    }
  }, [])

  const retryFailedMessage = useCallback(async (
    messageId: string, 
    retryFn: () => Promise<void>
  ): Promise<void> => {
    const status = messageStatuses.get(messageId)
    if (!status || status.status !== 'failed') {
      console.warn(`Cannot retry message ${messageId}: not in failed state`)
      return
    }

    console.log(`🔄 Retrying failed message: ${messageId}`)
    updateMessageStatus(messageId, 'sending')

    try {
      await retryFn()
      updateMessageStatus(messageId, 'sent')
    } catch (error) {
      console.error(`❌ Retry failed for message ${messageId}:`, error)
      updateMessageStatus(messageId, 'failed', error instanceof Error ? error.message : 'Retry failed')
    }
  }, [messageStatuses, updateMessageStatus])

  // Auto-retry failed messages with exponential backoff
  useEffect(() => {
    messageStatuses.forEach((status, messageId) => {
      if (status.status === 'failed' && !retryTimeoutsRef.current.has(messageId)) {
        // Auto-retry after 5 seconds for the first failure
        const timeout = setTimeout(() => {
          console.log(`🔄 Auto-retrying failed message: ${messageId}`)
          // This would need to be connected to the actual retry logic in the component
          // For now, we just log it
        }, 5000)
        
        retryTimeoutsRef.current.set(messageId, timeout)
      }
    })
  }, [messageStatuses])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      retryTimeoutsRef.current.clear()
    }
  }, [])

  return {
    messageStatuses,
    updateMessageStatus,
    getMessageStatus,
    clearMessageStatus,
    retryFailedMessage
  }
}