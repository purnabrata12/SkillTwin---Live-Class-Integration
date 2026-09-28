import { useState } from 'react'
import { VideoTrack } from '@livekit/components-react'
import { Hand, MicOff, MoreVertical, Pin, PinOff, Star } from 'lucide-react'
import Avatar from './Avatar'

export default function ParticipantTile({
  participant,
  trackRef,
  main = false,
  pinned = false,
  isPresenting = false,
  raised = false,
  activeSpeaker = false,
  canSpotlight = false,
  onPin,
  onSpotlight,
}) {
  const [menu, setMenu] = useState(false)
  const hasVideo = Boolean(
    trackRef?.publication &&
    !trackRef.publication.isMuted &&
    trackRef.publication.track
  )

  return (
    <article className={`participant-tile ${main ? 'main-tile' : ''} ${activeSpeaker ? 'speaking' : ''}`}>
      {hasVideo ? (
        <VideoTrack trackRef={trackRef}/>
      ) : (
        <div className="tile-avatar"><Avatar name={participant?.name || participant?.identity}/></div>
      )}

      <div className="tile-name">
        <span>{participant?.name || participant?.identity}</span>
        {raised && <span className="hand-badge"><Hand size={13}/> Hand raised</span>}
      </div>

      <div className="tile-status">
        {isPresenting && <span className="status-pill">Presenting</span>}
        {!participant?.isMicrophoneEnabled && <span className="status-pill"><MicOff size={14}/></span>}
      </div>

      {(onPin || (canSpotlight && onSpotlight)) && (
        <div className="tile-actions">
          {onPin && (
            <button title={pinned ? 'Unpin participant' : 'Pin participant'} onClick={onPin}>
              {pinned ? <PinOff size={18}/> : <Pin size={18}/>}
            </button>
          )}
          <button title="More options" onClick={()=>setMenu(v=>!v)}><MoreVertical size={18}/></button>

          {menu && (
            <div className="tile-menu">
              {onPin && (
                <button onClick={()=>{onPin();setMenu(false)}}>
                  {pinned ? <PinOff size={15}/> : <Pin size={15}/>} {pinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              {canSpotlight && onSpotlight && (
                <button onClick={()=>{onSpotlight();setMenu(false)}}>
                  <Star size={15}/> Spotlight for everyone
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
