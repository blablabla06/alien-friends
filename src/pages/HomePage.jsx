import { useNavigate } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import LevelBadge from '../components/LevelBadge.jsx'
import StreakTracker from '../components/StreakTracker.jsx'
import DailyMissionCard from '../components/DailyMissionCard.jsx'

export default function HomePage() {
  const navigate = useNavigate()
  const { state } = useGameState()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 gap-8">
      <header className="text-center">
        <h1 className="text-5xl font-bold font-display text-coral mb-2">
          Alien Friends
        </h1>
        <p className="text-lg text-warm-white opacity-70">
          Practice conversations that matter.
        </p>
      </header>

      <div className="flex gap-6 items-center">
        <LevelBadge level={state.level} xp={state.xp} />
        <StreakTracker streak={state.streak} />
      </div>

      <DailyMissionCard />

      <button
        onClick={() => navigate('/select')}
        className="px-10 py-4 rounded-2xl text-xl font-bold font-display transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: '#FF8B5E', color: '#1A1B3A' }}
      >
        Start Talking
      </button>

      <button
        onClick={() => navigate('/growth')}
        className="text-sm underline text-teal-chrome opacity-80 hover:opacity-100"
      >
        View Growth Report
      </button>
    </div>
  )
}
