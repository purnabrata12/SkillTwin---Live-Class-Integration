import './env.js'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'

function cleanEnv(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
}

const RAW_LIVEKIT_URL = cleanEnv(process.env.LIVEKIT_URL)
const LIVEKIT_API_KEY = cleanEnv(process.env.LIVEKIT_API_KEY)
const LIVEKIT_API_SECRET = cleanEnv(process.env.LIVEKIT_API_SECRET)

function normalizeWsUrl(value) {
  if (!value) return ''
  const trimmed = value.replace(/\/+$/, '')
  if (/^wss?:\/\//i.test(trimmed)) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/^http/i, 'ws')
  return `wss://${trimmed}`
}

function httpUrl(url) {
  return url.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:')
}

function isPlaceholder(value) {
  return !value || /YOUR_|CHANGE_ME|EXAMPLE|PLACEHOLDER/i.test(value)
}

export const LIVEKIT_URL = normalizeWsUrl(RAW_LIVEKIT_URL)
export const credentialHint = LIVEKIT_API_KEY
  ? `${LIVEKIT_API_KEY.slice(0, 4)}...${LIVEKIT_API_KEY.slice(-4)}`
  : '(not set)'

export const livekitConfigured = Boolean(
  LIVEKIT_URL &&
  !isPlaceholder(LIVEKIT_URL) &&
  LIVEKIT_API_KEY &&
  !isPlaceholder(LIVEKIT_API_KEY) &&
  LIVEKIT_API_SECRET &&
  !isPlaceholder(LIVEKIT_API_SECRET)
)

export const roomService = livekitConfigured
  ? new RoomServiceClient(httpUrl(LIVEKIT_URL), LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  : null

let lastCredentialCheck = { at: 0, result: null }

export async function verifyLiveKitCredentials(force = false) {
  if (!livekitConfigured) {
    return {
      ok: false,
      message: 'LiveKit is not configured. Put the Project URL, API key and API secret from the SAME LiveKit Cloud project into server/.env, then restart npm run dev.'
    }
  }

  const now = Date.now()
  if (!force && lastCredentialCheck.result && now - lastCredentialCheck.at < 60_000) {
    return lastCredentialCheck.result
  }

  try {
    // A lightweight authenticated API call proves that URL + key + secret all
    // belong to the same LiveKit project. No room has to exist.
    await roomService.listRooms([])
    const result = { ok: true, message: 'LiveKit credentials are valid.' }
    lastCredentialCheck = { at: now, result }
    return result
  } catch (err) {
    const raw = String(err?.message || err || '')
    const result = {
      ok: false,
      message:
        'LiveKit rejected the API credentials. Create a fresh API key in the SAME SkillTwin LiveKit project, copy that key and its matching secret into server/.env, confirm LIVEKIT_URL is the SkillTwin Project URL, then fully stop and restart npm run dev.' +
        (raw ? ` (${raw})` : '')
    }
    lastCredentialCheck = { at: now, result }
    return result
  }
}

export async function makeToken({ roomName, identity, name, role }) {
  if (!livekitConfigured) {
    throw new Error('LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET to server/.env.')
  }

  if (!roomName || !identity) {
    throw new Error('A room name and participant identity are required to create a LiveKit token.')
  }

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: String(identity),
    name: String(name || identity),
    metadata: JSON.stringify({ role: role === 'trainer' ? 'trainer' : 'trainee' }),
    ttl: 60 * 60 * 6,
  })

  // Room moderation is performed by the SkillTwin backend RoomServiceClient,
  // so the browser token only needs normal room permissions.
  token.addGrant({
    roomJoin: true,
    room: String(roomName),
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  return {
    token: await token.toJwt(),
    serverUrl: LIVEKIT_URL,
  }
}
