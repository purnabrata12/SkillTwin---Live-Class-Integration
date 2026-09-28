import { useMemo, useState } from 'react'
import { Hand, MicOff, MoreVertical, Pin, Search, VideoOff, VolumeX } from 'lucide-react'
import Avatar from './Avatar'
import TrainerControls from './TrainerControls'

function getRole(p) {
  try { return JSON.parse(p.metadata || '{}').role || 'trainee' } catch { return 'trainee' }
}

export default function ParticipantPanel({
  participants, role, session, onPin, onMuteAll, onModerate, onSpotlight
}) {
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState('')

  const filtered = useMemo(() => {
    return participants.filter(p => (p.name || p.identity || '').toLowerCase().includes(search.toLowerCase()))
  }, [participants, search])

  return (
    <div className="panel-content">
      <div className="section-head">
        <h3>People ({participants.length})</h3>
        {role==='trainer' && <button className="small-btn" onClick={onMuteAll}><VolumeX size={15}/> Mute all</button>}
      </div>

      <div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search participants"/></div>

      {filtered.map(p=>{
        const raised = session.raisedHands?.includes(p.identity)
        const participantRole = p.identity === session.trainerIdentity ? 'trainer' : (p.isLocal ? role : getRole(p))
        const blocked = {
          mic: session.blockedMic?.includes(p.identity),
          camera: session.blockedCamera?.includes(p.identity),
          screen: session.blockedScreenShare?.includes(p.identity),
        }

        return (
          <div className="person-row" key={p.identity}>
            <Avatar name={p.name||p.identity} size="small"/>
            <div className="person-meta">
              <strong>{p.name || p.identity}{p.isLocal?' (You)':''}</strong>
              <span>{participantRole==='trainer'?'Trainer / Host':'Trainee'}</span>
            </div>

            <div className="person-states">
              {!p.isMicrophoneEnabled && <MicOff size={15}/>}
              {!p.isCameraEnabled && <VideoOff size={15}/>}
              {raised && <Hand size={15}/>}
            </div>

            <button className="row-icon" title="Pin participant" onClick={()=>onPin(p.identity)}><Pin size={15}/></button>

            {role==='trainer' && !p.isLocal && participantRole!=='trainer' && (
              <div className="menu-anchor">
                <button className="row-icon" onClick={()=>setOpenMenu(openMenu===p.identity?'':p.identity)}><MoreVertical size={15}/></button>
                {openMenu===p.identity && (
                  <TrainerControls
                    participant={p}
                    raised={raised}
                    blocked={blocked}
                    onAction={(action, participant, trackSid)=>{
                      setOpenMenu('')
                      onModerate(action, participant, trackSid)
                    }}
                    onSpotlight={()=>{
                      setOpenMenu('')
                      onSpotlight(p.identity)
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
