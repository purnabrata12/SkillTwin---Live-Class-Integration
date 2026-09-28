function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().slice(0, 8)
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function getRouteInfo() {
  const params = new URLSearchParams(window.location.search)
  const parts = window.location.pathname.split('/').filter(Boolean)
  const liveIndex = parts.indexOf('live')
  const roomName = (liveIndex >= 0 ? parts[liveIndex + 1] || '' : '').trim().toUpperCase()

  const requestedRole = (params.get('role') || 'trainee').toLowerCase()
  const role = requestedRole === 'trainer' ? 'trainer' : 'trainee'
  const nameProvided = params.has('name') && Boolean(params.get('name')?.trim())
  const name = params.get('name')?.trim() || (role === 'trainer' ? 'Trainer' : '')

  let identity = params.get('userId')?.trim()
  if (!identity) {
    // Development fallback. In the LMS, pass the authenticated user ID.
    // sessionStorage keeps refreshes stable while separate browser sessions can
    // still represent different learners.
    const identityKey = `skilltwin:${roomName || 'new'}:${role}:${slug(name || 'anonymous')}:identity`
    identity = sessionStorage.getItem(identityKey)
    if (!identity) {
      identity = `${role}-${slug(name || 'user') || 'user'}-${randomId()}`
      sessionStorage.setItem(identityKey, identity)
    }
  }

  return {
    roomName,
    role,
    name,
    identity,
    courseId: params.get('courseId') || '',
    courseName: params.get('courseName') || '',
    nameProvided,
  }
}
