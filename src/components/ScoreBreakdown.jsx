import { useLang } from '../context/LanguageContext.jsx'
import ScoreBar from './ScoreBar.jsx'

const DIMENSION_KEYS = [
  { key: 'clarity',    color: '#4ECDC4' },
  { key: 'politeness', color: '#FFD166' },
  { key: 'empathy',    color: '#FF8B5E' },
  { key: 'expression', color: '#A78BFA' },
]

export default function ScoreBreakdown({ scores = {} }) {
  const { t } = useLang()
  return (
    <div className="w-full flex flex-col gap-3">
      {DIMENSION_KEYS.map(({ key, color }) => (
        <ScoreBar key={key} label={t(`dims.${key}`)} value={scores[key] ?? 0} color={color} />
      ))}
    </div>
  )
}
