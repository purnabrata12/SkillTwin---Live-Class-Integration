import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'sessions.json')

export const sessions = new Map()

export function normalizeRoomName(value = '') {
  return String(value).trim().toUpperCase()
}

function restoreSession(raw) {
  return {
    ...raw,
    roomName: normalizeRoomName(raw.roomName),
    pending: new Map((raw.pending || []).map(person => [person.identity, person])),
    admitted: new Set(raw.admitted || []),
    removed: new Map((raw.removed || []).map(person => [person.identity, person])),
    raisedHands: new Set(raw.raisedHands || []),
    blockedMic: new Set(raw.blockedMic || []),
    blockedCamera: new Set(raw.blockedCamera || []),
    blockedScreenShare: new Set(raw.blockedScreenShare || []),
    chatMessages: Array.isArray(raw.chatMessages) ? raw.chatMessages.slice(-100) : [],

    whiteboardOpen: Boolean(raw.whiteboardOpen),

    whiteboardStrokes: Array.isArray(raw.whiteboardStrokes)
      ? raw.whiteboardStrokes.slice(-300)
      : [],
  }
}

function serializeSession(session) {
  return {
    ...session,
    pending: [...session.pending.values()],
    admitted: [...session.admitted],
    removed: [...session.removed.values()],
    raisedHands: [...session.raisedHands],
    blockedMic: [...session.blockedMic],
    blockedCamera: [...session.blockedCamera],
    blockedScreenShare: [...session.blockedScreenShare],
    chatMessages: Array.isArray(session.chatMessages) ? session.chatMessages.slice(-100) : [],
  }
}

function loadSessions() {
  try {
    if (!fs.existsSync(DATA_FILE)) return
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    for (const item of Array.isArray(raw) ? raw : []) {
      const session = restoreSession(item)
      if (session.roomName) sessions.set(session.roomName, session)
    }
  } catch (err) {
    console.warn('Could not load saved SkillTwin sessions:', err.message)
  }
}

export function saveSessions() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const payload = [...sessions.values()].map(serializeSession)
    const temp = `${DATA_FILE}.tmp`
    fs.writeFileSync(temp, JSON.stringify(payload, null, 2), 'utf8')
    fs.renameSync(temp, DATA_FILE)
  } catch (err) {
    console.warn('Could not save SkillTwin sessions:', err.message)
  }
}

loadSessions()

export function getSession(roomName) {
  return sessions.get(normalizeRoomName(roomName))
}

export function makeRoomCode(courseName = 'CLASS') {
  const base = String(courseName)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 2)
    .join('')
    .slice(0, 6) || 'CLASS'

  return `SKT-${base}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

export function createSession(input) {
  const roomName = normalizeRoomName(input.roomName || makeRoomCode(input.courseName))
  const session = {
    roomName,
    courseId: input.courseId || '',
    courseName: input.courseName || 'Untitled Course',
    sessionTitle: input.sessionTitle || 'Live Class',
    trainerId: input.trainerId || input.trainerIdentity || '',
    trainerIdentity: input.trainerIdentity,
    trainerName: input.trainerName || 'Trainer',
    startTime: input.startTime || new Date().toISOString(),
    endTime: input.endTime || '',
    waitingRoom: Boolean(input.waitingRoom),
    locked: false,
    muteOnEntry: Boolean(input.muteOnEntry),
    allowTraineeMic: input.allowTraineeMic !== false,
    allowTraineeCamera: input.allowTraineeCamera !== false,
    allowTraineeScreenShare: input.allowTraineeScreenShare !== false,
    ended: false,
    spotlightParticipantId: null,
    pending: new Map(),
    admitted: new Set(),
    removed: new Map(),
    raisedHands: new Set(),
    blockedMic: new Set(),
    blockedCamera: new Set(),
    blockedScreenShare: new Set(),
    chatMessages: [],

    whiteboardOpen: false,
    whiteboardStrokes: [],
  }
  sessions.set(roomName, session)
  saveSessions()
  return session
}

export function publicSession(session, includePrivate = false) {
  if (!session) return null
  return {
    roomName: session.roomName,
    courseId: session.courseId,
    courseName: session.courseName,
    sessionTitle: session.sessionTitle,
    trainerId: session.trainerId,
    trainerIdentity: session.trainerIdentity,
    trainerName: session.trainerName,
    startTime: session.startTime,
    endTime: session.endTime,
    waitingRoom: session.waitingRoom,
    locked: session.locked,
    muteOnEntry: session.muteOnEntry,
    allowTraineeMic: session.allowTraineeMic,
    allowTraineeCamera: session.allowTraineeCamera,
    allowTraineeScreenShare: session.allowTraineeScreenShare,
    ended: session.ended,
    spotlightParticipantId: session.spotlightParticipantId,
    raisedHands: [...session.raisedHands],
    blockedMic: [...session.blockedMic],
    blockedCamera: [...session.blockedCamera],
    blockedScreenShare: [...session.blockedScreenShare],
    ...(includePrivate ? {
      pending: [...session.pending.values()],
      removed: [...session.removed.values()],
    } : {}),
    whiteboardOpen: Boolean(session.whiteboardOpen),
  }
}

export function isTrainer(session, identity, role) {
  return role === 'trainer' && Boolean(identity) && session?.trainerIdentity === identity
}
