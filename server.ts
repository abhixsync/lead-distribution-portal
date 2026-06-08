/**
 * Custom Next.js server with Socket.IO integration.
 *
 * WHY a custom server?
 * Socket.IO requires a persistent `http.Server` instance to attach to.
 * Next.js 15's built-in `next dev` / `next start` doesn't expose one.
 * This file creates the HTTP server, attaches Socket.IO, stores the
 * instance on `globalThis.socketIO`, then delegates all HTTP requests
 * to Next.js's request handler.
 *
 * The `global.socketIO` assignment happens BEFORE `httpServer.listen()`
 * so that any API route handlers that call emitLeadNew() etc. find the
 * socket instance already available.
 *
 * Run with: tsx server.ts
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './src/types/socket'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)
const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling request', req.url, err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: appUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Allow both polling and WebSocket transports
    transports: ['websocket', 'polling'],
  })

  // Store on globalThis BEFORE listen so API routes can emit events immediately
  ;(globalThis as any).socketIO = io

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`)

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`)
    })

    socket.on('error', (err) => {
      console.error(`[Socket.IO] Socket error on ${socket.id}:`, err)
    })
  })

  httpServer
    .once('error', (err) => {
      console.error('HTTP server error:', err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Lead Distribution Portal ready`)
      console.log(`> Local:    http://localhost:${port}`)
      console.log(`> Mode:     ${dev ? 'development' : 'production'}`)
    })
})
