import './env.js'
import express from 'express'
import cors from 'cors'
import http from 'http'
import crypto from 'crypto'
import { Server as SocketIOServer } from 'socket.io'
import { sessions, createSession, publicSession, isTrainer, getSession, normalizeRoomName, saveSessions } from './store.js'
import { LIVEKIT_URL, livekitConfigured, makeToken, roomService, verifyLiveKitCredentials, credentialHint } from './livekit.js'

const PORT = Number(process.env.PORT || 3001)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,https://skilltwin-five.vercel.app'
const ALLOWED_ORIGINS = CLIENT_ORIGIN.split(',').map(v => v.trim()).filter(Boolean)
const corsOrigin = ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS

const app = express()
const httpServer = http.createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE'] }
})

app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '1mb' }))

const sendSession = session => {
  saveSessions()
  // Trainees receive only public classroom state. Waiting-room and removed-user
  // details are sent only to the trainer socket room.
  io.to(session.roomName).emit('session-state', publicSession(session, false))
  io.to(`${session.roomName}:trainer`).emit('session-state', publicSession(session, true))
}

app.get('/api/health', async (_, res) => {
  const credentialCheck = await verifyLiveKitCredentials().catch(err => ({ ok:false, message:err.message }))
  res.json({
    ok: true,
    livekitConfigured,
    livekitUrl: livekitConfigured ? LIVEKIT_URL : '',
    livekitCredentialsValid: Boolean(credentialCheck?.ok),
    livekitCredentialMessage: credentialCheck?.message || '',
    credentialHint,
  })
})

app.post('/api/sessions', (req, res) => {
  const { trainerIdentity } = req.body
  if (!trainerIdentity) return res.status(400).json({ error: 'trainerIdentity is required.' })

  const requested = normalizeRoomName(req.body.roomName)
  if (requested && sessions.has(requested)) {
    return res.status(409).json({ error: 'That meeting ID already exists.' })
  }

  const session = createSession(req.body)
  res.status(201).json(publicSession(session, true))
})

app.get('/api/sessions/:roomName', (req, res) => {
  const session = getSession(req.params.roomName)
  if (!session) return res.status(404).json({ error: 'Live session not found. Copy the exact trainee invite link from the trainer Details panel.' })
  res.json(publicSession(session, false))
})

app.put('/api/sessions/:roomName', (req, res) => {
  const session = getSession(req.params.roomName)
  if (!session) return res.status(404).json({ error: 'Live session not found. Copy the exact trainee invite link from the trainer Details panel.' })

  const { identity, role, patch = {} } = req.body
  if (!isTrainer(session, identity, role)) {
    return res.status(403).json({ error: 'Trainer permission required.' })
  }

  const allowed = [
    'courseName',
    'sessionTitle',
    'startTime',
    'endTime',
    'waitingRoom',
    'muteOnEntry',
    'allowTraineeMic',
    'allowTraineeCamera',
    'allowTraineeScreenShare'
  ]

  for (const key of allowed) {
    if (key in patch) session[key] = patch[key]
  }

  sendSession(session)
  res.json(publicSession(session, true))
})

app.post('/api/sessions/:roomName/join-request', (req, res) => {
  const session = getSession(req.params.roomName)
  if (!session) return res.status(404).json({ error: 'Live session not found. Copy the exact trainee invite link from the trainer Details panel.' })
  if (session.ended) return res.status(410).json({ error: 'This live class has ended.' })

  const { identity, name, role } = req.body
  if (!identity || !name) return res.status(400).json({ error: 'Identity and name are required.' })

  if (role === 'trainer') {
    if (!isTrainer(session, identity, role)) {
      return res.status(403).json({ error: 'This account is not the trainer for this session.' })
    }
    return res.json({ status: 'admitted' })
  }

  if (session.removed.has(identity)) {
    return res.status(403).json({ error: 'You were removed from this class. The trainer must allow you to rejoin.' })
  }

  if (session.locked) {
    return res.status(423).json({ error: 'This class is currently locked.' })
  }

  if (!session.waitingRoom || session.admitted.has(identity)) {
    session.admitted.add(identity)
    sendSession(session)
    return res.json({ status: 'admitted' })
  }

  session.pending.set(identity, { identity, name, requestedAt: new Date().toISOString() })
  io.to(`${session.roomName}:trainer`).emit('join-request', { identity, name })
  sendSession(session)
  res.json({ status: 'pending' })
})

app.post('/api/sessions/:roomName/admit', (req, res) => {
  const session = getSession(req.params.roomName)
  if (!session) return res.status(404).json({ error: 'Live session not found. Copy the exact trainee invite link from the trainer Details panel.' })

  const { identity, role, targetIdentity, admitAll } = req.body
  if (!isTrainer(session, identity, role)) {
    return res.status(403).json({ error: 'Trainer permission required.' })
  }

  if (admitAll) {
    for (const [id] of session.pending) {
      session.admitted.add(id)
      io.to(`${session.roomName}:${id}`).emit('admitted')
    }
    session.pending.clear()
  } else {
    if (!targetIdentity) return res.status(400).json({ error: 'targetIdentity is required.' })
    const pending = session.pending.get(targetIdentity)
    if (!pending) return res.status(404).json({ error: 'That user is no longer waiting.' })
    session.pending.delete(targetIdentity)
    session.admitted.add(targetIdentity)
    io.to(`${session.roomName}:${targetIdentity}`).emit('admitted')
  }

  sendSession(session)
  res.json({ ok: true })
})

app.post('/api/sessions/:roomName/reject', (req, res) => {
  const session = getSession(req.params.roomName)
  if (!session) return res.status(404).json({ error: 'Live session not found. Copy the exact trainee invite link from the trainer Details panel.' })

  const { identity, role, targetIdentity } = req.body
  if (!isTrainer(session, identity, role)) {
    return res.status(403).json({ error: 'Trainer permission required.' })
  }

  session.pending.delete(targetIdentity)
  io.to(`${session.roomName}:${targetIdentity}`).emit('rejected', {
    message: 'The trainer did not admit you to this class.'
  })
  sendSession(session)
  res.json({ ok: true })
})

app.post('/api/sessions/:roomName/allow-rejoin', (req, res) => {
  const session = getSession(req.params.roomName)
  if (!session) return res.status(404).json({ error: 'Live session not found. Copy the exact trainee invite link from the trainer Details panel.' })

  const { identity, role, targetIdentity } = req.body
  if (!isTrainer(session, identity, role)) {
    return res.status(403).json({ error: 'Trainer permission required.' })
  }

  session.removed.delete(targetIdentity)
  sendSession(session)
  res.json({ ok: true })
})

app.post('/api/sessions/:roomName/lock', (req, res) => {
  const session = getSession(req.params.roomName)
  if (!session) return res.status(404).json({ error: 'Live session not found. Copy the exact trainee invite link from the trainer Details panel.' })

  const { identity, role, locked } = req.body
  if (!isTrainer(session, identity, role)) {
    return res.status(403).json({ error: 'Trainer permission required.' })
  }

  session.locked = Boolean(locked)
  sendSession(session)
  res.json(publicSession(session, true))
})

app.post('/api/token', async (req, res) => {
  try {
    const { roomName, identity, name, role = 'trainee' } = req.body
    const session = getSession(roomName)

    if (!session) return res.status(404).json({ error: 'Live session not found. Copy the exact trainee invite link from the trainer Details panel.' })
    if (session.ended) return res.status(410).json({ error: 'This live class has ended.' })

    if (role === 'trainer') {
      if (!isTrainer(session, identity, role)) {
        return res.status(403).json({ error: 'Trainer permission denied.' })
      }
    } else {
      if (session.locked) return res.status(423).json({ error: 'This class is currently locked.' })
      if (session.removed.has(identity)) {
        return res.status(403).json({ error: 'The trainer must allow you to rejoin.' })
      }
      if (session.waitingRoom && !session.admitted.has(identity)) {
        return res.status(403).json({ error: 'Waiting for trainer admission.' })
      }
    }

    // Verify the API key/secret against the configured LiveKit project before
    // giving the browser a JWT. This turns the vague client-side "invalid token"
    // failure into an actionable backend error.
    const credentialCheck = await verifyLiveKitCredentials()
    if (!credentialCheck.ok) {
      return res.status(503).json({ error: credentialCheck.message })
    }

    res.json(await makeToken({ roomName: session.roomName, identity, name, role }))
  } catch (err) {
    console.error(err)
    res.status(503).json({ error: err.message || 'Unable to create LiveKit token.' })
  }
})

app.post('/api/sessions/:roomName/moderate', async (req, res) => {
  const session = getSession(req.params.roomName)
  if (!session) return res.status(404).json({ error: 'Live session not found. Copy the exact trainee invite link from the trainer Details panel.' })

  const { identity, role, action, targetIdentity, trackSid, targetName } = req.body
  if (!isTrainer(session, identity, role)) {
    return res.status(403).json({ error: 'Trainer permission required.' })
  }
  if (!targetIdentity) return res.status(400).json({ error: 'targetIdentity is required.' })

  try {
    switch (action) {
      case 'mute-track':
        // Ask the participant client to mute itself. Avoid server-side SFU muting
        // here because that can leave the publication remotely muted and make a
        // later user unmute unreliable in a classroom UI.
        io.to(`${session.roomName}:${targetIdentity}`).emit('moderation-control', { action: 'mute-mic' })
        break

      case 'disable-mic':
        session.blockedMic.add(targetIdentity)
        io.to(`${session.roomName}:${targetIdentity}`).emit('moderation-control', { action })
        break

      case 'allow-mic':
        session.blockedMic.delete(targetIdentity)
        io.to(`${session.roomName}:${targetIdentity}`).emit('moderation-control', { action })
        break

      case 'disable-camera':
        session.blockedCamera.add(targetIdentity)
        io.to(`${session.roomName}:${targetIdentity}`).emit('moderation-control', { action })
        break

      case 'allow-camera':
        session.blockedCamera.delete(targetIdentity)
        io.to(`${session.roomName}:${targetIdentity}`).emit('moderation-control', { action })
        break

      case 'block-screen-share':
        session.blockedScreenShare.add(targetIdentity)
        io.to(`${session.roomName}:${targetIdentity}`).emit('moderation-control', { action })
        break

      case 'allow-screen-share':
        session.blockedScreenShare.delete(targetIdentity)
        io.to(`${session.roomName}:${targetIdentity}`).emit('moderation-control', { action })
        break

      case 'lower-hand':
        session.raisedHands.delete(targetIdentity)
        io.to(`${session.roomName}:${targetIdentity}`).emit('hand-lowered')
        break

      case 'remove':
        session.pending.delete(targetIdentity)
        session.admitted.delete(targetIdentity)
        session.removed.set(targetIdentity, {
          identity: targetIdentity,
          name: targetName || targetIdentity,
          removedAt: new Date().toISOString(),
        })
        if (roomService) {
          try {
            await roomService.removeParticipant(session.roomName, targetIdentity)
          } catch {}
        }
        io.to(`${session.roomName}:${targetIdentity}`).emit('removed', {
          message: 'You were removed from this live class by the trainer.'
        })
        break

      default:
        return res.status(400).json({ error: 'Unknown moderation action.' })
    }

    sendSession(session)
    res.json({ ok: true, session: publicSession(session, true) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Moderation action failed.' })
  }
})

app.post('/api/sessions/:roomName/end', async (req, res) => {
  const session = getSession(req.params.roomName)
  if (!session) return res.status(404).json({ error: 'Live session not found. Copy the exact trainee invite link from the trainer Details panel.' })

  const { identity, role } = req.body
  if (!isTrainer(session, identity, role)) {
    return res.status(403).json({ error: 'Trainer permission required.' })
  }

  session.ended = true
  io.to(session.roomName).emit('session-ended')

  if (roomService) {
    try {
      const participants = await roomService.listParticipants(session.roomName)
      await Promise.allSettled(
        participants.map(p => roomService.removeParticipant(session.roomName, p.identity))
      )
    } catch {}
  }

  sendSession(session)
  res.json({ ok: true })
})

io.on('connection', socket => {
  const roomName = normalizeRoomName(socket.handshake.query.roomName || '')
  const identity = String(socket.handshake.query.identity || '')
  const role = String(socket.handshake.query.role || 'trainee')
  const name = String(socket.handshake.query.name || identity)

  if (!roomName || !identity) return

  socket.join(roomName)
  socket.join(`${roomName}:${identity}`)

  const session = getSession(roomName)
  const trainer = isTrainer(session, identity, role)
  if (trainer) socket.join(`${roomName}:trainer`)

  if (session) {
  socket.emit(
    'session-state',
    publicSession(session, trainer)
  )

  socket.emit(
    'chat-history',
    Array.isArray(session.chatMessages)
      ? session.chatMessages
      : []
  )

  socket.emit('whiteboard-state', {
    open: Boolean(session.whiteboardOpen),

    strokes: Array.isArray(
      session.whiteboardStrokes
    )
      ? session.whiteboardStrokes
      : [],
  })
  }

  socket.on('chat-message', (payload, acknowledge) => {
    const text = payload?.text?.trim()
    if (!text) {
      acknowledge?.({ ok:false, error:'Message is empty.' })
      return
    }

    const s = getSession(roomName)
    if (!s || s.ended) {
      acknowledge?.({ ok:false, error:'This live class is no longer available.' })
      return
    }

    const message = {
      id: crypto.randomUUID(),
      identity,
      name,
      role,
      text: text.slice(0, 2000),
      time: new Date().toISOString()
    }

    if (!Array.isArray(s.chatMessages)) s.chatMessages = []
    s.chatMessages.push(message)
    s.chatMessages = s.chatMessages.slice(-100)
    saveSessions()

    io.to(roomName).emit('chat-message', message)
    acknowledge?.({ ok:true, id:message.id })
  })

  socket.on('raise-hand', ({ raised }) => {
    const s = getSession(roomName)
    if (!s || role !== 'trainee') return

    if (raised) s.raisedHands.add(identity)
    else s.raisedHands.delete(identity)

    io.to(roomName).emit('hand-state', { identity, name, raised: Boolean(raised) })
    sendSession(s)
  })

  socket.on('spotlight', ({ targetIdentity }) => {
    const s = getSession(roomName)
    if (!isTrainer(s, identity, role)) return
    s.spotlightParticipantId = targetIdentity || null
    io.to(roomName).emit('spotlight', { targetIdentity: s.spotlightParticipantId })
    sendSession(s)
  })

  socket.on('whiteboard-open', () => {
  const s = getSession(roomName)

  if (!isTrainer(s, identity, role)) return

  s.whiteboardOpen = true

  if (!Array.isArray(s.whiteboardStrokes)) {
    s.whiteboardStrokes = []
  }

  saveSessions()

  io.to(roomName).emit('whiteboard-open', {
    open: true,

    strokes: s.whiteboardStrokes,

    trainerName: s.trainerName || name,
  })
})


socket.on('whiteboard-stroke', payload => {
  const s = getSession(roomName)

  if (!isTrainer(s, identity, role)) return

  const id = String(
    payload?.id || ''
  ).slice(0, 80)

  const rawPoints = Array.isArray(
    payload?.points
  )
    ? payload.points.slice(0, 2000)
    : []

  if (!id || rawPoints.length === 0) {
    return
  }

  const points = rawPoints
    .map(point => ({
      x: Number(point?.x),
      y: Number(point?.y),
    }))

    .filter(
      point =>
        Number.isFinite(point.x) &&
        Number.isFinite(point.y)
    )

    .map(point => ({
      x: Math.max(
        0,
        Math.min(1, point.x)
      ),

      y: Math.max(
        0,
        Math.min(1, point.y)
      ),
    }))

  if (!points.length) return

  if (!Array.isArray(s.whiteboardStrokes)) {
    s.whiteboardStrokes = []
  }

  const stroke = {
    id,
    points,
  }

  const index =
    s.whiteboardStrokes.findIndex(
      item => item.id === id
    )

  if (index >= 0) {
    s.whiteboardStrokes[index] = stroke
  } else {
    s.whiteboardStrokes.push(stroke)
  }

  s.whiteboardStrokes =
    s.whiteboardStrokes.slice(-300)

  io.to(roomName).emit(
    'whiteboard-stroke',
    stroke
  )
})


socket.on('whiteboard-clear', () => {
  const s = getSession(roomName)

  if (!isTrainer(s, identity, role)) {
    return
  }

  s.whiteboardStrokes = []

  saveSessions()

  io.to(roomName).emit(
    'whiteboard-clear'
  )
})


socket.on('whiteboard-close', () => {
  const s = getSession(roomName)

  if (!isTrainer(s, identity, role)) {
    return
  }

  s.whiteboardOpen = false

  saveSessions()

  io.to(roomName).emit(
    'whiteboard-close'
  )
})

  socket.on('session-policy', patch => {
    const s = getSession(roomName)
    if (!isTrainer(s, identity, role)) return

    const keys = [
      'waitingRoom',
      'muteOnEntry',
      'allowTraineeMic',
      'allowTraineeCamera',
      'allowTraineeScreenShare'
    ]

    for (const key of keys) {
      if (key in patch) s[key] = Boolean(patch[key])
    }

    sendSession(s)
  })
})

httpServer.listen(PORT, async () => {
  console.log(`SkillTwin server: http://localhost:${PORT}`)
  console.log(`LiveKit configured: ${livekitConfigured ? 'YES' : 'NO'}`)
  console.log(`LiveKit project: ${LIVEKIT_URL || '(not set)'}`)
  console.log(`LiveKit API key: ${credentialHint}`)

  if (livekitConfigured) {
    const result = await verifyLiveKitCredentials(true).catch(err => ({ ok:false, message:err.message }))
    console.log(result.ok ? 'LiveKit credentials: VALID' : `LiveKit credentials: INVALID - ${result.message}`)
  }
})
