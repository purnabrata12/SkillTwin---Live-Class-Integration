import { useEffect, useMemo, useRef } from 'react'
import { io } from 'socket.io-client'
import { API_URL } from '../services/api'

export default function useSessionSocket({ roomName, identity, role, name, onEvent }) {
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const socket = useMemo(() => io(API_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    timeout: 10000,
    query: { roomName, identity, role, name },
    transports: ['websocket', 'polling']
  }), [roomName, identity, role, name])

  useEffect(() => {
    const forward = event => data => onEventRef.current?.(event, data)
    const handlers = {
      'session-state': forward('session-state'),
      'admitted': forward('admitted'),
      'rejected': forward('rejected'),
      'chat-history': forward('chat-history'),
      'chat-message': forward('chat-message'),
      'hand-state': forward('hand-state'),
      'hand-lowered': forward('hand-lowered'),
      'spotlight': forward('spotlight'),
      'moderation-control': forward('moderation-control'),
      'removed': forward('removed'),
      'session-ended': forward('session-ended'),
      'join-request': forward('join-request'),
      
      'whiteboard-state': forward('whiteboard-state'),
      'whiteboard-open': forward('whiteboard-open'),
      'whiteboard-stroke': forward('whiteboard-stroke'),
      'whiteboard-clear': forward('whiteboard-clear'),
      'whiteboard-close': forward('whiteboard-close'),
    }

    const onConnect = () => onEventRef.current?.('socket-connected', { id: socket.id })
    const onDisconnect = reason => onEventRef.current?.('socket-disconnected', { reason })
    const onConnectError = err => onEventRef.current?.('socket-error', { message: err?.message || 'Realtime connection failed.' })

    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    if (!socket.connected) socket.connect()
    else onConnect()

    return () => {
      for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.disconnect()
    }
  }, [socket])

  return socket
}
