import { Copy, ExternalLink, Lock, Unlock } from 'lucide-react'

function publicBaseUrl(){
  const configured=(import.meta.env.VITE_PUBLIC_APP_URL||'').trim().replace(/\/$/,'')
  return configured || window.location.origin
}

export default function SessionDetails({ session, roomName, role, duration, onLock, onToast }) {
  const base=publicBaseUrl()
  const traineeInvite = `${base}/live/${encodeURIComponent(roomName)}?role=trainee`

  async function copyText(text,message) {
    try{
      await navigator.clipboard.writeText(text)
      onToast(message)
    }catch{
      onToast('Could not copy automatically. Select the text and copy it manually.')
    }
  }

  return (
    <div className="panel-content">
      <Card label="Course" value={session.courseName}/>
      <Card label="Session" value={session.sessionTitle}/>
      <Card label="Trainer" value={session.trainerName}/>

      <div className="detail-card">
        <span>Meeting ID</span>
        <strong>{roomName}</strong>
        <button className="detail-action" onClick={()=>copyText(roomName,'Meeting ID copied.')}><Copy size={15}/> Copy meeting ID</button>
      </div>

      <Card label="Start time" value={new Date(session.startTime).toLocaleString()}/>
      <Card label="Duration" value={duration}/>

      <div className="detail-card invite-card">
        <span>Trainee invite</span>
        <strong className="break">{traineeInvite}</strong>
        <div className="detail-action-row">
          <button className="detail-action" onClick={()=>copyText(traineeInvite,'Exact trainee invite copied.')}><Copy size={15}/> Copy trainee invite</button>
          <button className="detail-action" onClick={()=>window.open(traineeInvite,'_blank','noopener,noreferrer')}><ExternalLink size={15}/> Test link</button>
        </div>
        <small>Share this exact link so trainees do not have to type the meeting ID.</small>
      </div>

      {role==='trainer' && (
        <button className="detail-action block" onClick={()=>onLock(!session.locked)}>
          {session.locked?<Unlock size={16}/>:<Lock size={16}/>} 
          {session.locked?'Unlock class':'Lock class'}
        </button>
      )}
    </div>
  )
}

function Card({label,value}) {
  return <div className="detail-card"><span>{label}</span><strong>{value || '—'}</strong></div>
}
