import { RotateCcw, UserCheck, UserX } from 'lucide-react'
import Avatar from './Avatar'

export default function WaitingRoom({ pending=[], removed=[], onAdmit, onReject, onAllowRejoin }) {
  return (
    <div className="panel-content">
      <div className="section-head">
        <h3>Waiting room</h3>
        {pending.length>1 && <button className="small-btn" onClick={()=>onAdmit(null,true)}><UserCheck size={15}/> Admit all</button>}
      </div>

      {pending.length===0 && <div className="empty-state">Nobody is waiting.</div>}
      {pending.map(person=>(
        <div className="waiting-row" key={person.identity}>
          <Avatar name={person.name} size="small"/>
          <div><strong>{person.name}</strong><span>Wants to join</span></div>
          <button className="accept" onClick={()=>onAdmit(person.identity,false)} title="Admit"><UserCheck size={16}/></button>
          <button className="reject" onClick={()=>onReject(person.identity)} title="Reject"><UserX size={16}/></button>
        </div>
      ))}

      {removed.length>0 && (
        <>
          <div className="section-head top-gap"><h3>Removed</h3></div>
          {removed.map(person=>(
            <div className="waiting-row" key={person.identity}>
              <Avatar name={person.name} size="small"/>
              <div><strong>{person.name}</strong><span>Cannot rejoin</span></div>
              <button className="small-btn" onClick={()=>onAllowRejoin(person.identity)}><RotateCcw size={15}/> Allow rejoin</button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
