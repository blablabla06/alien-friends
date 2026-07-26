export default function StreakTracker({ streak = 0 }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
        style={{ backgroundColor: 'rgba(255,139,94,0.15)' }}
      >
        🔥
      </div>
      <span className="text-sm font-bold font-display" style={{ color: '#FF8B5E' }}>
        {streak}d
      </span>
      <span className="text-xs opacity-50 text-warm-white">Streak</span>
    </div>
  )
}
