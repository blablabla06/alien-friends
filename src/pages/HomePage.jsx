import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import { useLang, resolveField } from '../context/LanguageContext.jsx'
import LevelBadge from '../components/LevelBadge.jsx'
import StreakTracker from '../components/StreakTracker.jsx'
import DailyMissionCard from '../components/DailyMissionCard.jsx'
import scenarios from '../data/scenarios/index.js'
import characters from '../data/characters/index.js'

import avatarStranger      from '../assets/avatars/stranger.png'
import avatarJamie         from '../assets/avatars/coworker-jamie.png'
import avatarMorgan        from '../assets/avatars/coworker-morgan.png'
import avatarOldFriend     from '../assets/avatars/old-friend.png'
import avatarUniTeammate   from '../assets/avatars/uni-teammate.png'
import avatarMum           from '../assets/avatars/mum.png'
import avatarOldBestFriend from '../assets/avatars/old-best-friend.png'

const AVATAR_MAP = {
  stranger:          avatarStranger,
  'coworker-jamie':  avatarJamie,
  'coworker-morgan': avatarMorgan,
  'old-friend':      avatarOldFriend,
  'uni-teammate':    avatarUniTeammate,
  mum:               avatarMum,
  'old-best-friend': avatarOldBestFriend,
}

// All localStorage keys used by the app — must be cleared together on reset.
const LS_KEYS_TO_CLEAR = [
  'alien_friends_progress', // Practice Mode: GameStateContext (xp, level, streak, sessionLog…)
  'alienStory_v3',          // Story Mode: AlienMainPage scene progress + choices
  'af_lang',                // Language preference
]

export default function HomePage() {
  const navigate = useNavigate()
  const { state, actions } = useGameState()
  const { lang, setLang } = useLang()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isMuted, setIsMuted] = useState(() => {
    try { return localStorage.getItem('af_voice_muted') === 'true' } catch { return false }
  })

  function toggleMute() {
    const next = !isMuted
    setIsMuted(next)
    try { localStorage.setItem('af_voice_muted', String(next)) } catch { /* ignore */ }
  }

  function handleResetConfirmed() {
    LS_KEYS_TO_CLEAR.forEach((key) => {
      try { localStorage.removeItem(key) } catch { /* private mode */ }
    })
    window.location.reload()
  }

  const homeText = lang === 'zh'
    ? {
        tagline: '一个关于谣言、偏见与群体归属的 2 分钟可玩预告。',
        play: '试玩 2 分钟原型',
        report: '成长报告',
        practiceHeading: '练习对话',
      }
    : {
        tagline: 'A 2-minute playable trailer about rumours, bias, and group belonging.',
        play: 'Play the Story',
        report: 'Growth Report',
        practiceHeading: 'Practice Conversations',
      }

  function handlePortrait(scenario) {
    const character = characters[scenario.npcRef]
    actions.startScenario(scenario, character)
    navigate(`/intro/${scenario.id}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 gap-7 max-w-lg mx-auto">

      {/* Header */}
      <header className="text-center">
        <h1 className="text-5xl font-bold font-display text-coral mb-2">
          Alien, Apparently
        </h1>
        <p className="text-lg text-warm-white opacity-70">
          {homeText.tagline}
        </p>
      </header>

      {/* Language toggle + mute toggle */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1 rounded-full px-1 py-1"
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {['en', 'zh'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={
                lang === l
                  ? { backgroundColor: '#8A8FA3', color: '#1A1D29' }
                  : { color: '#EDEBE4', opacity: 0.5 }
              }
            >
              {l === 'en' ? 'EN' : 'ZH'}
            </button>
          ))}
        </div>

        {/* Mute / unmute voice */}
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
          title={isMuted ? 'Unmute voice' : 'Mute voice'}
          className="flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
          style={{
            width: '34px',
            height: '34px',
            fontSize: '16px',
            backgroundColor: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Level + streak */}
      <div className="flex gap-6 items-center">
        <LevelBadge level={state.level} xp={state.xp} />
        <StreakTracker streak={state.streak} />
      </div>

      {/* Daily mission */}
      <DailyMissionCard />

      {/* Primary CTA */}
      <button
        onClick={() => navigate('/play')}
        className="w-full max-w-xs px-10 py-4 rounded-2xl text-xl font-bold font-display transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: '#D4A574', color: '#1A1D29' }}
      >
        {homeText.play}
      </button>

      {/* Growth report — secondary outlined button */}
      <button
        onClick={() => navigate('/growth')}
        className="w-full max-w-xs px-10 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
        style={{
          border: '1.5px solid #8A8FA3',
          color: '#8A8FA3',
          backgroundColor: 'transparent',
        }}
      >
        {homeText.report}
      </button>

      {/* Divider */}
      <div className="w-full border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Practice portrait grid */}
      <section className="w-full">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-teal-chrome mb-4 text-center">
          {homeText.practiceHeading}
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {scenarios.map((scenario) => {
            const avatar = AVATAR_MAP[scenario.npcRef]
            const character = characters[scenario.npcRef]
            const name = character?.name ?? resolveField(scenario.title, lang)
            return (
              <button
                key={scenario.id}
                onClick={() => handlePortrait(scenario)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className="w-full aspect-square rounded-2xl overflow-hidden transition-transform group-hover:scale-105 group-active:scale-95"
                  style={{ border: '2px solid rgba(255,255,255,0.1)' }}
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                    >
                      ?
                    </div>
                  )}
                </div>
                <span className="text-xs text-warm-white opacity-70 text-center leading-tight group-hover:opacity-100 transition-opacity">
                  {name}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Footer reset link */}
      <footer className="w-full flex justify-center pt-2 pb-1">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-xs opacity-30 hover:opacity-60 transition-opacity"
          style={{ color: '#F5F0E8' }}
        >
          Reset Progress
        </button>
      </footer>

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="w-full max-w-xs rounded-2xl p-6 flex flex-col gap-4"
            style={{ backgroundColor: '#1A1B3A', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <h2 className="text-base font-bold font-display text-warm-white text-center">
              Reset all progress?
            </h2>
            <p className="text-sm text-center" style={{ color: '#F5F0E8', opacity: 0.65 }}>
              This will erase all progress — XP, completed scenarios, story state — and cannot be undone.
            </p>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ border: '1.5px solid rgba(255,255,255,0.2)', color: '#F5F0E8' }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirmed}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#E05C3A', color: '#fff' }}
              >
                Erase &amp; Restart
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
