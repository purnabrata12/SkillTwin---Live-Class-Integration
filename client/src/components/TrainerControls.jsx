import {
  CameraOff, Hand, MicOff, MonitorOff, MonitorUp, Star, UserMinus, Video, Volume2, VolumeX
} from 'lucide-react'
import { Track } from 'livekit-client'

export default function TrainerControls({ participant, raised, blocked, onAction, onSpotlight }) {
  const micPub = participant.getTrackPublication?.(Track.Source.Microphone)
  const camPub = participant.getTrackPublication?.(Track.Source.Camera)

  return (
    <div className="trainer-menu">
      <button onClick={onSpotlight}><Star size={15}/> Spotlight</button>

      <button onClick={()=>onAction('mute-track', participant, micPub?.trackSid)} disabled={!micPub?.trackSid}>
        <VolumeX size={15}/> Mute microphone
      </button>

      {blocked.mic ? (
        <button onClick={()=>onAction('allow-mic', participant)}><Volume2 size={15}/> Allow microphone</button>
      ) : (
        <button onClick={()=>onAction('disable-mic', participant, micPub?.trackSid)}><MicOff size={15}/> Disable microphone</button>
      )}

      {blocked.camera ? (
        <button onClick={()=>onAction('allow-camera', participant)}><Video size={15}/> Allow camera</button>
      ) : (
        <button onClick={()=>onAction('disable-camera', participant, camPub?.trackSid)}><CameraOff size={15}/> Disable camera</button>
      )}

      {blocked.screen ? (
        <button onClick={()=>onAction('allow-screen-share', participant)}><MonitorUp size={15}/> Allow screen sharing</button>
      ) : (
        <button onClick={()=>onAction('block-screen-share', participant)}><MonitorOff size={15}/> Block screen sharing</button>
      )}

      {raised && <button onClick={()=>onAction('lower-hand', participant)}><Hand size={15}/> Lower hand</button>}

      <button className="danger-text" onClick={()=>onAction('remove', participant)}><UserMinus size={15}/> Remove from class</button>
    </div>
  )
}
