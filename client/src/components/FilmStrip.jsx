import ParticipantTile from './ParticipantTile'

export default function FilmStrip({ participants, trackFor, pinned, raisedHands, role, onPin, onSpotlight }) {
  return (
    <div className="filmstrip">
      {participants.map(participant => (
        <ParticipantTile
          key={participant.identity}
          participant={participant}
          trackRef={trackFor(participant)}
          pinned={pinned === participant.identity}
          activeSpeaker={participant.isSpeaking}
          raised={raisedHands.includes(participant.identity)}
          canSpotlight={role === 'trainer'}
          onPin={()=>onPin(participant.identity)}
          onSpotlight={()=>onSpotlight(participant.identity)}
        />
      ))}
    </div>
  )
}
