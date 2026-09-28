export default function DeviceSelector({ label, value, options, fallback, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{fallback}</option>
        {options.map(device => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || fallback}
          </option>
        ))}
      </select>
    </label>
  )
}
