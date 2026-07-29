export default function UserInputBox({ value, onChange, onSend, disabled }) {
  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend(value)
    }
  }

  return (
    <div className="flex gap-2 items-end">
      <textarea
        rows={2}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder="Type your reply… (Enter to send)"
        className="flex-1 px-4 py-3 rounded-xl resize-none text-sm outline-none disabled:opacity-40"
        style={{
          backgroundColor: 'rgba(255,255,255,0.08)',
          color: '#F5F0E8',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      />
      <button
        onClick={() => { if (!disabled && value.trim()) onSend(value) }}
        disabled={disabled || !value.trim()}
        className="px-4 py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-opacity flex-shrink-0"
        style={{ backgroundColor: '#D4A574', color: '#1A1B3A' }}
      >
        Send
      </button>
    </div>
  )
}
