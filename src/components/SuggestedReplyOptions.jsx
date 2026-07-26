const STYLE_COLOURS = {
  curious:           '#4ECDC4',
  'light-humoured':  '#FFD166',
  'warm-observational': '#FF8B5E',
  empathetic:        '#4ECDC4',
  honest:            '#FF8B5E',
  accountable:       '#A78BFA',
  'non-judgmental':  '#4ECDC4',
  solidarity:        '#6EE7B7',
  'practical-offer': '#FFD166',
  'gentle-curious':  '#4ECDC4',
  vulnerable:        '#F9A8D4',
  default:           '#4ECDC4',
}

export default function SuggestedReplyOptions({ suggestions, onSelect, disabled }) {
  if (!suggestions?.length) return null

  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((s, i) => {
        const colour = STYLE_COLOURS[s.style] ?? STYLE_COLOURS.default
        return (
          <button
            key={i}
            onClick={() => !disabled && onSelect(s.text)}
            disabled={disabled}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-40 hover:brightness-110"
            style={{
              backgroundColor: `${colour}22`,
              border: `1px solid ${colour}55`,
              color: '#F5F0E8',
            }}
          >
            <span className="text-xs mr-2 opacity-60" style={{ color: colour }}>
              {s.style}
            </span>
            {s.text}
          </button>
        )
      })}
    </div>
  )
}
