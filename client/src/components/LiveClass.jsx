import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
} from '@livekit/components-react'
import { ConnectionState, RoomEvent, Track } from 'livekit-client'
import { PanelRightClose, PanelRightOpen, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { api } from '../services/api'
import useSessionSocket from '../hooks/useSessionSocket'
import VideoStage from './VideoStage'
import MeetingControls from './MeetingControls'
import SidePanel from './SidePanel'
import SettingsModal from './SettingsModal'
import ConfirmModal from './ConfirmModal'
import Whiteboard from './Whiteboard'
import MoreMenu from './MoreMenu'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export default function LiveClass(props) {
  const [connectError, setConnectError] = useState('')

  return (
    <LiveKitRoom
      token={props.token}
      serverUrl={props.serverUrl}
      connect={true}
      audio={Boolean(props.joinPrefs.micOn)}
      video={Boolean(props.joinPrefs.cameraOn)}
      options={{ adaptiveStream:true, dynacast:true, disconnectOnPageLeave:true }}
      connectOptions={{ autoSubscribe:true }}
      onConnected={()=>setConnectError('')}
      onError={err=>setConnectError(err?.message || 'Could not connect to the LiveKit room.')}
      className="livekit-root"
    >
      <Classroom {...props} connectError={connectError}/>
      <RoomAudioRenderer/>
    </LiveKitRoom>
  )
}

function Classroom({ roomName, role, name, identity, session:initialSession, joinPrefs, onExit, connectError }) {
  const room=useRoomContext()
  const {
    localParticipant: local,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    lastMicrophoneError,
    lastCameraError,
  }=useLocalParticipant()
  const participants=useParticipants()
  const cameraTracks=useTracks([{source:Track.Source.Camera,withPlaceholder:true}], {onlySubscribed:false})
  const screenTracks=useTracks([Track.Source.ScreenShare], {onlySubscribed:false})

  const [session,setSession]=useState(initialSession)
  const [panel,setPanel]=useState('')
  const [pinned,setPinned]=useState(null)
  const [previousPin,setPreviousPin]=useState(null)
  const [chatMessages,setChatMessages]=useState([])
  const [chatText,setChatText]=useState('')
  const [handRaised,setHandRaised]=useState(false)
  const [captions,setCaptions]=useState(false)
  const [recording,setRecording]=useState(false)
  const [settingsOpen,setSettingsOpen]=useState(false)
  const [whiteboardOpen,setWhiteboardOpen] =
  useState(Boolean(initialSession.whiteboardOpen))

const [whiteboardStrokes,setWhiteboardStrokes] =
  useState([])
  const [moreOpen,setMoreOpen]=useState(false)
  const [leaveOpen,setLeaveOpen]=useState(false)
  const [toast,setToast]=useState('')
  const [connection,setConnection]=useState(room.state)
  const [elapsed,setElapsed]=useState(0)
  const [slowConnection,setSlowConnection]=useState(false)
  const [mediaBusy,setMediaBusy]=useState({mic:false,camera:false,screen:false})
  const [localMicOn,setLocalMicOn]=useState(Boolean(isMicrophoneEnabled))
  const [localCameraOn,setLocalCameraOn]=useState(Boolean(isCameraEnabled))
  const [localScreenOn,setLocalScreenOn]=useState(Boolean(isScreenShareEnabled))
  const [socketReady,setSocketReady]=useState(false)
  const [devicePrefs,setDevicePrefs]=useState({
    cameraId:joinPrefs.cameraId||'',
    micId:joinPrefs.micId||'',
    speakerId:joinPrefs.speakerId||'',
  })
  const mediaBusyRef=useRef({mic:false,camera:false,screen:false})
 
  const hasConnectedRef=useRef(false)

  const showToast=useCallback(msg=>{
    setToast(msg)
    clearTimeout(window.__skillTwinToast)
    window.__skillTwinToast=setTimeout(()=>setToast(''),3000)
  },[])

  const setBusy=useCallback((kind,value)=>{
    mediaBusyRef.current={...mediaBusyRef.current,[kind]:value}
    setMediaBusy(prev=>({...prev,[kind]:value}))
  },[])

  const upsertWhiteboardStroke=useCallback(stroke=>{
  if(!stroke?.id || !Array.isArray(stroke.points))return

  setWhiteboardStrokes(prev=>{
    const index=prev.findIndex(item=>item.id===stroke.id)

    if(index<0){
      return [...prev,stroke]
    }

    const next=[...prev]
    next[index]=stroke

    return next
  })
},[])

  const handleSessionEnded=useCallback(()=>{
    try{ room.disconnect() }catch{}
    if(role==='trainer') onExit('__TRAINER_ENDED__')
    else onExit('Trainer has ended the class.')
  },[onExit,role,room])

  const onSocketEvent=useCallback(async(type,data)=>{
    if(type==='socket-connected') setSocketReady(true)
    if(type==='socket-disconnected') setSocketReady(false)
    if(type==='socket-error'){
      setSocketReady(false)
      showToast(data?.message || 'Realtime classroom connection failed.')
    }
    if(type==='session-state'){
      if(data?.ended) handleSessionEnded()
      else setSession(data)
    }
    if(type==='chat-history') setChatMessages(Array.isArray(data)?data:[])
    if(type==='chat-message') setChatMessages(v=>v.some(m=>m.id===data?.id)?v:[...v,data])
    if(type==='hand-state' && data.raised && data.identity!==identity) showToast(`${data.name} raised their hand.`)
    if(type==='hand-lowered'){setHandRaised(false);showToast('Your hand was lowered by the trainer.')}
    if(type==='spotlight') setSession(s=>({...s,spotlightParticipantId:data.targetIdentity}))
    if(type==='removed'){room.disconnect();onExit(data.message)}
    if(type==='session-ended') handleSessionEnded()
      if(type==='whiteboard-state'){
  setWhiteboardStrokes(
    Array.isArray(data?.strokes)
      ? data.strokes
      : []
  )

  setWhiteboardOpen(
    Boolean(data?.open)
  )
}


if(type==='whiteboard-open'){
  setWhiteboardStrokes(
    Array.isArray(data?.strokes)
      ? data.strokes
      : []
  )

  setWhiteboardOpen(true)
}


if(type==='whiteboard-stroke'){
  upsertWhiteboardStroke(data)
}


if(type==='whiteboard-clear'){
  setWhiteboardStrokes([])
}


if(type==='whiteboard-close'){
  setWhiteboardOpen(false)
}
    if(type==='moderation-control'){
      try{
        if(data.action==='mute-mic'){
          await local.setMicrophoneEnabled(false)
          setLocalMicOn(false)
          showToast('The trainer muted your microphone.')
        }
        if(data.action==='disable-mic'){
          await local.setMicrophoneEnabled(false)
          setLocalMicOn(false)
          showToast('Your microphone was disabled by the trainer.')
        }
        if(data.action==='disable-camera'){
          await local.setCameraEnabled(false)
          setLocalCameraOn(false)
          showToast('Your camera was disabled by the trainer.')
        }
        if(data.action==='block-screen-share'){
          await local.setScreenShareEnabled(false)
          setLocalScreenOn(false)
          showToast('Screen sharing was disabled by the trainer.')
        }
        if(data.action==='allow-mic')showToast('You may use your microphone again.')
        if(data.action==='allow-camera')showToast('You may use your camera again.')
        if(data.action==='allow-screen-share')showToast('You may share your screen again.')
      }catch(err){
        showToast(err?.message || 'Could not apply trainer control.')
      }
    }
  },[[
  handleSessionEnded,
  identity,
  local,
  room,
  showToast,
  upsertWhiteboardStroke
]])

  const socket=useSessionSocket({roomName,identity,role,name,onEvent:onSocketEvent})

  useEffect(()=>{
    const start=new Date(session.startTime).getTime()
    const validStart=Number.isFinite(start) ? start : Date.now()
    const tick=()=>setElapsed(Math.max(0,Math.floor((Date.now()-validStart)/1000)))
    tick()
    const id=setInterval(tick,1000)
    return()=>clearInterval(id)
  },[session.startTime])

  useEffect(()=>{
    const fn=state=>{
      setConnection(state)
      if(state===ConnectionState.Connected)hasConnectedRef.current=true
    }
    room.on(RoomEvent.ConnectionStateChanged,fn)
    setConnection(room.state)
    if(room.state===ConnectionState.Connected)hasConnectedRef.current=true
    return()=>room.off(RoomEvent.ConnectionStateChanged,fn)
  },[room])

  // If LiveKit is disconnected by the server before the Socket.IO event arrives,
  // confirm the session state and still show the correct ended-class flow.
  useEffect(()=>{
    if(connection!==ConnectionState.Disconnected || !hasConnectedRef.current)return
    let cancelled=false
    const timer=setTimeout(async()=>{
      try{
        const current=await api.getSession(roomName)
        if(!cancelled && current?.ended)handleSessionEnded()
      }catch{}
    },250)
    return()=>{cancelled=true;clearTimeout(timer)}
  },[connection,handleSessionEnded,roomName])

  useEffect(()=>{ setLocalMicOn(Boolean(isMicrophoneEnabled)) },[isMicrophoneEnabled])
  useEffect(()=>{ setLocalCameraOn(Boolean(isCameraEnabled)) },[isCameraEnabled])
  useEffect(()=>{ setLocalScreenOn(Boolean(isScreenShareEnabled)) },[isScreenShareEnabled])

  useEffect(()=>{
    if(connection===ConnectionState.Connected){
      setSlowConnection(false)
      return
    }
    const timer=setTimeout(()=>setSlowConnection(true),10000)
    return()=>clearTimeout(timer)
  },[connection])

  useEffect(()=>{
    if(connection!==ConnectionState.Connected)return
    let cancelled=false

    async function setupDevices(){
      try{
        if(devicePrefs.cameraId)await room.switchActiveDevice('videoinput',devicePrefs.cameraId).catch(()=>{})
        if(devicePrefs.micId)await room.switchActiveDevice('audioinput',devicePrefs.micId).catch(()=>{})
        if(devicePrefs.speakerId)await room.switchActiveDevice('audiooutput',devicePrefs.speakerId).catch(()=>{})

        if(role==='trainee'&&initialSession.muteOnEntry&&local.isMicrophoneEnabled){
          await local.setMicrophoneEnabled(false)
          setLocalMicOn(false)
        }
      }catch(err){
        if(!cancelled)showToast(err?.message || 'Could not apply the selected device.')
      }
    }

    setupDevices()
    return()=>{cancelled=true}
  },[connection,initialSession.muteOnEntry,devicePrefs.cameraId,devicePrefs.micId,devicePrefs.speakerId,local,role,room,showToast])

  const micBlocked=role==='trainee'&&(session.blockedMic?.includes(identity)||!session.allowTraineeMic)
  const cameraBlocked=role==='trainee'&&(session.blockedCamera?.includes(identity)||!session.allowTraineeCamera)
  const screenBlocked=role==='trainee'&&(session.blockedScreenShare?.includes(identity)||!session.allowTraineeScreenShare)

  const micOn=localMicOn&&!micBlocked
  const cameraOn=localCameraOn&&!cameraBlocked
  const sharing=localScreenOn
  const mediaUnavailable=connection!==ConnectionState.Connected

  useEffect(()=>{
    if(role!=='trainee' || connection!==ConnectionState.Connected)return

    if(micBlocked && localMicOn){
      local.setMicrophoneEnabled(false).then(()=>setLocalMicOn(false)).catch(()=>{})
    }
    if(cameraBlocked && localCameraOn){
      local.setCameraEnabled(false).then(()=>setLocalCameraOn(false)).catch(()=>{})
    }
    if(screenBlocked && localScreenOn){
      local.setScreenShareEnabled(false).then(()=>setLocalScreenOn(false)).catch(()=>{})
    }
  },[role,connection,micBlocked,cameraBlocked,screenBlocked,local,localMicOn,localCameraOn,localScreenOn])

  const activeScreen=screenTracks.find(ref=>ref.publication&&!ref.publication.isMuted)
  const presenterIdentity=activeScreen?.participant?.identity||null

  useEffect(()=>{
    if(presenterIdentity && previousPin===null){
      setPreviousPin(pinned || '__NONE__')
    }
    if(!presenterIdentity && previousPin!==null){
      setPinned(previousPin==='__NONE__'?null:previousPin)
      setPreviousPin(null)
    }
  },[presenterIdentity,previousPin,pinned])

  function formatDuration(seconds){
    const h=String(Math.floor(seconds/3600)).padStart(2,'0')
    const m=String(Math.floor((seconds%3600)/60)).padStart(2,'0')
    const s=String(seconds%60).padStart(2,'0')
    return `${h}:${m}:${s}`
  }

  function togglePanel(tab){setPanel(current=>current===tab?'':tab)}
  function pin(id){setPinned(current=>current===id?null:id)}

  async function enableCamera(){
    const options=devicePrefs.cameraId?{deviceId:devicePrefs.cameraId}:undefined
    try{
      await local.setCameraEnabled(true,options)
    }catch(firstError){
      if(options)await local.setCameraEnabled(true)
      else throw firstError
    }
    setLocalCameraOn(true)
  }

  async function enableMic(){
    const options=devicePrefs.micId?{deviceId:devicePrefs.micId}:undefined
    try{
      await local.setMicrophoneEnabled(true,options)
    }catch(firstError){
      if(options)await local.setMicrophoneEnabled(true)
      else throw firstError
    }
    setLocalMicOn(true)
  }

  async function toggleMic(){
    if(micBlocked)return showToast('Microphone is disabled by the trainer.')
    if(mediaUnavailable)return showToast('Wait until the classroom finishes connecting.')
    if(mediaBusyRef.current.mic)return

    const next=!localMicOn
    setBusy('mic',true)
    try{
      if(next)await enableMic()
      else{
        await local.setMicrophoneEnabled(false)
        setLocalMicOn(false)
      }
    }catch(err){
      showToast(err?.message || lastMicrophoneError?.message || `Could not turn ${next?'on':'off'} the microphone.`)
    }finally{
      setBusy('mic',false)
    }
  }

  async function toggleCamera(){
    if(cameraBlocked)return showToast('Camera is disabled by the trainer.')
    if(mediaUnavailable)return showToast('Wait until the classroom finishes connecting.')
    if(mediaBusyRef.current.camera)return

    const next=!localCameraOn
    setBusy('camera',true)
    try{
      if(next)await enableCamera()
      else{
        await local.setCameraEnabled(false)
        setLocalCameraOn(false)
      }
    }catch(err){
      showToast(err?.message || lastCameraError?.message || `Could not turn ${next?'on':'off'} the camera.`)
    }finally{
      setBusy('camera',false)
    }
  }

  async function toggleShare(){
    if(screenBlocked)return showToast('Screen sharing is disabled by the trainer.')
    if(mediaUnavailable)return showToast('Wait until the classroom finishes connecting.')
    if(mediaBusyRef.current.screen)return

    const next=!localScreenOn
    setBusy('screen',true)
    try{
      await local.setScreenShareEnabled(next)
      setLocalScreenOn(next)
    }catch(err){
      showToast(err?.message || 'Screen sharing was cancelled.')
    }finally{
      setBusy('screen',false)
    }
  }

  function publishWhiteboardStroke(stroke) {

  if(role!=='trainer') return

  upsertWhiteboardStroke(stroke)

  if(!socket.connected) {
    return showToast(
      'Whiteboard is reconnecting to the classroom server.'
    )
  }

  socket.emit(
    'whiteboard-stroke',
    stroke
  )
}


function clearWhiteboard() {

  if(role!=='trainer') return

  setWhiteboardStrokes([])

  if(!socket.connected) {
    return showToast(
      'Whiteboard is reconnecting to the classroom server.'
    )
  }

  socket.emit('whiteboard-clear')
}


function toggleWhiteboard() {

  if(role!=='trainer') return

  if(!socket.connected) {
    return showToast(
      'Whiteboard is reconnecting to the classroom server.'
    )
  }

  if(whiteboardOpen) {

    setWhiteboardOpen(false)

    socket.emit(
      'whiteboard-close'
    )

    return
  }

  setWhiteboardOpen(true)

  socket.emit(
    'whiteboard-open'
  )
}


function closeWhiteboard() {

  if(role!=='trainer') return

  setWhiteboardOpen(false)

  if(socket.connected) {
    socket.emit(
      'whiteboard-close'
    )
  }
}

  function toggleHand(){
    if(!socket.connected)return showToast('Realtime controls are reconnecting.')
    const next=!handRaised
    setHandRaised(next)
    socket.emit('raise-hand',{raised:next})
  }

  function sendChat(){
    const text=chatText.trim()
    if(!text)return
    if(!socket.connected){
      showToast('Chat is reconnecting. Try again in a moment.')
      return
    }

    setChatText('')
    socket.timeout(4000).emit('chat-message',{text},(err,result)=>{
      if(err || !result?.ok){
        setChatText(current=>current || text)
        showToast(result?.error || 'Message was not delivered. Please try again.')
      }
    })
  }

  function spotlight(id){
    if(!socket.connected)return showToast('Realtime controls are reconnecting.')
    socket.emit('spotlight',{targetIdentity:session.spotlightParticipantId===id?null:id})
    showToast(session.spotlightParticipantId===id?'Spotlight removed.':'Participant spotlighted for everyone.')
  }

  function updatePolicy(patch){
    if(!socket.connected)return showToast('Realtime controls are reconnecting.')
    socket.emit('session-policy',patch)
  }

  async function moderate(action,participant,trackSid){
    if(action==='remove'&&!window.confirm(`Remove ${participant.name||participant.identity} from this class?`))return
    try{
      await api.moderate(roomName,{
        identity,role,action,targetIdentity:participant.identity,
        targetName:participant.name||participant.identity,trackSid
      })
      showToast('Trainer control updated.')
    }catch(err){showToast(err.message)}
  }

  async function muteAll(){
    if(!window.confirm('Mute all trainees?'))return
    const trainees=participants.filter(p=>!p.isLocal && p.identity!==session.trainerIdentity)
    for(const p of trainees){
      try{
        await api.moderate(roomName,{
          identity,role,action:'mute-track',targetIdentity:p.identity,targetName:p.name||p.identity
        })
      }catch{}
    }
    showToast('All trainee microphones were muted.')
  }

  async function admit(targetIdentity,admitAll){
    try{await api.admit(roomName,{identity,role,targetIdentity,admitAll})}catch(err){showToast(err.message)}
  }
  async function reject(targetIdentity){
    try{await api.reject(roomName,{identity,role,targetIdentity})}catch(err){showToast(err.message)}
  }
  async function allowRejoin(targetIdentity){
    try{await api.allowRejoin(roomName,{identity,role,targetIdentity});showToast('Participant can rejoin again.')}catch(err){showToast(err.message)}
  }
  async function lock(locked){
    try{await api.lock(roomName,{identity,role,locked});showToast(locked?'Class locked.':'Class unlocked.')}catch(err){showToast(err.message)}
  }

  async function leaveOnly(){
    setLeaveOpen(false)
    room.disconnect()
    onExit('You left the SkillTwin live class.')
  }

  async function endEveryone(){
    setLeaveOpen(false)
    try{
      await api.endSession(roomName,{identity,role})
      handleSessionEnded()
    }catch(err){showToast(err.message)}
  }

  async function fullScreen(){
    try{
      if(!document.fullscreenElement)await document.documentElement.requestFullscreen()
      else await document.exitFullscreen()
    }catch{}
  }

  async function pictureInPicture(){
    const video=document.querySelector('.main-tile video, .screen-share-view video, .participant-tile video')
    if(!video||!document.pictureInPictureEnabled)return showToast('Picture in picture is not available for the current video.')
    try{
      if(document.pictureInPictureElement)await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    }catch{showToast('Picture in picture could not be started.')}
  }

  function reportProblem(){
    const subject=encodeURIComponent(`SkillTwin Live Classroom issue - ${roomName}`)
    window.location.href=`mailto:?subject=${subject}`
  }

  const duration=formatDuration(elapsed)
  const networkText=connectError
    ? 'Connection error'
    : connection===ConnectionState.Connected
      ? 'Connected'
      : connection===ConnectionState.Reconnecting
        ? 'Reconnecting'
        : connection===ConnectionState.Connecting
          ? 'Connecting'
          : 'Disconnected'

  const connectionMessage=connectError
    ? `LiveKit connection problem: ${connectError}`
    : slowConnection&&connection!==ConnectionState.Connected
      ? 'Still connecting to LiveKit. Check server/.env, your internet connection, and that the LiveKit project URL starts with wss://.'
      : connection===ConnectionState.Connected&&!socketReady
        ? 'Video is connected, but classroom controls/chat are reconnecting to the SkillTwin server.'
        : ''

  return (
    <div className="meeting-shell">
      <header className="meeting-top">
        <div className="brand"><span className="brand-logo"><img src="/skilltwin-logo.jpeg" alt="SkillTwin logo" /></span><strong>SkillTwin</strong><span className="brand-section">Live Classroom</span></div>

        <div className="meeting-heading">
          <span className="live-badge"><i/> LIVE</span>
          <div><strong>{session.courseName}</strong><span>{session.sessionTitle}</span></div>
        </div>

        <div className="meeting-meta">
          <span className={`network ${connection===ConnectionState.Connected?'ok':''}`}>{connection===ConnectionState.Connected?<Wifi size={15}/>:<WifiOff size={15}/>} {networkText}</span>
          <span className="duration">{duration}</span>
          <button className="top-icon" title="Toggle side panel" onClick={()=>setPanel(panel?'':'participants')}>{panel?<PanelRightClose/>:<PanelRightOpen/>}</button>
        </div>
      </header>

      <div className={`meeting-body ${panel?'with-panel':''}`}>
        <main className="stage">
          {toast&&<div className="toast">{toast}</div>}
          {connectionMessage&&<div className="connection-warning">{connectionMessage}</div>}
          <VideoStage
            participants={participants}
            cameraTracks={cameraTracks}
            screenTracks={screenTracks}
            pinned={pinned}
            spotlight={session.spotlightParticipantId}
            previousPin={previousPin}
            raisedHands={session.raisedHands||[]}
            role={role}
            onPin={pin}
            onSpotlight={spotlight}
          />
          {sharing&&<button className="stop-presenting" onClick={toggleShare}>Stop presenting</button>}
          {captions&&<div className="captions">Live captions are ready for a speech-to-text provider.</div>}
          {whiteboardOpen && (

  <Whiteboard

    strokes={whiteboardStrokes}

    readOnly={role !== 'trainer'}

    trainerName={
      session.trainerName || 'Trainer'
    }

    onStrokeChange={
      publishWhiteboardStroke
    }

    onClear={
      clearWhiteboard
    }

    onClose={
      closeWhiteboard
    }

  />

)} 
        </main>

        <SidePanel
          tab={panel}
          onTab={setPanel}
          role={role}
          session={session}
          roomName={roomName}
          participants={participants}
          chatMessages={chatMessages}
          chatText={chatText}
          setChatText={setChatText}
          onSendChat={sendChat}
          duration={duration}
          onPin={pin}
          onMuteAll={muteAll}
          onModerate={moderate}
          onSpotlight={spotlight}
          onLock={lock}
          onToast={showToast}
          onAdmit={admit}
          onReject={reject}
          onAllowRejoin={allowRejoin}
        />
      </div>

      <footer className="meeting-footer">
        <div className="footer-left">
          <span>{roomName}</span>
          {role==='trainer'&&<span className="host-chip"><ShieldCheck size={14}/> Host</span>}
        </div>

        <MeetingControls
          role={role}
          micOn={micOn}
          cameraOn={cameraOn}
          sharing={sharing}
          handRaised={handRaised}
          captions={captions}
          recording={recording}
          micBlocked={micBlocked}
          cameraBlocked={cameraBlocked}
          screenBlocked={screenBlocked}
          micBusy={mediaBusy.mic||mediaUnavailable}
          cameraBusy={mediaBusy.camera||mediaUnavailable}
          screenBusy={mediaBusy.screen||mediaUnavailable}
          onMic={toggleMic}
          onCamera={toggleCamera}
          onShare={toggleShare}
          onHand={toggleHand}
          onParticipants={()=>togglePanel('participants')}
          onChat={()=>togglePanel('chat')}
          onCaptions={()=>setCaptions(v=>!v)}
          onRecord={()=>{
            setRecording(false)
            showToast('Recording service is not configured. Connect LiveKit Egress to enable recording.')
          }}
          onWhiteboard={toggleWhiteboard}
          onSettings={()=>setSettingsOpen(true)}
          onDetails={()=>setPanel('details')}
          onFullScreen={fullScreen}
          onMore={()=>setMoreOpen(v=>!v)}
          onLeave={()=>setLeaveOpen(true)}
        />

        <div className="footer-right">
          <button onClick={()=>togglePanel('participants')}>{participants.length} participant{participants.length===1?'':'s'}</button>
        </div>

        {moreOpen&&<MoreMenu onSettings={()=>setSettingsOpen(true)} onDetails={()=>setPanel('details')} onFullScreen={fullScreen} onPiP={pictureInPicture} onReport={reportProblem} onClose={()=>setMoreOpen(false)}/>} 
      </footer>

      {settingsOpen&&<SettingsModal room={room} role={role} session={session} selectedDevices={devicePrefs} onDeviceChange={setDevicePrefs} onPolicy={updatePolicy} onClose={()=>setSettingsOpen(false)}/>} 

      {leaveOpen&&role==='trainer'&&(
        <ConfirmModal
          title="Leave or end live class?"
          confirmText="End class for everyone"
          danger
          onConfirm={endEveryone}
          onClose={()=>setLeaveOpen(false)}
          secondText="Leave class"
          onSecond={leaveOnly}
        >
          End class disconnects every participant. Leave class disconnects only you.
        </ConfirmModal>
      )}

      {leaveOpen&&role==='trainee'&&(
        <ConfirmModal title="Leave class?" confirmText="Leave class" danger onConfirm={leaveOnly} onClose={()=>setLeaveOpen(false)}>
          This leaves only your connection. The live class will continue for everyone else.
        </ConfirmModal>
      )}
    </div>
  )
}
