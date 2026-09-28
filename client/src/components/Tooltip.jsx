export default function Tooltip({ label, children }) {
  return (
    <span className="tooltip-wrap">
      {children}
      <span className="tooltip">{label}</span>
    </span>
  )
}
