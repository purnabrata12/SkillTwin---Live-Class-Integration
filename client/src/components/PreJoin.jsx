import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Mic, MicOff, MoreVertical, Settings, Video, VideoOff } from 'lucide-react'
import Avatar from './Avatar'
import DeviceSelector from './DeviceSelector'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export default function PreJoin({ session, role, name, onNameChange, waiting, error, onJoin }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mountedRef = useRef(true)

  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [cameraBusy, setCameraBusy] = useState(false)
  const [micBusy, setMicBusy] = useState(false)
  const [deviceOpen, setDeviceOpen] = useState(false)
  const [permissionError, setPermissionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [devices, setDevices] = useState({ cameras: [], mics: [], speakers: [] })
  const [selected, setSelected] = useState({ cameraId: '', micId: '', speakerId: '' })

  useEffect(() => {
    mountedRef.current = true
    initializePreview()
    return () => {
      mountedRef.current = false
      stopAllTracks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (videoRef.current && cameraOn) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play?.().catch(()=>{})
    }
  }, [cameraOn])

  function ensureStream() {
    if (!streamRef.current) streamRef.current = new MediaStream()
    return streamRef.current
  }

  function stopKind(kind) {
    const stream = streamRef.current
    if (!stream) return
    const tracks = kind === 'video' ? stream.getVideoTracks() : stream.getAudioTracks()
    tracks.forEach(track => {
      try { track.stop() } catch {}
      try { stream.removeTrack(track) } catch {}
    })
  }

  function stopAllTracks() {
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach(track => {
        try { track.stop() } catch {}
      })
    }
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function refreshDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      if (!mountedRef.current) return
      setDevices({
        cameras: all.filter(d => d.kind === 'videoinput'),
        mics: all.filter(d => d.kind === 'audioinput'),
        speakers: all.filter(d => d.kind === 'audiooutput'),
      })
    } catch {}
  }

  function friendlyMediaError(err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
      return 'Camera or microphone permission is blocked. Allow access from the browser address bar, then try again.'
    }
    if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      return 'No usable camera or microphone was found on this device.'
    }
    if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
      return 'The camera or microphone is busy in another app. Close the other app/tab and try again.'
    }
    return `Could not start the camera or microphone${err?.message ? `: ${err.message}` : '.'}`
  }

  async function initializePreview() {
    setPermissionError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError('Camera and microphone are not available in this browser.')
      return
    }

    stopAllTracks()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (!mountedRef.current) {
        stream.getTracks().forEach(track=>track.stop())
        return
      }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play?.().catch(()=>{})
      }
      setCameraOn(stream.getVideoTracks().length > 0)
      setMicOn(stream.getAudioTracks().length > 0)
      await refreshDevices()
    } catch (err) {
      if (!mountedRef.current) return
      setCameraOn(false)
      setMicOn(false)
      setPermissionError(friendlyMediaError(err))
      await refreshDevices()
    }
  }

  async function acquireKind(kind, deviceId = '') {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Media devices are unavailable in this browser.')

    const constraints = kind === 'video'
      ? { video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false }
      : { video: false, audio: deviceId ? { deviceId: { exact: deviceId } } : true }

    const fresh = await navigator.mediaDevices.getUserMedia(constraints)
    const track = kind === 'video' ? fresh.getVideoTracks()[0] : fresh.getAudioTracks()[0]
    if (!track) {
      fresh.getTracks().forEach(t=>t.stop())
      throw new Error(`No ${kind === 'video' ? 'camera' : 'microphone'} track was created.`)
    }

    const stream = ensureStream()
    stopKind(kind)
    stream.addTrack(track)

    // Stop anything unexpected returned by the browser, but keep the selected track.
    fresh.getTracks().forEach(t=>{ if(t !== track) t.stop() })

    if (kind === 'video' && videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play?.().catch(()=>{})
    }

    await refreshDevices()
    return track
  }

  async function toggleCamera() {
    if (cameraBusy) return
    setCameraBusy(true)
    setPermissionError('')
    try {
      const existing = streamRef.current?.getVideoTracks()?.[0]
      if (cameraOn) {
        // During preview, disable instead of destroying the camera track. This
        // makes repeated OFF -> ON instantaneous and avoids Windows/browser
        // hardware reacquisition failures.
        if (existing && existing.readyState === 'live') existing.enabled = false
        setCameraOn(false)
      } else {
        if (existing && existing.readyState === 'live') {
          existing.enabled = true
          if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current
            await videoRef.current.play?.().catch(()=>{})
          }
        } else {
          await acquireKind('video', selected.cameraId)
        }
        setCameraOn(true)
      }
    } catch (err) {
      setCameraOn(false)
      setPermissionError(friendlyMediaError(err))
    } finally {
      setCameraBusy(false)
    }
  }

  async function toggleMic() {
    if (micBusy) return
    setMicBusy(true)
    setPermissionError('')
    try {
      const existing = streamRef.current?.getAudioTracks()?.[0]
      if (micOn) {
        if (existing && existing.readyState === 'live') existing.enabled = false
        setMicOn(false)
      } else {
        if (existing && existing.readyState === 'live') existing.enabled = true
        else await acquireKind('audio', selected.micId)
        setMicOn(true)
      }
    } catch (err) {
      setMicOn(false)
      setPermissionError(friendlyMediaError(err))
    } finally {
      setMicBusy(false)
    }
  }

  async function changeCamera(cameraId) {
    setSelected(s => ({ ...s, cameraId }))
    if (!cameraOn) return
    setCameraBusy(true)
    try { await acquireKind('video', cameraId) }
    catch (err) { setPermissionError(friendlyMediaError(err)) }
    finally { setCameraBusy(false) }
  }

  async function changeMic(micId) {
    setSelected(s => ({ ...s, micId }))
    if (!micOn) return
    setMicBusy(true)
    try { await acquireKind('audio', micId) }
    catch (err) { setPermissionError(friendlyMediaError(err)) }
    finally { setMicBusy(false) }
  }

  async function join() {
    if (busy || waiting || (role==='trainee'&&!name.trim())) return
    setBusy(true)
    setPermissionError('')

    const prefs = { cameraOn, micOn, ...selected }
    stopAllTracks()

    // Give the browser a moment to release preview hardware before LiveKit
    // requests the same camera/microphone. This prevents common Windows/Chrome
    // "camera busy" and OFF->ON problems.
    await sleep(180)

    try {
      const result = await onJoin(prefs)
      if (result?.pending || result?.error) {
        await sleep(80)
        if (mountedRef.current) {
          if (cameraOn) {
            try { await acquireKind('video', selected.cameraId) } catch {}
          }
          if (micOn) {
            try { await acquireKind('audio', selected.micId) } catch {}
          }
        }
      }
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  return (
    <div className="prejoin">
      <header className="prejoin-header">
        <div className="brand"><span className="brand-logo"><img src="/skilltwin-logo.jpeg" alt="SkillTwin logo" /></span><strong>SkillTwin</strong></div>
        <div className="prejoin-title"><span>Live Classroom</span><strong>{session.courseName}</strong></div>
      </header>

      <main className="prejoin-main">
        <section className="preview-card">
          <div className="preview">
            {cameraOn ? (
              <video ref={videoRef} autoPlay muted playsInline/>
            ) : (
              <div className="camera-off"><Avatar name={name||'Trainee'}/><span>Camera is off</span></div>
            )}

            <button className="preview-more" aria-label="More preview options"><MoreVertical/></button>

            <div className="preview-controls">
              <button disabled={micBusy} className={`round ${micOn ? '' : 'off'}`} onClick={toggleMic} aria-label={micOn ? 'Turn off microphone' : 'Turn on microphone'}>
                {micOn ? <Mic/> : <MicOff/>}
              </button>
              <button disabled={cameraBusy} className={`round ${cameraOn ? '' : 'off'}`} onClick={toggleCamera} aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}>
                {cameraOn ? <Video/> : <VideoOff/>}
              </button>
              <button className="round" onClick={()=>setDeviceOpen(v=>!v)} aria-label="Device settings"><Settings/></button>
            </div>
          </div>
          <div className="preview-caption"><span className="preview-dot"/> Check your camera and microphone before joining</div>
        </section>

        <section className="join-panel">
          <span className="role-chip">{role === 'trainer' ? 'Trainer / Host' : 'Trainee'}</span>
          <h1>{waiting ? 'Waiting for trainer...' : 'Ready to join?'}</h1>
          <p><strong>{session.sessionTitle}</strong><br/>{session.courseName}</p>

          <div className="prejoin-details">
            <div><span>Meeting ID</span><strong>{session.roomName}</strong></div>
            <div><span>Trainer</span><strong>{session.trainerName}</strong></div>
          </div>

          {role==='trainee' && (
            <label className="field trainee-name-field">
              <span>Your name</span>
              <input value={name} onChange={e=>onNameChange?.(e.target.value)} placeholder="Enter your name" autoComplete="name"/>
            </label>
          )}

          {permissionError && <div className="warning-box">{permissionError}</div>}
          {error && <div className="error-box">{error}</div>}

          {waiting ? (
            <div className="waiting-message"><span className="spinner"/>Your request was sent. Keep this page open until the trainer admits you.</div>
          ) : (
            <button className="join-btn" onClick={join} disabled={busy || (role==='trainee'&&!name.trim())}>
              {busy ? 'Connecting...' : role === 'trainer' ? 'Start class' : 'Join now'}
            </button>
          )}

          <button className="other-join" type="button" onClick={()=>setDeviceOpen(v=>!v)}>Device settings <ChevronDown size={18}/></button>
        </section>
      </main>

      {deviceOpen && (
        <aside className="device-card">
          <div className="device-card-head"><div><span>Audio & video</span><h3>Device settings</h3></div><button onClick={()=>setDeviceOpen(false)}>×</button></div>
          <DeviceSelector label="Camera" value={selected.cameraId} options={devices.cameras} fallback="Default camera" onChange={changeCamera}/>
          <DeviceSelector label="Microphone" value={selected.micId} options={devices.mics} fallback="Default microphone" onChange={changeMic}/>
          <DeviceSelector label="Speaker" value={selected.speakerId} options={devices.speakers} fallback="Default speaker" onChange={value=>setSelected(s=>({...s,speakerId:value}))}/>
          <p className="hint">Speaker selection depends on browser support.</p>
          <button className="primary wide" onClick={()=>setDeviceOpen(false)}>Done</button>
        </aside>
      )}
    </div>
  )
}
