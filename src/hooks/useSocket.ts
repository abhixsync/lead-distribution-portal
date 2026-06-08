'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// Module-level singleton — one Socket.IO connection per browser tab.
// This survives React component re-mounts and hot reloads.
let globalSocket: TypedSocket | null = null

/**
 * Returns the Socket.IO client singleton.
 *
 * The socket connects on first call and is reused across all dashboard
 * components. Disconnection happens only when the page is closed/refreshed.
 */
export function useSocket(): { socket: TypedSocket | null; connected: boolean } {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<TypedSocket | null>(null)

  useEffect(() => {
    // Create the socket singleton if it doesn't exist yet
    if (!globalSocket) {
      const url =
        typeof window !== 'undefined'
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

      globalSocket = io(url, {
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling'],
        // Reconnect on disconnect with exponential backoff
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      }) as TypedSocket
    }

    socketRef.current = globalSocket

    // Sync the connected state
    setConnected(globalSocket.connected)

    function onConnect() {
      setConnected(true)
    }
    function onDisconnect() {
      setConnected(false)
    }

    globalSocket.on('connect', onConnect)
    globalSocket.on('disconnect', onDisconnect)

    return () => {
      globalSocket?.off('connect', onConnect)
      globalSocket?.off('disconnect', onDisconnect)
      // Do NOT call globalSocket.disconnect() here — other components still use it
    }
  }, [])

  return { socket: socketRef.current, connected }
}
