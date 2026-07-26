export default function ScoreBar({ label, value = 0, color = '#4ECDC4' }) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex justify-between text-xs text-warm-white opacity-80">
        <span>{label}</span>
        <span style={{ color }}>{clamped}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
