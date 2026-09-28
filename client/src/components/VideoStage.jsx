import ParticipantTile from './ParticipantTile'
import FilmStrip from './FilmStrip'
import ScreenShareView from './ScreenShareView'

export default function VideoStage({
  participants,
  cameraTracks,
  screenTracks,
  pinned,
  spotlight,
  previousPin,
  raisedHands,
  role,
  onPin,
  onSpotlight,
}) {
  const trackFor = participant => cameraTracks.find(ref => ref.participant?.identity === participant.identity)
  const activeScreen = screenTracks.find(ref => ref.publication && !ref.publication.isMuted)
  const presenter = activeScreen?.participant
  const focusIdentity = presenter?.identity || spotlight || pinned
  const focusParticipant = focusIdentity ? participants.find(p=>p.identity===focusIdentity) : null
  const others = focusIdentity ? participants.filter(p=>p.identity!==focusIdentity) : participants

  if (activeScreen && presenter) {
    return (
      <div className="focus-layout">
        <div className="focus-main"><ScreenShareView trackRef={activeScreen} participant={presenter}/></div>
        <FilmStrip
          participants={participants}
          trackFor={trackFor}
          pinned={pinned}
          raisedHands={raisedHands}
          role={role}
          onPin={onPin}
          onSpotlight={onSpotlight}
        />
      </div>
    )
  }

  if (focusParticipant) {
    return (
      <div className="focus-layout">
        <div className="focus-main">
          <ParticipantTile
            participant={focusParticipant}
            trackRef={trackFor(focusParticipant)}
            main
            pinned={pinned===focusIdentity}
            raised={raisedHands.includes(focusIdentity)}
            activeSpeaker={focusParticipant.isSpeaking}
            canSpotlight={role==='trainer'}
            onPin={()=>onPin(focusIdentity)}
            onSpotlight={()=>onSpotlight(focusIdentity)}
          />
        </div>
        <FilmStrip
          participants={others}
          trackFor={trackFor}
          pinned={pinned}
          raisedHands={raisedHands}
          role={role}
          onPin={onPin}
          onSpotlight={onSpotlight}
        />
      </div>
    )
  }

  const count = Math.min(participants.length, 9)
  return (
    <div className={`video-grid count-${count}`}>
      {participants.map(participant => (
        <ParticipantTile
          key={participant.identity}
          participant={participant}
          trackRef={trackFor(participant)}
          pinned={pinned===participant.identity}
          raised={raisedHands.includes(participant.identity)}
          activeSpeaker={participant.isSpeaking}
          canSpotlight={role==='trainer'}
          onPin={()=>onPin(participant.identity)}
          onSpotlight={()=>onSpotlight(participant.identity)}
        />
      ))}
    </div>
  )
}
