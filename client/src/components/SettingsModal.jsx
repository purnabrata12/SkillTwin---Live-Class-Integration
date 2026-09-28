import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import DeviceSelector from './DeviceSelector'

export default function SettingsModal({ room, role, session, selectedDevices={}, onDeviceChange, onPolicy, onClose }) {
  const [devices, setDevices] = useState({ cameras:[], mics:[], speakers:[] })
  const [selected, setSelected] = useState({
    camera:selectedDevices.cameraId||'',
    mic:selectedDevices.micId||'',
    speaker:selectedDevices.speakerId||'',
  })
  const [deviceError,setDeviceError]=useState('')

  useEffect(()=>{
    navigator.mediaDevices.enumerateDevices().then(all=>{
      setDevices({
        cameras:all.filter(d=>d.kind==='videoinput'),
        mics:all.filter(d=>d.kind==='audioinput'),
        speakers:all.filter(d=>d.kind==='audiooutput'),
      })
    }).catch(()=>{})
  },[])

  async function switchDevice(kind, id, key) {
    setSelected(s=>({...s,[key]:id}))
    onDeviceChange?.(current=>({...current,[`${key}Id`]:id}))
    setDeviceError('')
    if (!id) return
    try { await room.switchActiveDevice(kind, id) }
    catch (err) { setDeviceError(err?.message || 'Could not switch to that device.') }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <button className="modal-x" onClick={onClose}><X/></button>
        <h2>Settings</h2>

        <div className="settings-section">
          <h3>Audio</h3>
          <DeviceSelector label="Microphone" value={selected.mic} options={devices.mics} fallback="Default microphone" onChange={v=>switchDevice('audioinput',v,'mic')}/>
          <DeviceSelector label="Speaker" value={selected.speaker} options={devices.speakers} fallback="Default speaker" onChange={v=>switchDevice('audiooutput',v,'speaker')}/>
        </div>

        <div className="settings-section">
          <h3>Video</h3>
          <DeviceSelector label="Camera" value={selected.camera} options={devices.cameras} fallback="Default camera" onChange={v=>switchDevice('videoinput',v,'camera')}/>
        </div>

        {deviceError&&<div className="warning-box">{deviceError}</div>}

        {role==='trainer' && (
          <div className="settings-section">
            <h3>Meeting</h3>
            <Policy label="Waiting room" value={session.waitingRoom} onChange={v=>onPolicy({waitingRoom:v})}/>
            <Policy label="Mute trainees on entry" value={session.muteOnEntry} onChange={v=>onPolicy({muteOnEntry:v})}/>
            <Policy label="Allow trainee microphones" value={session.allowTraineeMic} onChange={v=>onPolicy({allowTraineeMic:v})}/>
            <Policy label="Allow trainee cameras" value={session.allowTraineeCamera} onChange={v=>onPolicy({allowTraineeCamera:v})}/>
            <Policy label="Allow trainee screen sharing" value={session.allowTraineeScreenShare} onChange={v=>onPolicy({allowTraineeScreenShare:v})}/>
          </div>
        )}

        <div className="modal-actions"><button className="primary" onClick={onClose}>Done</button></div>
      </section>
    </div>
  )
}

function Policy({label,value,onChange}) {
  return <div className="switch-row"><span>{label}</span><button type="button" className={`switch ${value?'on':''}`} onClick={()=>onChange(!value)}><i/></button></div>
}
