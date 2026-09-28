import { useState } from 'react'
import { ArrowRight, Link2, Video } from 'lucide-react'
import { api } from '../services/api'

function normalizeMeetingInput(value) {
  const input = value.trim()
  if (!input) return ''

  try {
    const url = new URL(input)
    const parts = url.pathname.split('/').filter(Boolean)
    const liveIndex = parts.indexOf('live')
    if (liveIndex >= 0 && parts[liveIndex + 1]) return decodeURIComponent(parts[liveIndex + 1]).toUpperCase()
  } catch {}

  return input.toUpperCase().replace(/\s+/g, '')
}

function makeIdentity(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trainee'
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) || Date.now().toString(36)
  return `trainee-${slug}-${suffix}`
}

export default function JoinSession() {
  const [meeting,setMeeting]=useState('')
  const [name,setName]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  async function submit(e){
    e.preventDefault()
    const room=normalizeMeetingInput(meeting)
    const displayName=name.trim()
    if(!room || !displayName)return

    setBusy(true)
    setError('')
    try{
      const session=await api.getSession(room)
      if(session.ended)throw new Error('This live class has already ended.')

      const params=new URLSearchParams({
        role:'trainee',
        name:displayName,
        userId:makeIdentity(displayName),
      })
      window.location.href=`/live/${encodeURIComponent(session.roomName)}?${params.toString()}`
    }catch(err){
      setError(err.message || 'Could not find that live class.')
      setBusy(false)
    }
  }

  return (
    <div className="portal-page">
      <div className="portal-glow portal-glow-one"/>
      <div className="portal-glow portal-glow-two"/>
      <section className="portal-card join-code-card">
        <div className="brand brand-large"><span className="brand-logo"><img src="/skilltwin-logo.jpeg" alt="SkillTwin logo" /></span><div><strong>SkillTwin</strong><small>Live Classroom</small></div></div>
        <div className="eyebrow"><Video size={15}/> LIVE LEARNING</div>
        <h1>Join your live class</h1>
        <p className="portal-copy">Enter the meeting ID from your trainer, or paste the complete trainee invite link.</p>

        <form onSubmit={submit} className="portal-form">
          <label className="field"><span>Your name</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Aman" autoComplete="name" required/></label>
          <label className="field"><span>Meeting ID or invite link</span><div className="input-with-icon"><Link2 size={17}/><input value={meeting} onChange={e=>setMeeting(e.target.value)} placeholder="SKT-CYBERS-XXXXXX" required/></div></label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary wide" disabled={busy}>{busy ? 'Checking class...' : 'Continue to preview'} <ArrowRight size={18}/></button>
        </form>

        <div className="portal-note">Use the exact invite copied from <strong>Trainer → Details → Copy trainee invite</strong>.</div>
      </section>
    </div>
  )
}
