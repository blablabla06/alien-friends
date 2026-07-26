import { useNavigate } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import { useLang } from '../context/LanguageContext.jsx'
import LevelBadge from '../components/LevelBadge.jsx'
import StreakTracker from '../components/StreakTracker.jsx'
import DailyMissionCard from '../components/DailyMissionCard.jsx'

export default function HomePage() {
  const navigate = useNavigate()
  const { state } = useGameState()
  const { lang, setLang } = useLang()
  const homeText = lang === 'zh'
    ? {
        tagline: '一个关于谣言、偏见与群体归属的 2 分钟可玩预告。',
        play: '试玩 2 分钟原型',
        archive: '打开练习档案',
      }
    : {
        tagline: 'A 2-minute playable trailer about rumours, bias, and group belonging.',
        play: 'Play 2-Min Prototype',
        archive: 'Open practice archive',
      }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 gap-8">
      <header className="text-center">
        <h1 className="text-5xl font-bold font-display text-coral mb-2">
          Alien, Apparently
        </h1>
        <p className="text-lg text-warm-white opacity-70">
          {homeText.tagline}
        </p>
      </header>

      {/* Language toggle */}
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
                ? { backgroundColor: '#4ECDC4', color: '#1A1B3A' }
                : { color: '#F5F0E8', opacity: 0.5 }
            }
          >
            {l === 'en' ? 'EN' : 'ZH'}
          </button>
        ))}
      </div>

      <div className="flex gap-6 items-center">
        <LevelBadge level={state.level} xp={state.xp} />
        <StreakTracker streak={state.streak} />
      </div>

      <DailyMissionCard />

      <button
        onClick={() => navigate('/prototype')}
        className="px-10 py-4 rounded-2xl text-xl font-bold font-display transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: '#FF8B5E', color: '#1A1B3A' }}
      >
        {homeText.play}
      </button>

      <button
        onClick={() => navigate('/select')}
        className="text-sm underline text-teal-chrome opacity-80 hover:opacity-100"
      >
        {homeText.archive}
      </button>
    </div>
  )
}
