const STYLE_COLOURS = {
  curious:              '#4ECDC4',
  'light-humoured':     '#FFD166',
  'warm-observational': '#D4A574',
  empathetic:           '#4ECDC4',
  honest:               '#D4A574',
  accountable:          '#A78BFA',
  'non-judgmental':     '#4ECDC4',
  solidarity:           '#6EE7B7',
  'practical-offer':    '#FFD166',
  'gentle-curious':     '#4ECDC4',
  vulnerable:           '#F9A8D4',
  default:              '#4ECDC4',
}

/**
 * Normalise a reply object that may be either the old {text, style} shape
 * or the new {action, line, style} shape.
 */
function normalise(s) {
  if (s.line !== undefined) return s
  // legacy fallback
  return { action: null, line: s.text ?? '', style: s.style }
}

/**
 * Build the string sent to the LLM when this reply is selected.
 * Combines action (if present) and spoken line so the NPC has full context.
 */
export function replyToLlmText(s) {
  const r = normalise(s)
  if (r.action) return `${r.action} "${r.line}"`
  return r.line
}

export default function SuggestedReplyOptions({ suggestions, onSelect, disabled }) {
  if (!suggestions?.length) return null

  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((s, i) => {
        const r      = normalise(s)
        const colour = STYLE_COLOURS[r.style] ?? STYLE_COLOURS.default
        return (
          <button
            key={i}
            onClick={() => !disabled && onSelect(r, true)}
            disabled={disabled}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-40 hover:brightness-110"
            style={{
              backgroundColor: `${colour}22`,
              border: `1px solid ${colour}55`,
              color: '#F5F0E8',
            }}
          >
            <span className="text-xs mr-2 opacity-60" style={{ color: colour }}>
              {r.style}
            </span>
            {r.action && (
              <span
                className="block text-xs italic mb-1"
                style={{ color: 'rgba(245,240,232,0.55)' }}
              >
                {r.action}
              </span>
            )}
            <span>{r.line}</span>
          </button>
        )
      })}
    </div>
  )
}
