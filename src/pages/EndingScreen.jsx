import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import { useLang, resolveField } from '../context/LanguageContext.jsx'
import { buildEpiloguePrompt } from '../lib/aiCharacterPrompt.js'
import { callLLM } from '../lib/llmClient.js'

// ── Mood → background overlay ─────────────────────────────────────────────────
// Mirrors the warm/cool treatment from DialogueScreen, but LOCKED at final state.
// 0-35  → cool indigo (distance)
// 36-59 → blended indigo-amber (ambiguous)
// 60+   → warm coral-amber (connection)
function moodToOverlay(mood) {
  if (mood >= 60) {
    // warm sand glow
    return 'radial-gradient(ellipse at 50% 30%, rgba(212,165,116,0.28) 0%, rgba(26,29,41,0) 70%)'
  }
  if (mood <= 35) {
    // cool teal tinge
    return 'radial-gradient(ellipse at 50% 30%, rgba(78,205,196,0.18) 0%, rgba(26,29,41,0) 70%)'
  }
  // neutral — soft amber
  return 'radial-gradient(ellipse at 50% 30%, rgba(255,195,94,0.18) 0%, rgba(26,29,41,0) 70%)'
}

export default function EndingScreen() {
  const navigate = useNavigate()
  const { state } = useGameState()
  const { lang, t } = useLang()
  const {
    currentScenario: scenario,
    currentCharacter: character,
    dialogueHistory,
    connectionMood,
  } = state

  const [epilogue, setEpilogue]     = useState('')
  const [isLoading, setIsLoading]   = useState(true)
  const [error, setError]           = useState('')
  const [retryCount, setRetryCount] = useState(0)  // incrementing triggers a retry
  const firedRef = useRef(false)

  // Redirect guard — if game state was lost (e.g. hard refresh), go home
  useEffect(() => {
    if (!scenario || !character) {
      navigate('/')
    }
  }, [scenario, character, navigate])

  // ── Derive outcome once, locked at the moment this screen mounts ──
  const outcome =
    connectionMood >= 60 ? 'positive' :
    connectionMood <= 35 ? 'negative' :
    'neutral'

  const overlay = moodToOverlay(connectionMood)

  // ── Single LLM call for the epilogue ──────────────────────────────────────
  useEffect(() => {
    if (!scenario || !character) return
    if (firedRef.current && retryCount === 0) return  // StrictMode guard (initial mount only)
    firedRef.current = true

    async function fetchEpilogue() {
      setIsLoading(true)
      setError('')
      const messages = buildEpiloguePrompt(character, scenario, dialogueHistory, outcome, lang)

      console.log('[AlienFriends] Epilogue prompt:', messages)

      const result = await callLLM(messages)

      console.log('[AlienFriends] Epilogue response:', result)

      setIsLoading(false)

      if (!result.ok) {
        setError(
          result.timedOut
            ? t('dialogue.connectionTimedOut')
            : t('dialogue.connectionInterrupted')
        )
        return
      }

      let text = result.text
      try {
        const clean = result.text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
        const parsed = JSON.parse(clean)
        text = parsed.epilogue ?? result.text
      } catch {
        // plain text fallback
      }

      setEpilogue(text)
    }

    fetchEpilogue()
  }, [retryCount]) // eslint-disable-line

  if (!scenario || !character) return null

  // ── Outcome label ─────────────────────────────────────────────────────────
  const outcomeLabel =
    outcome === 'positive' ? { text: t('ending.outcomes.positive'), color: '#D4A574' } :
    outcome === 'negative' ? { text: t('ending.outcomes.negative'), color: '#4ECDC4' } :
                             { text: t('ending.outcomes.neutral'),  color: '#F5C26B' }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 max-w-lg mx-auto"
      style={{ position: 'relative' }}
    >
      {/* Mood-locked background overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: overlay,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full">

        {/* Scenario title */}
        <p className="text-xs uppercase tracking-widest opacity-40" style={{ color: '#F5F0E8' }}>
          {resolveField(scenario.title, lang)}
        </p>

        {/* Outcome badge */}
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{
            color: outcomeLabel.color,
            border: `1px solid ${outcomeLabel.color}44`,
            backgroundColor: `${outcomeLabel.color}18`,
          }}
        >
          {outcomeLabel.text}
        </span>

        {/* Divider */}
        <div className="w-10 h-px opacity-20" style={{ backgroundColor: '#F5F0E8' }} />

        {/* Epilogue text */}
        <div className="text-center min-h-[6rem] flex flex-col items-center justify-center gap-3">
          {isLoading ? (
            <p
              className="text-base italic leading-relaxed animate-pulse"
              style={{ color: '#F5F0E8', opacity: 0.45 }}
            >
              {t('ending.reflecting')}
            </p>
          ) : error ? (
            <>
              <p className="text-sm" style={{ color: '#F5F0E8', opacity: 0.65 }}>
                {error}
              </p>
              <button
                onClick={() => setRetryCount(c => c + 1)}
                className="text-xs font-semibold px-4 py-1.5 rounded-full transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#D4A57422', color: '#D4A574', border: '1px solid #D4A57444' }}
              >
                {t('tryAgain')}
              </button>
            </>
          ) : (
            <p
              className="text-base italic leading-relaxed"
              style={{ color: '#F5F0E8', opacity: 0.88, maxWidth: '34ch', margin: '0 auto' }}
            >
              {epilogue}
            </p>
          )}
        </div>

        {/* CTAs — only shown when epilogue is ready (or on error) */}
        {(!isLoading) && (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs mt-4">
            <button
              onClick={() => navigate('/results')}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#D4A574', color: '#1A1D29' }}
            >
              {t('ending.seeResults')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'transparent',
                color: '#F5F0E8',
                border: '1px solid rgba(245,240,232,0.2)',
                opacity: 0.75,
              }}
            >
              {lang === 'zh' ? '返回主页' : 'Back to Home'}
            </button>
          </div>
        )}

        {/* Skip while loading */}
        {isLoading && (
          <button
            onClick={() => navigate('/results')}
            className="text-xs opacity-30 hover:opacity-60 transition-opacity"
            style={{ color: '#F5F0E8' }}
          >
            {t('ending.skip')}
          </button>
        )}
      </div>
    </div>
  )
}
