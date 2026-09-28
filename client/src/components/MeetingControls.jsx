import {
  Captions, Circle, Hand, Info, Maximize2, MessageSquare, Mic, MicOff,
  MonitorOff, MonitorUp, MoreVertical, PenTool, PhoneOff, Settings,
  Users, Video, VideoOff
} from 'lucide-react'
import Tooltip from './Tooltip'

function Control({ label, className='', disabled=false, onClick, children }) {
  return (
    <Tooltip label={label}>
      <button className={`control ${className}`} disabled={disabled} onClick={onClick}>{children}</button>
    </Tooltip>
  )
}

export default function MeetingControls(props) {
  const {
    role,micOn,cameraOn,sharing,handRaised,captions,recording,
    micBlocked,cameraBlocked,screenBlocked,micBusy,cameraBusy,screenBusy,
    onMic,onCamera,onShare,onHand,onParticipants,onChat,onCaptions,
    onRecord,onWhiteboard,onSettings,onDetails,onFullScreen,onMore,onLeave
  } = props

  return (
    <div className="controls-shell">
      <Control label={micBlocked?'Microphone disabled by trainer':micOn?'Turn off microphone':'Turn on microphone'} className={!micOn||micBlocked?'off':''} disabled={micBlocked||micBusy} onClick={onMic}>
        {micOn&&!micBlocked?<Mic/>:<MicOff/>}
      </Control>

      <Control label={cameraBlocked?'Camera disabled by trainer':cameraOn?'Turn off camera':'Turn on camera'} className={!cameraOn||cameraBlocked?'off':''} disabled={cameraBlocked||cameraBusy} onClick={onCamera}>
        {cameraOn&&!cameraBlocked?<Video/>:<VideoOff/>}
      </Control>

      <Control label={screenBlocked?'Screen sharing disabled by trainer':sharing?'Stop presenting':'Present screen'} className={sharing?'active':''} disabled={screenBlocked||screenBusy} onClick={onShare}>
        {sharing?<MonitorOff/>:<MonitorUp/>}
      </Control>

      <Control label={captions?'Turn off captions':'Turn on captions'} className={captions?'active':''} onClick={onCaptions}><Captions/></Control>

      {role==='trainee' && (
        <Control label={handRaised?'Lower hand':'Raise hand'} className={handRaised?'active':''} onClick={onHand}><Hand/></Control>
      )}

      {role==='trainer' && (
        <>
          <Control label={recording?'Stop recording':'Record'} className={recording?'recording':''} onClick={onRecord}><Circle fill={recording?'currentColor':'none'}/></Control>
          <Control label="Whiteboard" onClick={onWhiteboard}><PenTool/></Control>
        </>
      )}

      <Control label="Participants" onClick={onParticipants}><Users/></Control>
      <Control label="Chat" onClick={onChat}><MessageSquare/></Control>
      <Control label="Settings" className="wide-only" onClick={onSettings}><Settings/></Control>
      <Control label="Meeting details" className="wide-only" onClick={onDetails}><Info/></Control>
      <Control label="Full screen" className="wide-only" onClick={onFullScreen}><Maximize2/></Control>
      <Control label="More options" onClick={onMore}><MoreVertical/></Control>
      <Control label={role==='trainer'?'Leave or end session':'Leave class'} className="hangup" onClick={onLeave}><PhoneOff/></Control>
    </div>
  )
}
