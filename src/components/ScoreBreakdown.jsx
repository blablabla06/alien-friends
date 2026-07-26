import ScoreBar from './ScoreBar.jsx'

const DIMENSIONS = [
  { key: 'clarity',    label: 'Clarity',    color: '#4ECDC4' },
  { key: 'politeness', label: 'Politeness', color: '#FFD166' },
  { key: 'empathy',    label: 'Empathy',    color: '#FF8B5E' },
  { key: 'expression', label: 'Expression', color: '#A78BFA' },
]

export default function ScoreBreakdown({ scores = {} }) {
  return (
    <div className="w-full flex flex-col gap-3">
      {DIMENSIONS.map(({ key, label, color }) => (
        <ScoreBar key={key} label={label} value={scores[key] ?? 0} color={color} />
      ))}
    </div>
  )
}
