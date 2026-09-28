import { useEffect, useMemo, useState } from 'react'
import { API_URL, api } from './services/api'
import { getRouteInfo } from './services/route'
import { io } from 'socket.io-client'
import CreateSession from './components/CreateSession'
import PreJoin from './components/PreJoin'
import LiveClass from './components/LiveClass'
import JoinSession from './components/JoinSession'

export default function App() {
  const route=useMemo(getRouteInfo,[])
  const [session,setSession]=useState(null)
  const [displayName,setDisplayName]=useState(route.name)
  const [loading,setLoading]=useState(true)
  const [createMode,setCreateMode]=useState(false)
  const [waiting,setWaiting]=useState(false)
  const [error,setError]=useState('')
  const [connection,setConnection]=useState(null)
  const [exitMessage,setExitMessage]=useState('')

  function handleSessionEnded(){
    if(route.role==='trainer'){
      const params=new URLSearchParams()
      params.set('role','trainer')
      params.set('name',displayName || route.name || 'Trainer')
      window.location.replace(`/?${params.toString()}`)
      return
    }
    setConnection(null)
    setWaiting(false)
    setExitMessage('Trainer has ended the class.')
  }

  useEffect(()=>{
    let active=true

    async function load(){
      if(!route.roomName){
        if(active){
          setCreateMode(route.role==='trainer')
          setLoading(false)
        }
        return
      }

      try{
        const data=await api.getSession(route.roomName)
        if(!active)return
        if(data.ended){
          if(route.role==='trainer'){
            const params=new URLSearchParams({role:'trainer',name:displayName || route.name || 'Trainer'})
            window.location.replace(`/?${params.toString()}`)
            return
          }
          setExitMessage('Trainer has ended the class.')
        } else setSession(data)
      }catch(err){
        if(!active)return
        if(route.role==='trainer')setCreateMode(true)
        else setError(err.message)
      }finally{
        if(active)setLoading(false)
      }
    }

    load()
    return()=>{active=false}
  },[route.roomName,route.role])

  useEffect(()=>{
    if(!route.roomName||!session||connection)return
    const socket=io(API_URL,{
      query:{roomName:route.roomName,identity:route.identity,role:route.role,name:displayName||'Trainee'},
      transports:['websocket','polling'],
    })

    socket.on('session-state',data=>{
      if(data?.ended)handleSessionEnded()
      else setSession(data)
    })
    socket.on('admitted',async()=>{
      setWaiting(false)
      setError('')
      try{await connectToRoom(window.__skillTwinJoinPrefs||{cameraOn:true,micOn:true})}
      catch(err){setError(err.message)}
    })
    socket.on('rejected',({message})=>{setWaiting(false);setError(message)})
    socket.on('session-ended',handleSessionEnded)

    return()=>socket.disconnect()
  },[route.roomName,route.identity,route.role,displayName,session?.roomName,connection])

  async function connectToRoom(joinPrefs){
    setError('')
    const tokenData=await api.token({
      roomName:route.roomName,
      identity:route.identity,
      name:displayName || (route.role==='trainer'?'Trainer':'Trainee'),
      role:route.role,
    })
    setConnection({...tokenData,joinPrefs})
    return {connected:true}
  }

  async function join(joinPrefs){
    if(session?.ended){
      setExitMessage('Trainer has ended the class.')
      return {error:true}
    }

    setError('')
    window.__skillTwinJoinPrefs=joinPrefs

    try{
      const result=await api.joinRequest(route.roomName,{
        identity:route.identity,
        name:displayName || (route.role==='trainer'?'Trainer':'Trainee'),
        role:route.role,
      })

      if(result.status==='pending'){
        setWaiting(true)
        return {pending:true}
      }

      await connectToRoom(joinPrefs)
      return {connected:true}
    }catch(err){
      setError(err.message)
      return {error:true}
    }
  }

  function onCreated(created){
    const params=new URLSearchParams()
    params.set('role','trainer')
    params.set('name',displayName || 'Trainer')
    params.set('userId',route.identity)
    window.location.href=`/live/${created.roomName}?${params.toString()}`
  }

  if(loading)return <StatusPage message="Loading SkillTwin classroom..."/>
  if(exitMessage)return <StatusPage message={exitMessage} done/>
  if(createMode&&route.role==='trainer')return <CreateSession route={{...route,name:displayName||'Trainer'}} onCreated={onCreated}/>
  if(!route.roomName&&route.role!=='trainer')return <JoinSession/>
  if(error&&!session)return <StatusPage message={error} detail={route.roomName ? `Meeting ID: ${route.roomName}` : ''} done/>
  if(!session)return <StatusPage message="Preparing live classroom..."/>

  if(!connection){
    return <PreJoin session={session} role={route.role} name={displayName} onNameChange={setDisplayName} waiting={waiting} error={error} onJoin={join}/>
  }

  return (
    <LiveClass
      {...connection}
      roomName={route.roomName}
      role={route.role}
      name={displayName || (route.role==='trainer'?'Trainer':'Trainee')}
      identity={route.identity}
      session={session}
      onExit={(message)=>{
        if(message==='__TRAINER_ENDED__'){
          const params=new URLSearchParams({role:'trainer',name:displayName || route.name || 'Trainer'})
          window.location.replace(`/?${params.toString()}`)
        }else{
          setConnection(null)
          setExitMessage(message)
        }
      }}
    />
  )
}

function StatusPage({message,detail='',done=false}){
  return (
    <div className="portal-page">
      <div className="portal-glow portal-glow-one"/>
      <section className="portal-card status-card">
        <div className="brand brand-large"><span className="brand-logo"><img src="/skilltwin-logo.jpeg" alt="SkillTwin logo" /></span><div><strong>SkillTwin</strong><small>Live Classroom</small></div></div>
        {!done&&<span className="spinner"/>}
        <h1>{message}</h1>
        {detail&&<p className="status-detail">{detail}</p>}
        {done&&<button className="primary" onClick={()=>window.location.href='/'}>Return to SkillTwin Live</button>}
      </section>
    </div>
  )
}
