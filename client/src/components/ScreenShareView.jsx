import { MonitorUp } from 'lucide-react'
import ParticipantTile from './ParticipantTile'

export default function ScreenShareView({ trackRef, participant }) {
  return (
    <div className="screen-share-view">
      <ParticipantTile
        participant={participant}
        trackRef={trackRef}
        main
        isPresenting
      />
      <div className="presenting-label"><MonitorUp size={16}/>{participant?.name || participant?.identity} is presenting</div>
    </div>
  )
}
