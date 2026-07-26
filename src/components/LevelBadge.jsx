import { levelProgress } from '../lib/progressionSystem.js'

export default function LevelBadge({ level = 1, xp = 0 }) {
  const progress     = levelProgress(xp)
  const circumference = 2 * Math.PI * 18
  const offset       = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <circle
            cx="22" cy="22" r="18"
            fill="none" stroke="#FF8B5E" strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold font-display text-warm-white">
          {level}
        </span>
      </div>
      <span className="text-xs opacity-50 text-warm-white">Level</span>
    </div>
  )
}
