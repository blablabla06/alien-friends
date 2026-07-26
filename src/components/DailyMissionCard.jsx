const MISSION = {
  title: 'Daily Mission',
  description: 'Complete one Medium or Hard scenario today.',
  reward: '+50 XP',
}

export default function DailyMissionCard() {
  return (
    <div
      className="w-full max-w-sm rounded-2xl px-5 py-4 flex flex-col gap-2"
      style={{
        backgroundColor: 'rgba(78,205,196,0.10)',
        border: '1px solid rgba(78,205,196,0.25)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-teal-chrome">
          {MISSION.title}
        </span>
        <span className="text-xs font-semibold text-coral">{MISSION.reward}</span>
      </div>
      <p className="text-sm text-warm-white opacity-80">{MISSION.description}</p>
    </div>
  )
}
