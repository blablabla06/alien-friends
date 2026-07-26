import { useEffect, useState } from 'react'

/**
 * Full-screen overlay shown before the first NPC line.
 * Displays scenario.storyPlot + a "Start Conversation" button.
 * Uses the same mood-based background overlay as DialogueScreen.
 */
export default function StoryIntroOverlay({ scenario, character, connectionMood, onStart, onBack }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Fade in on mount
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  const overlayColor = connectionMood >= 60
    ? 'rgba(255,139,94,0.18)'
    : connectionMood <= 35
    ? 'rgba(78,205,196,0.10)'
    : 'rgba(120,100,200,0.13)'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{
        backgroundColor: '#1A1B3A',
        transition: 'opacity 0.4s ease',
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Mood overlay tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: overlayColor, transition: 'background-color 0.6s ease' }}
      />

      {/* Back button — top-left, tertiary style */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-5 left-5 z-20 flex items-center gap-1 text-sm px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
          style={{
            color: '#F5F0E8',
            opacity: 0.55,
            border: '1px solid rgba(245,240,232,0.2)',
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        >
          ← Back
        </button>
      )}

      <div className="relative z-10 max-w-sm w-full flex flex-col gap-6 text-center">
        {/* Tier badge */}
        <span
          className="self-center text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: '#4ECDC4',
          }}
        >
          {scenario.difficultyTier}
        </span>

        {/* Title */}
        <h1
          className="text-2xl font-bold leading-snug"
          style={{ color: '#F5F0E8', fontFamily: 'Quicksand, Nunito, sans-serif' }}
        >
          {scenario.title}
        </h1>

        {/* Location */}
        <p className="text-xs italic" style={{ color: '#F5F0E8', opacity: 0.45 }}>
          {scenario.locationRef}
        </p>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />

        {/* Story plot */}
        <p
          className="text-sm leading-relaxed"
          style={{ color: '#F5F0E8', opacity: 0.82 }}
        >
          {scenario.storyPlot ?? scenario.setup}
        </p>

        {/* CTA */}
        <button
          onClick={onStart}
          className="w-full py-3 rounded-2xl text-sm font-semibold mt-2"
          style={{ backgroundColor: '#FF8B5E', color: '#1A1B3A' }}
        >
          Start Conversation →
        </button>
      </div>
    </div>
  )
}
