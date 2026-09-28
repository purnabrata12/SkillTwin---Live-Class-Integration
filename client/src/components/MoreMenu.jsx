import { Bug, Info, Maximize2, Monitor, Settings, Sparkles } from 'lucide-react'

export default function MoreMenu({ onSettings, onDetails, onFullScreen, onPiP, onReport, onClose }) {
  const click = fn => () => { fn?.(); onClose() }
  return (
    <div className="more-menu">
      <button onClick={click(onSettings)}><Settings size={17}/> Settings</button>
      <button onClick={click(onDetails)}><Info size={17}/> Meeting details</button>
      <button onClick={click(onFullScreen)}><Maximize2 size={17}/> Full screen</button>
      <button onClick={click(onPiP)}><Monitor size={17}/> Picture in picture</button>
      <button onClick={click(onReport)}><Bug size={17}/> Report a problem</button>
      <button disabled><Sparkles size={17}/> Background effects <small>Coming later</small></button>
    </div>
  )
}
