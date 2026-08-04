import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import { useLang, resolveField } from '../context/LanguageContext.jsx'
import { useMusicTrack } from '../context/MusicContext.jsx'

import strangerImg       from '../assets/avatars/stranger.png'
import jamieImg          from '../assets/avatars/coworker-jamie.png'
import morganImg         from '../assets/avatars/coworker-morgan.png'
import oldFriendImg      from '../assets/avatars/old-friend.png'
import uniTeammateImg    from '../assets/avatars/uni-teammate.png'
import mumImg            from '../assets/avatars/mum.png'
import oldBestFriendImg  from '../assets/avatars/old-best-friend.png'

const AVATAR_IMAGES = {
  'stranger':          strangerImg,
  'coworker-jamie':    jamieImg,
  'coworker-morgan':   morganImg,
  'old-friend':        oldFriendImg,
  'uni-teammate':      uniTeammateImg,
  'mum':               mumImg,
  'old-best-friend':   oldBestFriendImg,
}

const AVATAR_PALETTE = {
  'stranger':          '#8A8FA3',
  'coworker-jamie':    '#FFD166',
  'coworker-morgan':   '#FFD166',
  'old-friend':        '#D4A574',
  'uni-teammate':      '#9B6B8C',
  'mum':               '#F9A8D4',
  'old-best-friend':   '#6EE7B7',
}

/**
 * Dedicated route for the scenario intro / story-plot screen.
 * Route: /intro/:scenarioId
 */
export default function ScenarioIntroPage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const { state, actions } = useGameState()
  const { lang, t } = useLang()
  const { currentScenario: scenario, currentCharacter: character, connectionMood } = state

  // Switch to practice music as soon as the intro page mounts
  // (stops home.mp3 and starts practice.mp3 immediately)
  useMusicTrack('practice')

  useEffect(() => {
    if (!scenario || scenario.id !== scenarioId) {
      navigate('/', { replace: true })
    }
  }, [scenario, scenarioId, navigate])

  if (!scenario || !character) return null

  const npcKey      = scenario.npcRef ?? character.id
  const portraitSrc = AVATAR_IMAGES[npcKey]
  const accentColor = AVATAR_PALETTE[npcKey] ?? '#8A8FA3'

  const overlayColor =
    connectionMood >= 60
      ? 'rgba(212,165,116,0.18)'
      : connectionMood <= 35
      ? 'rgba(78,205,196,0.10)'
      : 'rgba(120,100,200,0.13)'

  function handleBack() {
    actions.endScenario()
    navigate('/select', { replace: true })
  }

  function handleStart() {
    navigate(`/dialogue/${scenarioId}`, { replace: true })
  }

  const title     = resolveField(scenario.title, lang)
  const storyPlot = resolveField(scenario.storyPlot ?? scenario.setup, lang)

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#1A1D29' }}
    >
      {/* Mood overlay tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: overlayColor, transition: 'background-color 0.6s ease' }}
      />

      {/* Pulse keyframe injected once */}
      <style>{`
        @keyframes af-portrait-pulse {
          0%, 100% { box-shadow: 0 0 0 4px ${accentColor}33, 0 0 0 8px ${accentColor}11, 0 8px 32px rgba(0,0,0,0.35); }
          50%       { box-shadow: 0 0 0 6px ${accentColor}55, 0 0 0 14px ${accentColor}1a, 0 8px 40px rgba(0,0,0,0.45); }
        }
        .af-portrait-btn:hover .af-portrait-ring {
          filter: brightness(1.12) saturate(1.1);
          transform: scale(1.04);
        }
        .af-portrait-btn:hover .af-tap-label {
          opacity: 1;
        }
        .af-portrait-ring {
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .af-tap-label {
          transition: opacity 0.2s ease;
          opacity: 0.75;
        }
      `}</style>

      <div className="relative z-10 max-w-lg w-full flex flex-col gap-5">

        {/* ── Header row: back + tier badge ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
            style={{ color: '#8A8FA3', opacity: 0.75 }}
          >
            {t('back')}
          </button>
          {/* <span
            className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#8A8FA3' }}
          >
            {t(`select.tierLabels.${scenario.difficultyTier}`)}
          </span> */}
        </div>

        {/* ── Title + location ── */}
        <div className="text-center">
          <h1
            className="text-2xl font-bold leading-snug"
            style={{ color: '#F5F0E8', fontFamily: 'Quicksand, Nunito, sans-serif' }}
          >
            {title}
          </h1>
          <p className="text-xs italic mt-1" style={{ color: '#F5F0E8', opacity: 0.45 }}>
            {resolveField(scenario.locationRef, lang)}
          </p>
        </div>

        {/* ── Two-column body: portrait left, story right ── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

          {/* Portrait — clickable, full 112 px, no shrink */}
          <button
            onClick={handleStart}
            className="af-portrait-btn flex-shrink-0 flex flex-col items-center gap-2 focus:outline-none"
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            aria-label={`${t('intro.tapToBegin')} — ${character.name}`}
          >
            <div
              className="af-portrait-ring w-28 h-28 rounded-full overflow-hidden flex items-center justify-center text-4xl font-bold"
              style={{
                border: `3px solid ${accentColor}`,
                animation: 'af-portrait-pulse 2.4s ease-in-out infinite',
                backgroundColor: accentColor + '33',
              }}
            >
              {portraitSrc ? (
                <img
                  src={portraitSrc}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span style={{ color: accentColor }}>
                  {character.name?.[0]?.toUpperCase() ?? '?'}
                </span>
              )}
            </div>
            {/* Name + tap hint stacked below portrait */}
            <span
              className="text-sm font-semibold"
              style={{ color: accentColor, fontFamily: 'Quicksand, Nunito, sans-serif' }}
            >
              {character.name}
            </span>
            <span
              className="af-tap-label text-xs font-medium px-3 py-1 rounded-full"
              style={{
                backgroundColor: accentColor + '22',
                color: accentColor,
                letterSpacing: '0.03em',
              }}
            >
              {t('intro.tapToBegin')}
            </span>
          </button>

          {/* Story text column */}
          <div className="flex flex-col gap-3 sm:pt-1 text-center sm:text-left">
            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} className="sm:hidden" />
            <p
              className="text-sm leading-relaxed"
              style={{ color: '#F5F0E8', opacity: 0.82 }}
            >
              {storyPlot}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
