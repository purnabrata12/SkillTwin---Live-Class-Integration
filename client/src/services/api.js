const defaultApiUrl = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001'

export const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    })
  } catch (err) {
    throw new Error(`Cannot reach the SkillTwin backend at ${API_URL}. Make sure npm run dev is running.`)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`)
  }
  return data
}

export const api = {
  health: () => request('/api/health'),
  getSession: roomName => request(`/api/sessions/${encodeURIComponent(roomName)}`),
  createSession: body => request('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateSession: (roomName, identity, role, patch) => request(`/api/sessions/${encodeURIComponent(roomName)}`, {
    method: 'PUT',
    body: JSON.stringify({ identity, role, patch })
  }),
  joinRequest: (roomName, body) => request(`/api/sessions/${encodeURIComponent(roomName)}/join-request`, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  token: body => request('/api/token', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  admit: (roomName, body) => request(`/api/sessions/${encodeURIComponent(roomName)}/admit`, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  reject: (roomName, body) => request(`/api/sessions/${encodeURIComponent(roomName)}/reject`, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  allowRejoin: (roomName, body) => request(`/api/sessions/${encodeURIComponent(roomName)}/allow-rejoin`, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  lock: (roomName, body) => request(`/api/sessions/${encodeURIComponent(roomName)}/lock`, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  moderate: (roomName, body) => request(`/api/sessions/${encodeURIComponent(roomName)}/moderate`, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  endSession: (roomName, body) => request(`/api/sessions/${encodeURIComponent(roomName)}/end`, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
}
