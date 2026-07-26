import { useNavigate } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import LevelBadge from '../components/LevelBadge.jsx'
import StreakTracker from '../components/StreakTracker.jsx'
import { levelProgress } from '../lib/progressionSystem.js'
import ScoreBar from '../components/ScoreBar.jsx'

// ── Palette constants ─────────────────────────────────────────────────────────
const CORAL   = '#FF8B5E'
const TEAL    = '#4ECDC4'
const INDIGO  = '#1A1B3A'
const BG_CARD = 'rgba(255,255,255,0.05)'
const BG_CARD_HOVER = 'rgba(255,255,255,0.08)'

const DIM_COLORS = {
  clarity:    TEAL,
  empathy:    CORAL,
  politeness: '#a78bfa',
  expression: '#fbbf24',
}

// ── Scenario metadata for recommendations ────────────────────────────────────
const ALL_SCENARIOS = [
  { id: 'coffee-shop-stranger',  tier: 'easy',   dims: ['empathy', 'expression'] },
  { id: 'office-coworker',       tier: 'easy',   dims: ['clarity', 'politeness'] },
  { id: 'park-old-friend',       tier: 'medium', dims: ['empathy', 'expression'] },
  { id: 'office-conflict',       tier: 'medium', dims: ['clarity', 'politeness'] },
  { id: 'uni-teammate-silent',   tier: 'medium', dims: ['empathy', 'clarity'] },
  { id: 'home-kitchen-mum',      tier: 'hard',   dims: ['empathy', 'expression'] },
  { id: 'supermarket-best-friend', tier: 'hard', dims: ['clarity', 'empathy'] },
]

const TIER_ORDER = { easy: 0, medium: 1, hard: 2 }

// ── Dev seed data — injected when sessionLog is empty ────────────────────────
const SEED_SESSION_LOG = [
  {
    scenarioId:    'uni-teammate-silent',
    scenarioTitle: 'uni-teammate-silent',   // use id as key; resolved at render time
    difficultyTier: 'medium',
    playedAt:      new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    composite: 71,
    dimAverages: { clarity: 68, politeness: 78, empathy: 72, expression: 65 },
    turnLog: [
      { text: "Hey, you okay? You've seemed a bit quiet today.",         composite: 74, clarity: 70, politeness: 80, empathy: 78, expression: 68, feedback: 'Warm opener — empathy landed well.' },
      { text: "No pressure at all, I still have loads to do on mine.",   composite: 82, clarity: 75, politeness: 85, empathy: 88, expression: 76, feedback: 'De-escalating beautifully — kept the door open.' },
      { text: "If you want we can just split the lit review, totally up to you.", composite: 68, clarity: 72, politeness: 74, empathy: 65, expression: 62, feedback: 'Practical offer, but a little abrupt — more curiosity would help.' },
      { text: "Honestly I find group work stressful too sometimes.",      composite: 60, clarity: 55, politeness: 72, empathy: 58, expression: 54, feedback: 'Sharing felt genuine but expression was a bit vague.' },
    ],
  },
  {
    scenarioId:    'coffee-shop-stranger',
    scenarioTitle: 'coffee-shop-stranger',
    difficultyTier: 'easy',
    playedAt:      new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    composite: 54,
    dimAverages: { clarity: 50, politeness: 62, empathy: 55, expression: 48 },
    turnLog: [
      { text: "Oh sorry — didn't mean to crowd you.",                    composite: 58, clarity: 55, politeness: 70, empathy: 52, expression: 55, feedback: 'Polite recovery, but a bit passive.' },
      { text: "What are you reading?",                                    composite: 62, clarity: 65, politeness: 60, empathy: 60, expression: 62, feedback: 'Simple and direct — good. Short follow-up could add warmth.' },
      { text: "I always mean to read more but never do.",                composite: 50, clarity: 45, politeness: 58, empathy: 50, expression: 46, feedback: 'Relatable, but expression felt a little flat.' },
      { text: "What kind of work do you do?",                            composite: 45, clarity: 42, politeness: 60, empathy: 45, expression: 38, feedback: 'Topic shift felt a bit abrupt — the book thread had more warmth.' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function avgDim(sessions, dim) {
  if (!sessions.length) return 0
  return Math.round(sessions.reduce((s, sess) => s + (sess.dimAverages[dim] ?? 0), 0) / sessions.length)
}

function findStrengthsWeaknesses(sessions) {
  const dims = ['clarity', 'empathy', 'politeness', 'expression']
  const avgs = dims.map(d => ({ dim: d, avg: avgDim(sessions, d) }))
  avgs.sort((a, b) => b.avg - a.avg)
  return { strongest: avgs[0], weakest: avgs[avgs.length - 1], ranked: avgs }
}

function findExtremes(sessions) {
  let best = null, worst = null
  for (const sess of sessions) {
    for (const turn of (sess.turnLog ?? [])) {
      if (!turn.text) continue
      if (!best || turn.composite > best.composite)
        best = { ...turn, scenarioId: sess.scenarioId }
      if (!worst || turn.composite < worst.composite)
        worst = { ...turn, scenarioId: sess.scenarioId }
    }
  }
  return { best, worst }
}

function recommendScenario(weakestDim, completedScenarios) {
  const matches = ALL_SCENARIOS
    .filter(s => s.dims.includes(weakestDim))
    .sort((a, b) => {
      const aComplete = completedScenarios.includes(a.id) ? 1 : 0
      const bComplete = completedScenarios.includes(b.id) ? 1 : 0
      if (aComplete !== bComplete) return aComplete - bComplete
      return TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
    })
  return matches[0] ?? ALL_SCENARIOS[0]
}

// ── SVG line chart ────────────────────────────────────────────────────────────

function TrendChart({ sessions }) {
  if (sessions.length < 1) return null

  const W = 320, H = 120
  const PAD = { top: 12, right: 16, bottom: 28, left: 32 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const ordered = [...sessions].reverse()
  const scores  = ordered.map(s => s.composite)
  const n       = scores.length

  const xOf = i => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const yOf = v => PAD.top  + innerH - (v / 100) * innerH

  const pts = scores.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')
  const gridLines = [25, 50, 75, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }} aria-label="Composite score trend">
      {gridLines.map(g => (
        <g key={g}>
          <line x1={PAD.left} y1={yOf(g)} x2={W - PAD.right} y2={yOf(g)} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
          <text x={PAD.left - 6} y={yOf(g) + 4} fill="rgba(245,240,232,0.3)" fontSize={9} textAnchor="end">{g}</text>
        </g>
      ))}
      {n > 1 && (
        <polygon
          points={[...scores.map((v, i) => `${xOf(i)},${yOf(v)}`), `${xOf(n-1)},${yOf(0)}`, `${xOf(0)},${yOf(0)}`].join(' ')}
          fill="rgba(255,139,94,0.08)"
        />
      )}
      {n > 1 && (
        <polyline points={pts} fill="none" stroke={CORAL} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {ordered.map((sess, i) => {
        const cx = xOf(i), cy = yOf(scores[i])
        const label = (sess.scenarioTitle ?? sess.scenarioId ?? '').split('-')[0]
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={4} fill={CORAL} />
            <circle cx={cx} cy={cy} r={2} fill={INDIGO} />
            <text x={cx} y={H - 4} fill="rgba(245,240,232,0.4)" fontSize={8.5} textAnchor="middle">{label}</text>
            <text x={cx} y={cy - 8} fill="rgba(245,240,232,0.7)" fontSize={9} textAnchor="middle" fontWeight="bold">{scores[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Dimension bars ────────────────────────────────────────────────────────────

function DimOverview({ sessions, dimLabels }) {
  const { ranked } = findStrengthsWeaknesses(sessions)
  return (
    <div className="flex flex-col gap-3">
      {ranked.map(({ dim, avg }) => (
        <div key={dim} className="flex items-center gap-3">
          <span className="text-xs text-warm-white opacity-60 w-20 flex-shrink-0">{dimLabels[dim]}</span>
          <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${avg}%`, backgroundColor: DIM_COLORS[dim] }} />
          </div>
          <span className="text-xs font-semibold w-7 text-right" style={{ color: DIM_COLORS[dim] }}>{avg}</span>
        </div>
      ))}
    </div>
  )
}

// ── Strengths / weaknesses ────────────────────────────────────────────────────

function InsightPanel({ sessions, dimLabels, t }) {
  const { strongest, weakest } = findStrengthsWeaknesses(sessions)
  return (
    <div className="flex gap-3">
      <div className="flex-1 rounded-xl p-4 flex flex-col gap-1"
        style={{ backgroundColor: 'rgba(78,205,196,0.10)', border: '1px solid rgba(78,205,196,0.18)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEAL }}>{t('growth.strength')}</span>
        <span className="text-base font-bold font-display" style={{ color: TEAL }}>{dimLabels[strongest.dim]}</span>
        <span className="text-xs text-warm-white opacity-50">{t('growth.avgStrong')(strongest.avg)}</span>
      </div>
      <div className="flex-1 rounded-xl p-4 flex flex-col gap-1"
        style={{ backgroundColor: 'rgba(255,139,94,0.10)', border: '1px solid rgba(255,139,94,0.18)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: CORAL }}>{t('growth.needsWork')}</span>
        <span className="text-base font-bold font-display" style={{ color: CORAL }}>{dimLabels[weakest.dim]}</span>
        <span className="text-xs text-warm-white opacity-50">{t('growth.avgGrow')(weakest.avg)}</span>
      </div>
    </div>
  )
}

// ── Quote card ────────────────────────────────────────────────────────────────

function QuoteCard({ turn, label, color, borderColor, t, scenarioLabel }) {
  if (!turn) return null
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2"
      style={{ backgroundColor: `${color}12`, border: `1px solid ${borderColor}` }}>
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</span>
      <blockquote className="text-sm text-warm-white opacity-80 leading-relaxed italic">"{turn.text}"</blockquote>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-warm-white opacity-40">{scenarioLabel}</span>
        <span className="text-xs font-bold" style={{ color }}>{turn.composite} {t('growth.composite')}</span>
      </div>
      {turn.feedback && (
        <p className="text-xs text-warm-white opacity-50 border-t border-white/10 pt-2 mt-1">{turn.feedback}</p>
      )}
    </div>
  )
}

// ── Recommendation ────────────────────────────────────────────────────────────

function RecommendationCard({ sessions, completedScenarios, dimLabels, scenarioTitles, t }) {
  const { weakest } = findStrengthsWeaknesses(sessions)
  const rec = recommendScenario(weakest.dim, completedScenarios)
  const isNew = !completedScenarios.includes(rec.id)
  const recTitle = scenarioTitles[rec.id] ?? rec.id

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: BG_CARD_HOVER, border: `1px solid ${TEAL}30` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-warm-white opacity-40">
            {t('growth.tryNext')(dimLabels[weakest.dim])}
          </span>
          <span className="text-lg font-bold font-display" style={{ color: TEAL }}>{recTitle}</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
          style={{
            backgroundColor: rec.tier === 'hard' ? '#ef444420' : rec.tier === 'medium' ? '#fbbf2420' : '#4ECDC420',
            color: rec.tier === 'hard' ? '#f87171' : rec.tier === 'medium' ? '#fbbf24' : TEAL,
          }}>
          {rec.tier}
        </span>
      </div>
      <p className="text-xs text-warm-white opacity-50">
        {isNew
          ? t('growth.notTriedYet')(dimLabels[weakest.dim].toLowerCase(), dimLabels[rec.dims.find(d => d !== weakest.dim) ?? rec.dims[0]]?.toLowerCase())
          : t('growth.triedBefore')(dimLabels[weakest.dim].toLowerCase())
        }
      </p>
    </div>
  )
}

// ── Per-session row ───────────────────────────────────────────────────────────

function SessionRow({ session, t, scenarioTitleLabel }) {
  const tierColor = session.difficultyTier === 'hard' ? '#f87171'
    : session.difficultyTier === 'medium' ? '#fbbf24' : TEAL

  const date = new Date(session.playedAt)
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })

  const dimLabels = { clarity: 'C', empathy: 'E', politeness: 'P', expression: 'X' }

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: BG_CARD }}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-warm-white">{scenarioTitleLabel}</span>
          <span className="text-[11px] text-warm-white opacity-35">{dateStr} · {timeStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: `${tierColor}20`, color: tierColor }}>
            {session.difficultyTier}
          </span>
          <span className="text-xl font-bold font-display"
            style={{ color: session.composite >= 70 ? CORAL : session.composite >= 45 ? TEAL : '#9ca3af' }}>
            {session.composite}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {['clarity','empathy','politeness','expression'].map(dim => (
          <div key={dim} className="flex flex-col gap-1">
            <div className="h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <div className="h-1.5 rounded-full"
                style={{ width: `${session.dimAverages[dim] ?? 0}%`, backgroundColor: DIM_COLORS[dim] }} />
            </div>
            <span className="text-[9px] text-warm-white opacity-30 text-center">{dimLabels[dim]}</span>
          </div>
        ))}
      </div>

      {session.turnLog?.length > 0 && (() => {
        const best = session.turnLog.reduce((a, b) => (b.composite ?? 0) > (a.composite ?? 0) ? b : a)
        if (!best.text) return null
        return (
          <div className="border-t border-white/10 pt-3">
            <span className="text-[10px] text-warm-white opacity-30 uppercase tracking-wide">{t('growth.bestTurn')}</span>
            <p className="text-xs text-warm-white opacity-60 italic mt-1">"{best.text}"</p>
            {best.feedback && (
              <p className="text-[11px] text-warm-white opacity-35 mt-1">{best.feedback}</p>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GrowthReportPage() {
  const navigate   = useNavigate()
  const { state }  = useGameState()
  const { t }      = useLang()
  const progress   = levelProgress(state.xp)

  // Dimension labels and scenario titles from translations
  const dimLabels = {
    clarity:    t('dims.clarity'),
    empathy:    t('dims.empathy'),
    politeness: t('dims.politeness'),
    expression: t('dims.expression'),
  }

  // Use real sessionLog; fall back to seed data
  const rawLog   = state.sessionLog ?? []
  const sessions = rawLog.length > 0 ? rawLog : SEED_SESSION_LOG
  const isSeeded = rawLog.length === 0

  const hasSessions = sessions.length > 0
  const { best, worst } = findExtremes(sessions)

  // Helper: get translated scenario title from a session
  function getSessionTitle(sess) {
    return t(`scenarioTitles.${sess.scenarioId}`) !== `scenarioTitles.${sess.scenarioId}`
      ? t(`scenarioTitles.${sess.scenarioId}`)
      : (sess.scenarioTitle ?? sess.scenarioId ?? '')
  }

  return (
    <div className="min-h-screen flex flex-col px-5 py-10 max-w-lg mx-auto gap-6">

      <button onClick={() => navigate('/')} className="text-sm text-teal-chrome self-start hover:underline">
        {t('back')}
      </button>

      <div className="flex items-start justify-between">
        <h2 className="text-3xl font-bold font-display text-coral">{t('growth.heading')}</h2>
        {isSeeded && (
          <span className="text-[10px] px-2 py-1 rounded-full font-semibold mt-1"
            style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
            {t('growth.sampleData')}
          </span>
        )}
      </div>

      {/* ── Stats header ── */}
      <div className="flex gap-5 items-center flex-wrap">
        <LevelBadge level={state.level} xp={state.xp} />
        <StreakTracker streak={state.streak} />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-warm-white opacity-50">{t('growth.totalXp')}</span>
          <span className="text-2xl font-bold font-display text-coral">{state.xp}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-warm-white opacity-50">{t('growth.scenarios')}</span>
          <span className="text-2xl font-bold font-display" style={{ color: TEAL }}>
            {state.completedScenarios.length}
          </span>
        </div>
      </div>

      {/* ── Level progress bar ── */}
      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: BG_CARD }}>
        <h3 className="font-semibold font-display text-teal-chrome">{t('growth.levelProgress')}</h3>
        <ScoreBar label={`Level ${state.level} → ${state.level + 1}`} value={progress} color={CORAL} />
      </div>

      {hasSessions && (
        <>
          {/* ── Trend chart ── */}
          <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: BG_CARD }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold font-display text-teal-chrome">{t('growth.compositeTrend')}</h3>
              <span className="text-xs text-warm-white opacity-35">{t('growth.sessionCount')(sessions.length)}</span>
            </div>
            <TrendChart sessions={sessions} />
            <p className="text-xs text-warm-white opacity-35 text-center -mt-1">
              {t('growth.eachPoint')}
            </p>
          </div>

          {/* ── Dimension overview ── */}
          <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: BG_CARD }}>
            <h3 className="font-semibold font-display text-teal-chrome">{t('growth.dimensionAverages')}</h3>
            <DimOverview sessions={sessions} dimLabels={dimLabels} />
          </div>

          {/* ── Strengths vs weaknesses ── */}
          <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: BG_CARD }}>
            <h3 className="font-semibold font-display text-teal-chrome">{t('growth.strengthsGrowth')}</h3>
            <InsightPanel sessions={sessions} dimLabels={dimLabels} t={t} />
          </div>

          {/* ── Concrete dialogue quotes ── */}
          <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: BG_CARD }}>
            <h3 className="font-semibold font-display text-teal-chrome">{t('growth.realMoments')}</h3>
            <QuoteCard
              turn={best}
              label={t('growth.strength')}
              color={TEAL}
              borderColor="rgba(78,205,196,0.25)"
              t={t}
              scenarioLabel={best ? getSessionTitle({ scenarioId: best.scenarioId }) : ''}
            />
            {worst && worst.composite !== best?.composite && (
              <QuoteCard
                turn={worst}
                label={t('growth.needsWork')}
                color={CORAL}
                borderColor="rgba(255,139,94,0.25)"
                t={t}
                scenarioLabel={worst ? getSessionTitle({ scenarioId: worst.scenarioId }) : ''}
              />
            )}
          </div>

          {/* ── Next scenario recommendation ── */}
          <RecommendationCard
            sessions={sessions}
            completedScenarios={state.completedScenarios}
            dimLabels={dimLabels}
            scenarioTitles={Object.fromEntries(ALL_SCENARIOS.map(s => [s.id, t(`scenarioTitles.${s.id}`)]))}
            t={t}
          />

          {/* ── Session history ── */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold font-display text-teal-chrome px-1">Session History</h3>
            {sessions.map((sess) => (
              <SessionRow
                key={`${sess.scenarioId}-${sess.playedAt}`}
                session={sess}
                t={t}
                scenarioTitleLabel={getSessionTitle(sess)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {!hasSessions && (
        <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ backgroundColor: BG_CARD }}>
          <h3 className="font-semibold font-display text-teal-chrome">No sessions yet</h3>
          <p className="text-sm text-warm-white opacity-40">
            Complete a scenario to see your growth report here.
          </p>
          <button onClick={() => navigate('/select')}
            className="mt-2 self-start px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: CORAL, color: INDIGO }}>
            Pick a scenario →
          </button>
        </div>
      )}

    </div>
  )
}
