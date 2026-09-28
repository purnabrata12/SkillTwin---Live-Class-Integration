import { useEffect, useRef } from 'react'
import Avatar from './Avatar'

export default function ChatPanel({ messages, text, setText, onSend }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <>
      <div className="panel-content chat-list">
        {messages.length===0 && <div className="empty-state">No messages yet.</div>}
        {messages.map(msg=>(
          <div className="chat-message" key={msg.id}>
            <Avatar name={msg.name} size="small"/>
            <div>
              <div className="chat-head"><strong>{msg.name}</strong><span>{new Date(msg.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        <span ref={bottomRef}/>
      </div>
      <div className="chat-compose">
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSend()} placeholder="Message everyone"/>
        <button onClick={onSend}>Send</button>
      </div>
    </>
  )
}
