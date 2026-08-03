import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext.jsx'
import {
  getStoryHistory,
  STORY_ENDINGS,
  getStoryEndingText,
} from '../lib/alienStoryHistory.js'

// ── tiny Meter (reused style from AlienMainPage) ──────────────────────────────
function Meter({ label, value, color = '#D4A574' }) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.65, color: '#F5F0E8' }}>
        <span>{label}</span>
        <span>{pct}</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.09)' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

// ── colour tint per ending ─────────────────────────────────────────────────────
const ENDING_TINT = {
  'exclusion':         '#9B6B8C',
  'healthy-boundary':  '#4ECDC4',
  'mutual-adjustment': '#D4A574',
  'forced-harmony':    '#8A8FA3',
}

// ── i18n ──────────────────────────────────────────────────────────────────────
function t(lang, key) {
  const strings = {
    en: {
      title:             'Story History',
      subtitle:          'Alien, Apparently — Ending Collection',
      back:              '← Back to Home',
      playNow:           'Play the Story',
      noRuns:            'No completed runs yet.',
      noRunsSub:         'Finish the story to start collecting endings.',
      endingsUnlocked:   'endings unlocked',
      of:                'of',
      allUnlocked:       'Achievement unlocked: All conclusions revealed.',
      allUnlockedSub:    'You have discovered every conclusion of the trial story.',
      locked:            'Unknown Ending',
      lockedHint:        'Replay the story and make different choices to reveal this conclusion.',
      firstUnlocked:     'First unlocked',
      bestScore:         'Best overall',
      runsTitle:         'Run History',
      runDetail:         'Detail',
      runCollapse:       'Collapse',
      ending:            'Ending',
      overall:           'Overall',
      badge:             'Badge',
      labelPower:        'Label Power',
      rumour:            'Rumour',
      tension:           'Tension',
      evanTrust:         'Evan Trust',
      playerResponse:    'Your response',
      npcReaction:       'NPC reaction',
      statusAfter:       'State after turn',
      choices:           'choices',
      noChoices:         'No choices recorded.',
    },
    zh: {
      title:             '故事历史',
      subtitle:          '《外星人，显然》— 结局收藏',
      back:              '← 返回主页',
      playNow:           '开始故事',
      noRuns:            '尚无完成记录。',
      noRunsSub:         '完成故事后，开始收集结局。',
      endingsUnlocked:   '个结局已解锁',
      of:                '/',
      allUnlocked:       '成就解锁：所有结局已揭示。',
      allUnlockedSub:    '你已发现试玩故事的所有结局。',
      locked:            '未解锁结局',
      lockedHint:        '重玩故事并做出不同选择，以揭示这个结局。',
      firstUnlocked:     '首次解锁',
      bestScore:         '最高得分',
      runsTitle:         '历史记录',
      runDetail:         '详情',
      runCollapse:       '收起',
      ending:            '结局',
      overall:           '综合',
      badge:             '徽章',
      labelPower:        '标签力',
      rumour:            '谣言',
      tension:           '紧张度',
      evanTrust:         'Evan 信任',
      playerResponse:    '你的回应',
      npcReaction:       'NPC 反应',
      statusAfter:       '本回合后状态',
      choices:           '次选择',
      noChoices:         '无选择记录。',
    },
  }
  return strings[lang]?.[key] ?? strings.en[key] ?? key
}

function formatDate(iso, lang) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ── Ending card ───────────────────────────────────────────────────────────────
function EndingCard({ ending, unlocked, lang }) {
  const color = ENDING_TINT[ending.id] ?? '#D4A574'

  if (!unlocked) {
    return (
      <div
        style={{
          borderRadius: 14,
          border: '1.5px solid rgba(255,255,255,0.09)',
          background: 'rgba(255,255,255,0.03)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          minHeight: 140,
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.22, lineHeight: 1 }}>?</div>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#F5F0E8', opacity: 0.35 }}>
          {t(lang, 'locked')}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.35)', textAlign: 'center', lineHeight: 1.5 }}>
          {t(lang, 'lockedHint')}
        </div>
      </div>
    )
  }

  // Always derive display text from the canonical localized map, not saved strings.
  const localText = getStoryEndingText(ending.id, lang)
  const displayName    = localText?.name    ?? unlocked.name
  const displayBadge   = localText?.badge   ?? unlocked.badge
  const displaySummary = localText?.summary ?? unlocked.summary
  const displayQuote   = localText?.quote   ?? unlocked.quote

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1.5px solid ${color}55`,
        background: `linear-gradient(135deg, ${color}12 0%, rgba(10,12,28,0.6) 100%)`,
        padding: '16px 16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}
    >
      {/* Badge pill */}
      <div style={{
        alignSelf: 'flex-start',
        fontSize: 9,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '3px 8px',
        borderRadius: 999,
        background: `${color}28`,
        border: `1px solid ${color}55`,
        color: color,
      }}>
        {displayBadge}
      </div>

      {/* Name */}
      <div style={{ fontSize: 15, fontWeight: 800, color: '#F5F0E8', lineHeight: 1.2 }}>
        {displayName}
      </div>

      {/* Summary */}
      <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.62)', lineHeight: 1.55 }}>
        {displaySummary}
      </div>

      {/* Quote */}
      <div style={{ fontSize: 11, fontStyle: 'italic', color: `${color}cc`, lineHeight: 1.5 }}>
        "{displayQuote}"
      </div>

      {/* Footer — use only stable dynamic values from saved data */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'rgba(245,240,232,0.38)' }}>
        <span>{t(lang, 'bestScore')}: <strong style={{ color: '#F5F0E8', opacity: 0.7 }}>{unlocked.bestOverall}</strong></span>
        <span>{t(lang, 'firstUnlocked')}: {formatDate(unlocked.firstUnlockedAt, lang)}</span>
      </div>
    </div>
  )
}

// ── Run row ───────────────────────────────────────────────────────────────────
function RunRow({ run, lang }) {
  const [open, setOpen] = useState(false)
  const color = ENDING_TINT[run.endingId] ?? '#D4A574'

  // Prefer localized text derived from endingId; fall back to saved strings for old runs
  const localText      = getStoryEndingText(run.endingId, lang)
  const displayName    = localText?.name  ?? run.endingName
  const displayBadge   = localText?.badge ?? run.badge

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${open ? color + '44' : 'rgba(255,255,255,0.08)'}`,
        background: open ? `${color}0a` : 'rgba(255,255,255,0.025)',
        overflow: 'hidden',
        transition: 'border-color 0.3s ease, background 0.3s ease',
      }}
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Ending colour dot */}
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />

        {/* Ending name — localized */}
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#F5F0E8' }}>
          {displayName}
        </div>

        {/* Overall */}
        <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)', whiteSpace: 'nowrap' }}>
          {t(lang, 'overall')} {run.overall}
        </div>

        {/* Badge — localized */}
        <div style={{
          fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em',
          padding: '2px 7px', borderRadius: 999,
          background: `${color}22`, border: `1px solid ${color}44`, color: color,
          whiteSpace: 'nowrap',
        }}>
          {displayBadge}
        </div>

        {/* Date */}
        <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)', whiteSpace: 'nowrap', display: 'none' /* shown on wider screens */ }}>
          {formatDate(run.playedAt, lang)}
        </div>

        {/* Expand icon */}
        <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)', flexShrink: 0, marginLeft: 4 }}>
          {open ? '▲' : '▼'}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Date + key hidden */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 11, color: 'rgba(245,240,232,0.5)' }}>
            <span>{formatDate(run.playedAt, lang)}</span>
            <span>{t(lang, 'labelPower')}: <strong style={{ color: '#F5F0E8' }}>{run.hidden?.labelPower ?? '—'}</strong></span>
            <span>{t(lang, 'rumour')}: <strong style={{ color: '#F5F0E8' }}>{run.hidden?.rumour ?? '—'}</strong></span>
            <span>{t(lang, 'tension')}: <strong style={{ color: '#F5F0E8' }}>{run.hidden?.tension ?? '—'}</strong></span>
            <span>{t(lang, 'evanTrust')}: <strong style={{ color: '#F5F0E8' }}>{run.hidden?.evanTrust ?? '—'}</strong></span>
          </div>

          {/* Score meters */}
          {run.scores && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px' }}>
              <Meter label="Clarity"   value={run.scores.clarity}   color="#8A8FA3" />
              <Meter label="Respect"   value={run.scores.respect}   color="#FFD166" />
              <Meter label="Awareness" value={run.scores.awareness} color="#D4A574" />
              <Meter label="Boundary"  value={run.scores.boundary}  color="#9B6B8C" />
            </div>
          )}

          {/* Choice log */}
          {Array.isArray(run.choices) && run.choices.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {run.choices.map((c, i) => (
                <div
                  key={c.sceneId + i}
                  style={{
                    borderLeft: `2px solid ${color}55`,
                    paddingLeft: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  {/* Scene title */}
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: color, opacity: 0.8 }}>
                    {c.title ?? c.sceneId} — {c.choiceLabel}
                  </div>

                  {/* Player response */}
                  <div style={{ fontSize: 12, color: '#F5F0E8', opacity: 0.85 }}>
                    <span style={{ opacity: 0.5 }}>{t(lang, 'playerResponse')}: </span>
                    "{c.choiceText}"
                  </div>

                  {/* NPC reaction */}
                  {c.npcReaction && (
                    <div style={{ fontSize: 11, fontStyle: 'italic', color: 'rgba(245,240,232,0.55)', lineHeight: 1.5 }}>
                      <span style={{ fontStyle: 'normal', opacity: 0.5 }}>{t(lang, 'npcReaction')}: </span>
                      {c.npcReaction}
                    </div>
                  )}

                  {/* Rumour chain */}
                  {Array.isArray(c.mutation) && c.mutation.length > 0 && (
                    <div style={{ fontSize: 10, color: '#9B6B8C', opacity: 0.8 }}>
                      {c.mutation.join(' → ')}
                    </div>
                  )}

                  {/* State after */}
                  {c.state && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginTop: 2 }}>
                      <Meter label={t(lang, 'labelPower')} value={c.state.labelPower} color="#9B6B8C" />
                      <Meter label={t(lang, 'rumour')}     value={c.state.rumour}     color="#9B6B8C" />
                      <Meter label={t(lang, 'tension')}    value={c.state.tension}    color="#FFD166" />
                      <Meter label={t(lang, 'evanTrust')}  value={c.state.evanTrust}  color="#8A8FA3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)' }}>{t(lang, 'noChoices')}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StoryHistoryPage() {
  const navigate = useNavigate()
  const { lang } = useLang()

  // Read history fresh on every render (it may have just been saved)
  const history = useMemo(() => getStoryHistory(), [])

  const { unlockedEndings, runs, allEndingsUnlockedAt } = history
  const unlockedCount = Object.keys(unlockedEndings).length
  const totalCount    = STORY_ENDINGS.length
  const allDone       = unlockedCount >= totalCount && allEndingsUnlockedAt

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1A1B3A',
        color: '#F5F0E8',
        fontFamily: "'Inter', 'Work Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'clamp(16px, 4vw, 40px) clamp(14px, 4vw, 32px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 720 }}>

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(245,240,232,0.45)',
            fontSize: 13,
            cursor: 'pointer',
            padding: '4px 0 16px',
            display: 'block',
          }}
        >
          {t(lang, 'back')}
        </button>

        {/* Header */}
        <header style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, fontFamily: "'Quicksand', 'Nunito', sans-serif", color: '#D4A574', margin: 0, lineHeight: 1.1 }}>
            {t(lang, 'title')}
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', marginTop: 5 }}>
            {t(lang, 'subtitle')}
          </div>
        </header>

        {/* Empty state — no runs at all */}
        {runs.length === 0 ? (
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.09)',
              background: 'rgba(255,255,255,0.03)',
              padding: '40px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 36, opacity: 0.18 }}>?</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F0E8' }}>{t(lang, 'noRuns')}</div>
            <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.45)' }}>{t(lang, 'noRunsSub')}</div>
            <button
              onClick={() => navigate('/play')}
              style={{
                marginTop: 8,
                padding: '10px 28px',
                borderRadius: 12,
                border: 'none',
                background: '#D4A574',
                color: '#1A1B3A',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {t(lang, 'playNow')}
            </button>
          </div>
        ) : (
          <>
            {/* ── All-endings achievement banner ── */}
            {allDone && (
              <div
                style={{
                  borderRadius: 14,
                  border: '1.5px solid #4ECDC4',
                  background: 'linear-gradient(135deg, rgba(78,205,196,0.12) 0%, rgba(10,12,28,0.7) 100%)',
                  padding: '16px 20px',
                  marginBottom: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4ECDC4' }}>
                  ★ {t(lang, 'allUnlocked')}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.6)' }}>
                  {t(lang, 'allUnlockedSub')}
                </div>
              </div>
            )}

            {/* ── Ending Collection ── */}
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4ECDC4', margin: 0 }}>
                  {lang === 'zh' ? '结局收藏' : 'Ending Collection'}
                </h2>
                <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)' }}>
                  {unlockedCount} {t(lang, 'of')} {totalCount} {t(lang, 'endingsUnlocked')}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginBottom: 18 }}>
                <div style={{
                  height: '100%',
                  width: `${(unlockedCount / totalCount) * 100}%`,
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #D4A574, #4ECDC4)',
                  transition: 'width 0.5s ease',
                }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(220px, 45%, 320px), 1fr))', gap: 12 }}>
                {STORY_ENDINGS.map(ending => (
                  <EndingCard
                    key={ending.id}
                    ending={ending}
                    unlocked={unlockedEndings[ending.id] ?? null}
                    lang={lang}
                  />
                ))}
              </div>
            </section>

            {/* ── Run History ── */}
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4ECDC4', margin: '0 0 14px' }}>
                {t(lang, 'runsTitle')} ({runs.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {runs.map(run => (
                  <RunRow key={run.id} run={run} lang={lang} />
                ))}
              </div>
            </section>
          </>
        )}

        {/* Bottom padding */}
        <div style={{ height: 48 }} />
      </div>
    </div>
  )
}
