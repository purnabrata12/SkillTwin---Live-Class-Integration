import { useRef } from 'react'

export default function Whiteboard({
  strokes = [],
  readOnly = false,
  onStrokeChange,
  onClear,
  onClose,
  trainerName = 'Trainer',
}) {
  const svgRef = useRef(null)
  const activeStroke = useRef(null)

  function getPoint(e) {
    const svg = svgRef.current
    if (!svg) return null

    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return null

    return {
      x: Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      ),

      y: Math.max(
        0,
        Math.min(1, (e.clientY - rect.top) / rect.height)
      ),
    }
  }

  function publish(stroke) {
    activeStroke.current = stroke
    onStrokeChange?.(stroke)
  }

  function pointerDown(e) {
    if (readOnly) return

    const point = getPoint(e)
    if (!point) return

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {}

    const id =
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random()}`

    publish({
      id,
      points: [point],
    })
  }

  function pointerMove(e) {
    if (readOnly || !activeStroke.current) return

    const point = getPoint(e)
    if (!point) return

    const previous = activeStroke.current.points
    const last = previous[previous.length - 1]

    if (
      last &&
      Math.abs(last.x - point.x) < 0.0015 &&
      Math.abs(last.y - point.y) < 0.0015
    ) {
      return
    }

    publish({
      ...activeStroke.current,
      points: [...previous, point],
    })
  }

  function pointerEnd(e) {
    if (readOnly) return

    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {}

    activeStroke.current = null
  }

  function makePath(points = []) {
    return points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x * 1000} ${
            point.y * 1000
          }`
      )
      .join(' ')
  }

  return (
    <section
      className="whiteboard"
      role="dialog"
      aria-label="SkillTwin Whiteboard"
    >
      <header>
        <strong>SkillTwin Whiteboard</strong>

        <span className="whiteboard-hint">
          {readOnly
            ? `${trainerName} is using the whiteboard`
            : 'Draw with mouse or touch'}
        </span>

        {!readOnly && (
          <>
            <button type="button" onClick={onClear}>
              Clear
            </button>

            <button type="button" onClick={onClose}>
              Close
            </button>
          </>
        )}
      </header>

      <svg
        ref={svgRef}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onPointerLeave={(e) => {
          if (e.buttons === 0) pointerEnd(e)
        }}
        style={{
          touchAction: 'none',
          cursor: readOnly ? 'default' : 'crosshair',
        }}
      >
        <rect
          width="1000"
          height="1000"
          fill="white"
        />

        {strokes.map((stroke) => (
          <path
            key={stroke.id}
            d={makePath(stroke.points)}
            fill="none"
            stroke="#111827"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </section>
  )
}