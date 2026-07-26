import { useNavigate } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import LevelBadge from '../components/LevelBadge.jsx'
import StreakTracker from '../components/StreakTracker.jsx'
import { levelProgress } from '../lib/progressionSystem.js'
import ScoreBar from '../components/ScoreBar.jsx'

// ── Dimension colours matching the palette ───────────────────────────────────
const DIM_COLORS = {
  clarity:    '#4ECDC4',
  empathy:    '#FF8B5E',
  politeness: '#a78bfa',
  expression: '#fbbf24',
}

const DIM_LABELS = {
  clarity:    'Clarity',
  empathy:    'Empathy',
  politeness: 'Politeness',
  expression: 'Expression',
}

// ── Per-turn sparkline ────────────────────────────────────────────────────────

function TurnSparkline({ history }) {
  if (!history?.length) return null
  const maxH = 56   // px height of bars
  const barW = 28   // px width per bar

  return (
    <div className="flex items-end gap-1.5" style={{ height: maxH }}>
      {history.map((entry, i) => {
        const h = Math.max(4, Math.round((entry.composite / 100) * maxH))
        const color =
          entry.composite >= 70 ? '#FF8B5E' :
          entry.composite >= 45 ? '#4ECDC4' : '#6b7280'
        return (
          <div key={i} className="flex flex-col items-center gap-1" title={`Turn ${i + 1}: ${entry.composite}`}>
            <div
              style={{ width: barW, height: h, backgroundColor: color, borderRadius: 4 }}
            />
            <span className="text-[10px] opacity-40 text-warm-white">{i + 1}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Per-turn feedback list ────────────────────────────────────────────────────

function TurnFeedbackList({ history }) {
  if (!history?.length) return null
  return (
    <div className="flex flex-col gap-3 mt-2">
      {history.map((entry, i) => (
        <div key={i} className="flex gap-3 items-start">
          {/* turn label */}
          <span
            className="text-[11px] font-semibold rounded-full flex-shrink-0 flex items-center justify-center"
            style={{
              width: 22,
              height: 22,
              backgroundColor: 'rgba(78,205,196,0.18)',
              color: '#4ECDC4',
              marginTop: 1,
            }}
          >
            {i + 1}
          </span>
          <div className="flex flex-col gap-1 min-w-0">
            {/* mini dimension bars */}
            <div className="flex gap-2">
              {Object.keys(DIM_COLORS).map(dim => (
                <div key={dim} className="flex flex-col items-center gap-0.5">
                  <div
                    className="rounded-sm"
                    style={{
                      width: 6,
                      height: Math.max(2, Math.round((entry[dim] / 100) * 20)),
                      backgroundColor: DIM_COLORS[dim],
                      opacity: 0.85,
                    }}
                    title={`${DIM_LABELS[dim]}: ${entry[dim]}`}
                  />
                  <span className="text-[8px] opacity-30 text-warm-white">{dim[0].toUpperCase()}</span>
                </div>
              ))}
            </div>
            {/* feedback note */}
            {entry.feedback && (
              <p className="text-xs text-warm-white opacity-60 leading-snug">{entry.feedback}</p>
            )}
          </div>
          {/* composite badge */}
          <span
            className="text-xs font-bold ml-auto flex-shrink-0"
            style={{ color: entry.composite >= 60 ? '#FF8B5E' : entry.composite >= 40 ? '#4ECDC4' : '#9ca3af' }}
          >
            {entry.composite}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GrowthReportPage() {
  const navigate = useNavigate()
  const { state } = useGameState()
  const progress = levelProgress(state.xp)
  const { scoringHistory, currentScores } = state
  const hasHistory = scoringHistory?.length > 0

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 max-w-lg mx-auto gap-6">
      <button onClick={() => navigate(-1)} className="text-sm text-teal-chrome self-start hover:underline">
        ← Back
      </button>

      <h2 className="text-3xl font-bold font-display text-coral">Your Growth</h2>

      {/* ── Stats header ── */}
      <div className="flex gap-6 items-center">
        <LevelBadge level={state.level} xp={state.xp} />
        <StreakTracker streak={state.streak} />
        <div className="flex flex-col gap-1">
          <span className="text-xs text-warm-white opacity-50">Total XP</span>
          <span className="text-2xl font-bold font-display text-coral">{state.xp}</span>
        </div>
      </div>

      {/* ── Level progress ── */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      >
        <h3 className="font-semibold font-display text-teal-chrome">Level Progress</h3>
        <ScoreBar label={`Level ${state.level} → ${state.level + 1}`} value={progress} color="#FF8B5E" />
      </div>

      {/* ── Last session average ── */}
      {hasHistory && (
        <div
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          <h3 className="font-semibold font-display text-teal-chrome">Last Session — Averages</h3>
          {Object.keys(DIM_COLORS).map(dim => (
            <ScoreBar
              key={dim}
              label={DIM_LABELS[dim]}
              value={currentScores[dim] ?? 0}
              color={DIM_COLORS[dim]}
            />
          ))}
        </div>
      )}

      {/* ── Per-turn trend ── */}
      {hasHistory && (
        <div
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold font-display text-teal-chrome">Turn-by-Turn Trend</h3>
            <span className="text-xs text-warm-white opacity-40">{scoringHistory.length} turns</span>
          </div>

          <TurnSparkline history={scoringHistory} />

          <div className="border-t border-white/10 pt-4">
            <h4 className="text-xs font-semibold text-warm-white opacity-50 mb-3 uppercase tracking-wide">
              Per-Turn Feedback
            </h4>
            <TurnFeedbackList history={scoringHistory} />
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!hasHistory && (
        <div
          className="rounded-2xl p-5 flex flex-col gap-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          <h3 className="font-semibold font-display text-teal-chrome">Recent Scores</h3>
          <p className="text-sm text-warm-white opacity-40">
            Complete a scenario to see your turn-by-turn breakdown here.
          </p>
        </div>
      )}
    </div>
  )
}
