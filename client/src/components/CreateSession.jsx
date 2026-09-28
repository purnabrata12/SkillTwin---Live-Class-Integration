import { useState } from 'react'
import { ArrowRight, Sparkles, Video } from 'lucide-react'
import { api } from '../services/api'

function toLocalDateTimeInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function CreateSession({ route, onCreated }) {
  const [form, setForm] = useState({
    roomName: route.roomName || '',
    courseId: route.courseId || '',
    courseName: route.courseName || 'Cyber Security Fundamentals',
    sessionTitle: 'Network Security - Week 04',
    trainerIdentity: route.identity,
    trainerId: route.identity,
    trainerName: route.name || 'Trainer',
    startTime: toLocalDateTimeInput(new Date()),
    endTime: '',
    waitingRoom: false,
    muteOnEntry: false,
    allowTraineeMic: true,
    allowTraineeCamera: true,
    allowTraineeScreenShare: true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api.createSession(form)
      onCreated(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="portal-page create-page">
      <div className="portal-glow portal-glow-one"/>
      <div className="portal-glow portal-glow-two"/>
      <section className="portal-card create-card">
        <Brand/>
        <div className="eyebrow"><Sparkles size={15}/> SKILLTWIN LIVE</div>
        <div className="create-heading"><div className="hero-icon"><Video/></div><div><h1>Create live class</h1><p>Start a secure live learning room and share one exact invite with every trainee.</p></div></div>

        <form onSubmit={submit} className="portal-form">
          <div className="two-fields">
            <label className="field"><span>Course name</span><input value={form.courseName} onChange={e=>set('courseName', e.target.value)} required/></label>
            <label className="field"><span>Session title</span><input value={form.sessionTitle} onChange={e=>set('sessionTitle', e.target.value)} required/></label>
          </div>

          <div className="two-fields">
            <label className="field"><span>Start time</span><input type="datetime-local" value={form.startTime} onChange={e=>set('startTime', e.target.value)}/></label>
            <label className="field"><span>Optional end time</span><input type="datetime-local" value={form.endTime} onChange={e=>set('endTime', e.target.value)}/></label>
          </div>

          <label className="field"><span>Optional custom meeting ID</span><input value={form.roomName} onChange={e=>set('roomName', e.target.value.toUpperCase().replace(/\s+/g,''))} placeholder="Leave blank to generate automatically"/></label>

          <div className="policy-grid">
            <Switch label="Waiting room" value={form.waitingRoom} onChange={v=>set('waitingRoom', v)}/>
            <Switch label="Mute trainees on entry" value={form.muteOnEntry} onChange={v=>set('muteOnEntry', v)}/>
            <Switch label="Allow trainee microphones" value={form.allowTraineeMic} onChange={v=>set('allowTraineeMic', v)}/>
            <Switch label="Allow trainee cameras" value={form.allowTraineeCamera} onChange={v=>set('allowTraineeCamera', v)}/>
            <Switch label="Allow trainee screen sharing" value={form.allowTraineeScreenShare} onChange={v=>set('allowTraineeScreenShare', v)}/>
          </div>

          {error && <div className="error-box">{error}</div>}
          <button className="primary wide create-submit" disabled={busy}>
            {busy ? 'Creating room...' : 'Create session'} <ArrowRight size={18}/>
          </button>
        </form>
      </section>
    </div>
  )
}

function Switch({label,value,onChange}) {
  return (
    <div className="switch-row">
      <span>{label}</span>
      <button type="button" className={`switch ${value ? 'on' : ''}`} onClick={()=>onChange(!value)} aria-pressed={value}><i/></button>
    </div>
  )
}

function Brand() {
  return <div className="brand brand-large"><span className="brand-logo"><img src="/skilltwin-logo.jpeg" alt="SkillTwin logo" /></span><div><strong>SkillTwin</strong><small>Competency Intelligence · Live Learning</small></div></div>
}
