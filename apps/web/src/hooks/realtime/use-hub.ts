import * as signalR from '@microsoft/signalr'
import { useCallback, useEffect, useRef, useState } from 'react'

// Main Hub Connection Hook
export function useHub(hubUrl: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const connectingRef = useRef(false)

  // Create and start connection
  const connect = useCallback(async () => {
    if (connectingRef.current || connectionRef.current) {
      return
    }

    connectingRef.current = true
    setError(null)

    try {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          withCredentials: false,
        })
        .configureLogging(signalR.LogLevel.Information)
        .build()

      connectionRef.current = connection

      await connection.start()
      setIsConnected(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      connectionRef.current = null
    } finally {
      connectingRef.current = false
    }
  }, [hubUrl])

  // Disconnect
  const disconnect = useCallback(async () => {
    if (!connectionRef.current) {
      return
    }

    try {
      await connectionRef.current.stop()
    } catch (err) {
      console.error('Error disconnecting:', err)
    } finally {
      connectionRef.current = null
      setIsConnected(false)
    }
  }, [])

  // Connect on mount
  useEffect(() => {
    connect()

    return () => {
      if (
        connectionRef.current?.state === signalR.HubConnectionState.Connected
      ) {
        disconnect()
      }
    }
  }, [connect, disconnect])

  // Invoke hub method
  const invoke = useCallback(async (methodName: string, ...args: unknown[]) => {
    if (!connectionRef.current) {
      throw new Error('Connection not established')
    }

    return connectionRef.current.invoke(methodName, ...args)
  }, [])

  return {
    isConnected,
    error,
    connection: connectionRef.current,
    invoke,
    connect,
    disconnect,
  }
}

export function useClientMethod<T = unknown>(
  hubConnection: signalR.HubConnection | null,
  methodName: string,
  callback: (data: T) => void,
) {
  useEffect(() => {
    if (!hubConnection) {
      return
    }

    // Register client method
    hubConnection.on(methodName, callback)

    // Cleanup
    return () => {
      hubConnection.off(methodName, callback)
    }
  }, [hubConnection, methodName, callback])
}

// Hook for joining a group
export function useHubGroup(
  hubConnection: signalR.HubConnection | null,
  groupMethod: string,
  groupId: string | undefined,
) {
  const hasJoinedRef = useRef(false)

  useEffect(() => {
    async function joinGroup() {
      if (!(hubConnection && groupId) || hasJoinedRef.current) {
        return
      }

      try {
        await hubConnection.invoke(groupMethod, groupId)
        hasJoinedRef.current = true
      } catch (err) {
        console.error(`Error joining group ${groupId}:`, err)
      }
    }

    if (hubConnection?.state === signalR.HubConnectionState.Connected) {
      joinGroup()
    } else if (hubConnection) {
      // Join when connected
      hubConnection.onreconnected(joinGroup)
    }

    return () => {
      hasJoinedRef.current = false
    }
  }, [hubConnection, groupMethod, groupId])
}
