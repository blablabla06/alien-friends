import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import { useLang, resolveField } from '../context/LanguageContext.jsx'
import { useMusic } from '../context/MusicContext.jsx'

import { buildCharacterPrompt, buildClosingPrompt, buildSuggestionOnlyPrompt } from '../lib/aiCharacterPrompt.js'
import { extractCleanDialogue } from '../lib/npcResponseParser.js'
import { callLLM } from '../lib/llmClient.js'
import { scoreResponse } from '../lib/scoringEngine.js'

import NpcAvatar from '../components/NpcAvatar.jsx'
import ChatBubble from '../components/ChatBubble.jsx'
import UserInputBox from '../components/UserInputBox.jsx'
import SuggestedReplyOptions from '../components/SuggestedReplyOptions.jsx'
import MoodMeter from '../components/MoodMeter.jsx'

import bgCoffeeShop    from '../assets/backgrounds/coffee-shop.png'
import bgOffice        from '../assets/backgrounds/office.png'
import bgMeetingRoom   from '../assets/backgrounds/meeting-room.png'
import bgParkBench     from '../assets/backgrounds/park-bench.png'
import bgStudyRoom     from '../assets/backgrounds/study-room.png'
// import bgDiscussionRoom from '../assets/backgrounds/discussion-room.png'
import bgHomeKitchen   from '../assets/backgrounds/home-kitchen.png'
import bgSupermarket   from '../assets/backgrounds/supermarket.png'

const BG_MAP = {
  '/assets/backgrounds/coffee-shop.png':     bgCoffeeShop,
  '/assets/backgrounds/office.png':          bgOffice,
  '/assets/backgrounds/meeting-room.png':    bgMeetingRoom,
  '/assets/backgrounds/park-bench.png':      bgParkBench,
  '/assets/backgrounds/study-room.png':      bgStudyRoom,
  '/assets/backgrounds/home-kitchen.png':    bgHomeKitchen,
  '/assets/backgrounds/supermarket.png':     bgSupermarket,
}

// ── character voice clips (EN) ────────────────────────────────────────────────
import alexVoiceEn    from '../assets/voice/practice-en/alex.wav'
import jamieVoiceEn   from '../assets/voice/practice-en/jamie.wav'
import samVoiceEn     from '../assets/voice/practice-en/sam.wav'
import morganVoiceEn  from '../assets/voice/practice-en/morgan.wav'
import rileyVoiceEn   from '../assets/voice/practice-en/riley.wav'
import mumVoiceEn     from '../assets/voice/practice-en/mum.wav'
import jordanVoiceEn  from '../assets/voice/practice-en/jordan.wav'

// ── character voice clips (ZH) ────────────────────────────────────────────────
import alexVoiceZh    from '../assets/voice/practice-ch/alex.wav'
import jamieVoiceZh   from '../assets/voice/practice-ch/jamie.wav'
import samVoiceZh     from '../assets/voice/practice-ch/sam.wav'
import morganVoiceZh  from '../assets/voice/practice-ch/morgan.wav'
import rileyVoiceZh   from '../assets/voice/practice-ch/riley.wav'
import mumVoiceZh     from '../assets/voice/practice-ch/mum.wav'
import jordanVoiceZh  from '../assets/voice/practice-ch/jordan.wav'

// Keyed by character.name.toLowerCase().
// 'mom' maps to mum.wav — the JSON name is "Mom" but the audio file is mum.wav.
const CHARACTER_VOICE = {
  alex:   { en: alexVoiceEn,   zh: alexVoiceZh },
  jamie:  { en: jamieVoiceEn,  zh: jamieVoiceZh },
  sam:    { en: samVoiceEn,    zh: samVoiceZh },
  morgan: { en: morganVoiceEn, zh: morganVoiceZh },
  riley:  { en: rileyVoiceEn,  zh: rileyVoiceZh },
  mom:    { en: mumVoiceEn,    zh: mumVoiceZh },
  jordan: { en: jordanVoiceEn, zh: jordanVoiceZh },
}

// ── Web Audio gain-boosted playback ───────────────────────────────────────────
function playVoiceClip(src, gainMultiplier = 1.8) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const audio = new Audio(src)
    audio.crossOrigin = 'anonymous'
    const source = audioCtx.createMediaElementSource(audio)
    const gainNode = audioCtx.createGain()
    gainNode.gain.value = gainMultiplier // boost beyond 100% — tune in 1.5–2.5 range
    source.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    audio.play().catch(() => { /* fail silently */ })
    return audio
  } catch {
    // Fallback: plain Audio element if Web Audio API fails
    const audio = new Audio(src)
    audio.play().catch(() => {})
    return audio
  }
}

export default function DialogueScreen() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const { state, actions } = useGameState()
  const { lang, t } = useLang()
  const { currentScenario: scenario, currentCharacter: character, dialogueHistory, connectionMood, turnCount, currentScores } = state
  const liveComposite = currentScores?.composite ?? 0

  const { isMusicMuted, toggleMusicMute } = useMusic()

  const [inputText, setInputText]         = useState('')
  const [suggestions, setSuggestions]     = useState([])
  const [isLoading, setIsLoading]         = useState(false)
  const [npcTyping, setNpcTyping]         = useState(false)
  const [llmError, setLlmError]           = useState(null)   // { message, canRetry }
  const [conversationEnded, setConversationEnded] = useState(false)
  // independent loading state for the help button so it doesn't block the main input
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const scrollRef = useRef(null)
  // Hard guard: survives StrictMode's double-invoke because refs are NOT reset
  // between the simulated unmount/remount cycle in development mode.
  const openingFiredRef = useRef(false)
  // Count how many turns the player typed themselves (vs tapping a suggestion)
  const freeTextCountRef = useRef(0)
  // Preserves the player's last send so it can be retried without retyping
  const pendingRetryRef = useRef(null)   // { text, isSuggestion }
  // Tracks the currently playing opening-line HTMLAudioElement
  const audioRef = useRef(null)

  // ── Guard: redirect if no scenario loaded ──
  useEffect(() => {
    if (!scenario || scenario.id !== scenarioId) {
      navigate('/')
    }
  }, [scenario, scenarioId, navigate])

  // ── Opening line fires once on mount ──
  // DialogueScreen is only reachable via ScenarioIntroPage → "Start Conversation",
  // so by the time this component mounts the player has already seen the intro.
  useEffect(() => {
    if (!scenario || !character) return
    if (openingFiredRef.current) return
    openingFiredRef.current = true

    if (dialogueHistory.length > 0) return

    const { cleanDialogue: openingDialogue, combinedNarration: openingNarration } =
      extractCleanDialogue(resolveField(scenario.openingLine, lang), null)
      actions.addDialogueEntry({
      role:      'npc',
      text:      openingDialogue,
      npcAction: openingNarration,
      timestamp: Date.now(),
    })
  }, []) // eslint-disable-line

  // ── Auto-play character voice clip when the opening line first appears ──
  // Reads the shared mute flag from localStorage so it stays in sync with
  // the toggle on HomePage without needing a prop or context.
  // Fires once on mount (same lifecycle as the opening-line effect above).
  useEffect(() => {
    if (!character) return

    // Only play the opening voice clip for a genuinely fresh conversation —
    // if dialogueHistory already has entries, this is a restored session and
    // the opening line's voice clip was already heard in the earlier session.
    if (dialogueHistory.length > 0) return
    
    // Stop any clip that might still be playing from a previous scenario
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    let isMuted = false
    try { isMuted = localStorage.getItem('af_voice_muted') === 'true' } catch { /* ignore */ }
    if (isMuted) return

    const key = character.name?.toLowerCase() ?? ''
    const src = CHARACTER_VOICE[key]?.[lang]
    if (!src) return

    audioRef.current = playVoiceClip(src)
  }, []) // eslint-disable-line

  // ── Auto-scroll ──
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [dialogueHistory, npcTyping])

  if (!scenario || !character) return null

  // ── Core turn handler ──
  // isSuggestion=true when the player tapped a suggested reply; false when they typed manually
  // replyObj may be a {action, line, style} object (new) or a plain string (free text / legacy)
  async function handleSend(replyObj, isSuggestion = false) {
    // Strip any surrounding quotes (" or ') that the LLM may have included, then trim whitespace.
    const stripQuotes = (s) => String(s ?? '').trim().replace(/^["'](.*)["']$/s, '$1').trim()

    // Normalise: accept either a reply object or a plain string
    const isObj   = replyObj && typeof replyObj === 'object'
    const cleanLine = isObj ? stripQuotes(replyObj.line) : ''
    const llmText = isObj
      ? (replyObj.action ? `${replyObj.action} "${cleanLine}"` : cleanLine)
      : String(replyObj ?? '').trim()

    if (!llmText.trim() || isLoading || conversationEnded) return

    setLlmError(null)

    // Track free-text turns and tick the mission event
    if (!isSuggestion) {
      freeTextCountRef.current += 1
      actions.tickMissions({
        type:          'FREE_TEXT_USED',
        freeTextCount: freeTextCountRef.current,
      })
    }

    const userEntry = {
      role:      'user',
      text:      llmText,
      // Store action/line separately for split rendering in chat history — use cleanLine so the
      // displayed text is also free of any LLM-added surrounding quotes.
      ...(isObj && replyObj.action ? { action: replyObj.action, line: cleanLine } : {}),
      timestamp: Date.now(),
    }
    actions.addDialogueEntry(userEntry)
    // Preserve the player's text before clearing — used by the retry button
    pendingRetryRef.current = { text: llmText, isSuggestion }
    setInputText('')
    setSuggestions([])

    const maxTurns = scenario.maxTurns ?? 6
    const updatedHistory = [...dialogueHistory, userEntry]

    // ── End-condition: player has used their last turn ──
    const isLastTurn = (turnCount + 1) >= maxTurns

    // Score and NPC reply run in parallel.
    // Scoring is fire-and-forget: if it fails we skip that turn's score silently.
    const scoringPromise = scoreResponse(llmText, character, updatedHistory, undefined, lang).catch(() => null)

    if (isLastTurn) {
      const [scores] = await Promise.all([
        scoringPromise,
        fetchClosingLine(updatedHistory),
      ])
      if (scores) actions.addScoreEntry(scores)
    } else {
      const [scores] = await Promise.all([
        scoringPromise,
        fetchNpcTurn(llmText, updatedHistory),
      ])
      if (scores) actions.addScoreEntry(scores)
    }
  }

  // ── Retry handler — re-attempts the NPC fetch for the last player turn ──
  // The user entry is already in dialogueHistory, so we just redo the NPC call.
  async function handleRetry() {
    if (isLoading || !pendingRetryRef.current) return
    setLlmError(null)

    const maxTurns = scenario.maxTurns ?? 6
    const isLastTurn = turnCount >= maxTurns   // turnCount already includes this turn

    const scoringPromise = Promise.resolve(null)  // skip scoring on retry

    if (isLastTurn) {
      await fetchClosingLine(dialogueHistory)
    } else {
      await fetchNpcTurn(pendingRetryRef.current.text, dialogueHistory)
    }
    // scoring was already fired on the original attempt; don't double-count
    void scoringPromise
  }

  async function fetchNpcTurn(userText, history) {
    setIsLoading(true)
    setNpcTyping(true)
    setLlmError(null)

    const messages = buildCharacterPrompt(character, scenario, history, userText, liveComposite, lang)

    console.log('[AlienFriends] Sending to LLM:', messages)

    const result = await callLLM(messages)

    console.log('[AlienFriends] LLM response:', result)

    setNpcTyping(false)
    setIsLoading(false)

    if (!result.ok) {
      setLlmError({
        message: result.timedOut
          ? t('dialogue.connectionTimedOut')
          : t('dialogue.connectionInterrupted'),
        canRetry: true,
      })
      return
    }

    // Parse structured response
    let parsed
    try {
      const clean = result.text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { npcResponse: result.text, suggestedReplies: [], moodShift: 'neutral' }
    }

    // Defensively split narration from spoken dialogue regardless of model compliance.
    const { cleanDialogue, combinedNarration } = extractCleanDialogue(
      parsed.npcResponse ?? result.text,
      parsed.npcAction   ?? null,
    )

    actions.addDialogueEntry({
      role:      'npc',
      text:      cleanDialogue,
      npcAction: combinedNarration,
      timestamp: Date.now(),
    })

    if (parsed.moodShift) {
      actions.shiftMood(parsed.moodShift)
    }

    setSuggestions(parsed.suggestedReplies ?? [])
  }

  /**
   * Called on the final turn. Derives an outcome hint from connectionMood,
   * asks the LLM for a closing beat, displays it, then shows Continue button.
   */
  async function fetchClosingLine(history) {
    setIsLoading(true)
    setNpcTyping(true)
    setLlmError(null)
    setSuggestions([])

    // Derive outcome from the running mood score
    const finalMood = connectionMood
    const outcome =
      finalMood >= 60 ? 'positive' :
      finalMood <= 35 ? 'negative' :
      'neutral'

    const messages = buildClosingPrompt(character, scenario, history, outcome, lang)

    console.log('[AlienFriends] Closing prompt:', messages)

    const result = await callLLM(messages)

    console.log('[AlienFriends] Closing response:', result)

    setNpcTyping(false)
    setIsLoading(false)

    if (!result.ok) {
      setLlmError({
        message: result.timedOut
          ? t('dialogue.connectionTimedOut')
          : t('dialogue.connectionInterrupted'),
        canRetry: true,
      })
      // Still let the player proceed to ending even on error
      setConversationEnded(true)
      return
    }

    let rawClosingText = result.text
    let rawClosingAction = null
    try {
      const clean = result.text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      const parsed = JSON.parse(clean)
      rawClosingText  = parsed.npcResponse ?? result.text
      rawClosingAction = parsed.npcAction ?? null
    } catch {
      // plain text fallback — use as-is
    }

    // Defensively split narration from spoken dialogue.
    const { cleanDialogue: closingText, combinedNarration: closingAction } =
      extractCleanDialogue(rawClosingText, rawClosingAction)

    actions.addDialogueEntry({
      role:      'npc',
      text:      closingText,
      npcAction: closingAction,
      timestamp: Date.now(),
    })

    setConversationEnded(true)
  }

  // ── On-demand suggestion fetch (help button) ──
  // Completely independent of the normal NPC turn — uses its own prompt
  // and its own loading state so it never blocks sending a message.
  async function fetchSuggestions() {
    if (isFetchingSuggestions || isLoading || conversationEnded) return
    setIsFetchingSuggestions(true)
    actions.incrementHelp()

    const messages = buildSuggestionOnlyPrompt(character, scenario, dialogueHistory, lang)
    const result   = await callLLM(messages)

    setIsFetchingSuggestions(false)

    if (!result.ok) return  // fail silently — button is a helper, not critical

    try {
      const clean  = result.text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      const parsed = JSON.parse(clean)
      if (Array.isArray(parsed.suggestedReplies) && parsed.suggestedReplies.length > 0) {
        setSuggestions(parsed.suggestedReplies)
      }
    } catch {
      // JSON parse failed — ignore, button can be tapped again
    }
  }

  const maxTurns = scenario.maxTurns ?? 6

  const bgSrc = BG_MAP[scenario.backgroundImage] ?? null

  // Mood-driven overlay colour: warm coral when connected, cool teal when distant
  const moodOverlay =
    connectionMood >= 60
      ? 'rgba(212,165,116,0.22)'
      : connectionMood <= 35
      ? 'rgba(78,205,196,0.14)'
      : 'rgba(120,100,200,0.10)'

  return (
    <div
      className="min-h-screen flex flex-col max-w-xl mx-auto relative"
      style={bgSrc ? {
        backgroundImage: `url("${bgSrc}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      {/* Dark base scrim so text is always readable over any background photo */}
      {bgSrc && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: 'rgba(10,12,28,0.5)', zIndex: 0 }}
        />
      )}
      {/* Mood colour overlay — warms as connection score rises */}
      {bgSrc && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: moodOverlay,
            transition: 'background-color 0.8s ease',
            zIndex: 1,
          }}
        />
      )}
      {/* All content sits above the overlays — flex column, constrained to viewport height */}
      <div className="relative flex flex-col" style={{ zIndex: 2, height: '100dvh' }}>
      {/* ── Sticky header ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 pt-5 pb-3 border-b border-white/10"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'rgba(10,12,28,0.1)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Left — back arrow + avatar + name as one clickable group */}
        <button
          className="flex items-center gap-2 group focus:outline-none"
          onClick={() => navigate('/')}
          aria-label="Back to Home"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <span
            className="text-warm-white transition-opacity group-hover:opacity-100"
            style={{ fontSize: '28px', opacity: 0.55, lineHeight: 1, marginRight: '2px' }}
            aria-hidden="true"
          >
            ‹
          </span>
          <NpcAvatar characterId={character.id} name={character.name} />
        </button>

        {/* Right — turn counter + mood meter + music mute */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-warm-white opacity-40">
            {turnCount}/{maxTurns}
          </span>
          <MoodMeter mood={connectionMood} />
          <button
            className="af-ghost-button"
            aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
            title={isMusicMuted ? 'Unmute music' : 'Mute music'}
            onClick={toggleMusicMute}
            style={{ fontSize: '16px', padding: '4px 8px', lineHeight: 1 }}
          >
            {isMusicMuted ? '🎵' : '🎶'}
          </button>
        </div>
      </div>

      {/* Friendly error card with retry */}
      {llmError && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-2xl flex flex-col gap-2 border border-white/10"
          style={{ backgroundColor: 'rgba(255,139,94,0.10)' }}
        >
          <p className="text-sm" style={{ color: '#F5F0E8', opacity: 0.85 }}>
            {llmError.message}
          </p>
          {llmError.canRetry && !conversationEnded && (
            <button
              onClick={handleRetry}
              disabled={isLoading}
              className="self-start text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity disabled:opacity-40"
              style={{ backgroundColor: '#D4A57422', color: '#D4A574', border: '1px solid #D4A57444' }}
            >
              {t('tryAgain')}
            </button>
          )}
        </div>
      )}

      {/* Chat history — scrollable region; grows to fill space above the pinned footer */}
      <div
        ref={scrollRef}
        className="dialogue-scroll-area flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto"
        style={{ paddingBottom: '0.5rem', minHeight: 0 }}
      >
        {dialogueHistory.map((entry, i) => {
          // User entry with a physical action prefix (from structured suggested replies)
          if (entry.role === 'user' && entry.action) {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] flex flex-col gap-0.5">
                  <p className="text-xs italic px-4 py-1" style={{ color: 'rgba(245,240,232,0.5)' }}>
                    {entry.action}
                  </p>
                  <ChatBubble role="user" text={entry.line ?? entry.text} />
                </div>
              </div>
            )
          }
          // NPC entry — render npcAction as scene narration above the speech bubble
          if (entry.role === 'npc' && entry.npcAction) {
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <p
                  className="text-xs italic text-center px-6"
                  style={{ color: 'rgba(245,240,232,0.42)', lineHeight: '1.5' }}
                >
                  {entry.npcAction}
                </p>
                <ChatBubble role="npc" text={entry.text} />
              </div>
            )
          }
          // Plain entry (no action)
          return <ChatBubble key={i} role={entry.role} text={entry.text} />
        })}
        {npcTyping && (
          <div className="flex justify-start px-1">
            <div
              className="px-4 py-2.5 rounded-2xl text-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.09)', color: '#F5F0E8', borderBottomLeftRadius: 4 }}
            >
              <span className="animate-pulse">…</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Input area — sticky footer, always pinned to bottom of viewport ── */}
      <div
        className="flex-shrink-0 px-4 pb-6 pt-3 flex flex-col gap-3 border-t border-white/10"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
          backgroundColor: 'rgba(10,12,28,0.35)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {conversationEnded ? (
          /* ── End-of-conversation CTA ── */
          <button
            onClick={() => navigate('/ending')}
            className="w-full py-3 rounded-2xl text-sm font-semibold transition-opacity"
            style={{ backgroundColor: '#D4A574', color: '#1A1B3A' }}
          >
            {t('dialogue.seeHowItWent')}
          </button>
        ) : (
          <>
            <SuggestedReplyOptions
              suggestions={suggestions}
              onSelect={handleSend}
              disabled={isLoading}
            />
            <UserInputBox
              value={inputText}
              onChange={setInputText}
              onSend={handleSend}
              disabled={isLoading}
            />
            {/* ── Bottom action row: help button + end early ── */}
            <div className="flex items-center justify-between">
              {/* Need a suggestion? — always available, independent LLM call */}
              <button
                onClick={fetchSuggestions}
                disabled={isFetchingSuggestions || isLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-opacity disabled:opacity-40"
                style={{
                  backgroundColor: 'rgba(78,205,196,0.12)',
                  color: '#4ECDC4',
                  border: '1px solid rgba(78,205,196,0.25)',
                }}
              >
                {isFetchingSuggestions ? (
                  <span className="animate-pulse">…</span>
                ) : (
                  <>
                    <span style={{ fontSize: '0.75rem' }}>💡</span>
                    <span>{t('dialogue.needSuggestion')}</span>
                  </>
                )}
              </button>

              {/* End early — styled as a secondary button so it's clearly discoverable */}
              <button
                onClick={() => navigate('/results')}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'rgba(245,240,232,0.07)',
                  color: 'rgba(245,240,232,0.70)',
                  border: '1px solid rgba(245,240,232,0.18)',
                }}
              >
                {t('dialogue.endEarly')}
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  )
}
