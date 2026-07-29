import { useLang } from '../context/LanguageContext.jsx'
import ScoreBar from './ScoreBar.jsx'

const DIMENSION_KEYS = [
  { key: 'clarity',    color: '#8A8FA3' },
  { key: 'politeness', color: '#FFD166' },
  { key: 'empathy',    color: '#D4A574' },
  { key: 'expression', color: '#9B6B8C' },
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
