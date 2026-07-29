/**
 * MoodMeter — cool-to-warm gradient bar with a position indicator.
 * mood: 0 (cold/distant) → 100 (warm/connected)
 */
export default function MoodMeter({ mood = 50 }) {
  const clamped = Math.max(0, Math.min(100, mood))

  // Interpolate colour from distance/cool (#8A8FA3) through to warmth (#D98E5F)
  const r = Math.round(138 + (217 - 138) * (clamped / 100))
  const g = Math.round(143 + (142 - 143) * (clamped / 100))
  const b = Math.round(163 + (95  - 163) * (clamped / 100))
  const indicatorColour = `rgb(${r},${g},${b})`

  return (
    <div className="flex flex-col items-end gap-1 select-none">
      <span className="text-xs opacity-50 text-warm-white">mood</span>

      {/* gradient track */}
      <div
        className="relative w-28 h-3 rounded-full overflow-visible"
        style={{
          background: 'linear-gradient(to right, #8A8FA3, #FFD166, #D98E5F)',
        }}
      >
        {/* position dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-indigo-deep shadow-lg transition-all duration-500"
          style={{
            left: `calc(${clamped}% - 8px)`,
            backgroundColor: indicatorColour,
          }}
        />
      </div>

      <span className="text-xs font-semibold" style={{ color: indicatorColour }}>
        {clamped}
      </span>
    </div>
  )
}
