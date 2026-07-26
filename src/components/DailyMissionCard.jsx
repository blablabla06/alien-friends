import { useGameState } from '../context/GameStateContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'

const TEAL  = '#4ECDC4'
const CORAL = '#FF8B5E'

export default function DailyMissionCard() {
  const { state } = useGameState()
  const { t } = useLang()
  const { missions, generatedDate } = state.dailyMissions

  const completedCount = missions.filter(m => m.completed).length
  const total          = missions.length
  const allDone        = total > 0 && completedCount === total

  const dateLabel = generatedDate
    ? new Date(generatedDate + 'T00:00:00').toLocaleDateString([], {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : 'Today'

  return (
    <div
      className="w-full max-w-sm rounded-2xl px-5 py-4 flex flex-col gap-3"
      style={{
        backgroundColor: 'rgba(78,205,196,0.07)',
        border: `1px solid ${allDone ? 'rgba(255,139,94,0.40)' : 'rgba(78,205,196,0.22)'}`,
        transition: 'border-color 0.3s',
      }}
    >
      {/* ── header ── */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: TEAL }}>
            {t('missions.heading')}
          </span>
          <span className="text-[10px] text-warm-white opacity-35">{dateLabel}</span>
        </div>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ backgroundColor: allDone ? 'rgba(255,139,94,0.15)' : 'rgba(78,205,196,0.12)' }}
        >
          <span className="text-xs font-bold" style={{ color: allDone ? CORAL : TEAL }}>
            {completedCount}/{total}
          </span>
          {allDone && <span className="text-xs">✓</span>}
        </div>
      </div>

      {/* ── progress bar ── */}
      {total > 0 && (
        <div className="h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{
              width: `${Math.round((completedCount / total) * 100)}%`,
              backgroundColor: allDone ? CORAL : TEAL,
            }}
          />
        </div>
      )}

      {/* ── mission list ── */}
      <ul className="flex flex-col gap-2.5">
        {missions.map(({ def, completed }) => {
          // Prefer translated label; fall back to def.label from the data file
          const tKey = `missions.${def.id}`
          const label = t(tKey) !== tKey ? t(tKey) : def.label
          return (
            <li key={def.id} className="flex items-start gap-2.5">
              {/* checkbox */}
              <div
                className="flex-shrink-0 mt-0.5 rounded flex items-center justify-center"
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor: completed ? TEAL : 'transparent',
                  border: `1.5px solid ${completed ? TEAL : 'rgba(78,205,196,0.35)'}`,
                  transition: 'background-color 0.25s, border-color 0.25s',
                }}
              >
                {completed && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="#1A1B3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* label + XP badge */}
              <div className="flex flex-1 items-start justify-between gap-2 min-w-0">
                <span
                  className="text-sm leading-snug"
                  style={{
                    color: '#F5F0E8',
                    opacity: completed ? 0.4 : 0.85,
                    textDecoration: completed ? 'line-through' : 'none',
                    transition: 'opacity 0.25s',
                  }}
                >
                  {label}
                </span>
                <span
                  className="text-[10px] font-semibold flex-shrink-0 mt-0.5"
                  style={{ color: completed ? 'rgba(255,139,94,0.5)' : 'rgba(255,139,94,0.8)' }}
                >
                  +{def.xpReward}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      {/* ── all done celebration ── */}
      {allDone && (
        <p className="text-xs text-center" style={{ color: CORAL, opacity: 0.7 }}>
          {t('missions.allDone')}
        </p>
      )}
    </div>
  )
}
