import ChatPanel from './ChatPanel'
import ParticipantPanel from './ParticipantPanel'
import SessionDetails from './SessionDetails'
import WaitingRoom from './WaitingRoom'

export default function SidePanel(props) {
  const { tab, role, session } = props
  if (!tab) return null

  return (
    <aside className="side-panel">
      <nav className="side-tabs">
        {['participants','chat','details', ...(role==='trainer'?['waiting']:[])].map(item=>(
          <button key={item} className={tab===item?'active':''} onClick={()=>props.onTab(item)}>
            {item==='waiting' ? `Waiting${session.pending?.length?` (${session.pending.length})`:''}` : item[0].toUpperCase()+item.slice(1)}
          </button>
        ))}
      </nav>

      {tab==='participants' && <ParticipantPanel {...props}/>}
      {tab==='chat' && <ChatPanel messages={props.chatMessages} text={props.chatText} setText={props.setChatText} onSend={props.onSendChat}/>}
      {tab==='details' && <SessionDetails session={session} roomName={props.roomName} role={role} duration={props.duration} onLock={props.onLock} onToast={props.onToast}/>}
      {tab==='waiting' && role==='trainer' && <WaitingRoom pending={session.pending || []} removed={session.removed || []} onAdmit={props.onAdmit} onReject={props.onReject} onAllowRejoin={props.onAllowRejoin}/>}
    </aside>
  )
}
