import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import { buildCharacterPrompt, buildClosingPrompt, buildSuggestionOnlyPrompt } from '../lib/aiCharacterPrompt.js'
import { callLLM } from '../lib/llmClient.js'
import { scoreResponse } from '../lib/scoringEngine.js'

import NpcAvatar from '../components/NpcAvatar.jsx'
import ChatBubble from '../components/ChatBubble.jsx'
import UserInputBox from '../components/UserInputBox.jsx'
import SuggestedReplyOptions from '../components/SuggestedReplyOptions.jsx'
import MoodMeter from '../components/MoodMeter.jsx'

export default function DialogueScreen() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const { state, actions } = useGameState()
  const { currentScenario: scenario, currentCharacter: character, dialogueHistory, connectionMood, turnCount, currentScores } = state
  const liveComposite = currentScores?.composite ?? 0

  const [inputText, setInputText]         = useState('')
  const [suggestions, setSuggestions]     = useState([])
  const [isLoading, setIsLoading]         = useState(false)
  const [npcTyping, setNpcTyping]         = useState(false)
  const [errorBanner, setErrorBanner]     = useState('')
  const [conversationEnded, setConversationEnded] = useState(false)
  // independent loading state for the help button so it doesn't block the main input
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const scrollRef = useRef(null)
  // Hard guard: survives StrictMode's double-invoke because refs are NOT reset
  // between the simulated unmount/remount cycle in development mode.
  const openingFiredRef = useRef(false)

  // ── Guard: redirect if no scenario loaded ──
  useEffect(() => {
    if (!scenario || scenario.id !== scenarioId) {
      navigate('/select')
    }
  }, [scenario, scenarioId, navigate])

  // ── Opening line fires once on mount ──
  // DialogueScreen is only reachable via ScenarioIntroPage → "Start Conversation",
  // so by the time this component mounts the player has already seen the intro.
  useEffect(() => {
    if (!scenario || !character) return
    if (openingFiredRef.current) return
    openingFiredRef.current = true

    actions.addDialogueEntry({
      role: 'npc',
      text: scenario.openingLine,
      timestamp: Date.now(),
    })
  }, []) // eslint-disable-line

  // ── Auto-scroll ──
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [dialogueHistory, npcTyping])

  if (!scenario || !character) return null

  // ── Core turn handler ──
  async function handleSend(text) {
    if (!text.trim() || isLoading || conversationEnded) return

    const userEntry = { role: 'user', text: text.trim(), timestamp: Date.now() }
    actions.addDialogueEntry(userEntry)
    setInputText('')
    setSuggestions([])

    const maxTurns = scenario.maxTurns ?? 6
    const updatedHistory = [...dialogueHistory, userEntry]

    // ── End-condition: player has used their last turn ──
    const isLastTurn = (turnCount + 1) >= maxTurns

    // Score and NPC reply run in parallel — scoring is fire-and-forget
    // relative to the NPC turn so it never blocks the chat UI
    const scoringPromise = scoreResponse(text, character, updatedHistory)

    if (isLastTurn) {
      // Fetch closing line; we'll wait for scoring alongside it
      const [scores] = await Promise.all([
        scoringPromise,
        fetchClosingLine(updatedHistory),
      ])
      actions.addScoreEntry(scores)
    } else {
      const [scores] = await Promise.all([
        scoringPromise,
        fetchNpcTurn(text, updatedHistory),
      ])
      actions.addScoreEntry(scores)
    }
  }

  async function fetchNpcTurn(userText, history) {
    setIsLoading(true)
    setNpcTyping(true)
    setErrorBanner('')

    const messages = buildCharacterPrompt(character, scenario, history, userText, liveComposite)

    console.log('[AlienFriends] Sending to LLM:', messages)

    const result = await callLLM(messages)

    console.log('[AlienFriends] LLM response:', result)

    setNpcTyping(false)
    setIsLoading(false)

    if (!result.ok) {
      setErrorBanner(`LLM error: ${result.error}`)
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

    actions.addDialogueEntry({
      role: 'npc',
      text: parsed.npcResponse ?? result.text,
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
    setErrorBanner('')
    setSuggestions([])

    // Derive outcome from the running mood score
    const finalMood = connectionMood
    const outcome =
      finalMood >= 60 ? 'positive' :
      finalMood <= 35 ? 'negative' :
      'neutral'

    const messages = buildClosingPrompt(character, scenario, history, outcome)

    console.log('[AlienFriends] Closing prompt:', messages)

    const result = await callLLM(messages)

    console.log('[AlienFriends] Closing response:', result)

    setNpcTyping(false)
    setIsLoading(false)

    if (!result.ok) {
      setErrorBanner(`LLM error: ${result.error}`)
      // Still end the conversation even on error
      setConversationEnded(true)
      return
    }

    let closingText = result.text
    try {
      const clean = result.text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      const parsed = JSON.parse(clean)
      closingText = parsed.npcResponse ?? result.text
    } catch {
      // plain text fallback — use as-is
    }

    actions.addDialogueEntry({
      role: 'npc',
      text: closingText,
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

    const messages = buildSuggestionOnlyPrompt(character, scenario, dialogueHistory)
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

  return (
    <div className="min-h-screen flex flex-col max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-white/10">
        <NpcAvatar characterId={character.id} name={character.name} />
        <div className="flex items-center gap-4">
          <span className="text-xs text-warm-white opacity-40">
            {turnCount}/{maxTurns}
          </span>
          <MoodMeter mood={connectionMood} />
        </div>
      </div>

      {/* Error banner */}
      {errorBanner && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-xl text-sm text-warm-white bg-red-900/40 border border-red-500/30">
          {errorBanner}
        </div>
      )}

      {/* Scene-setting caption — shown once above the chat, not a bubble */}
      {scenario.setup && (
        <div className="mx-4 mt-4 mb-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-center">
          <p className="text-xs italic leading-relaxed" style={{ color: '#F5F0E8', opacity: 0.55 }}>
            {scenario.setup}
          </p>
        </div>
      )}

      {/* Chat history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {dialogueHistory.map((entry, i) => (
          <ChatBubble key={i} role={entry.role} text={entry.text} />
        ))}
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

      {/* Input area */}
      <div className="px-4 pb-6 pt-2 flex flex-col gap-3 border-t border-white/10">
        {conversationEnded ? (
          /* ── End-of-conversation CTA ── */
          <button
            onClick={() => navigate('/ending')}
            className="w-full py-3 rounded-2xl text-sm font-semibold transition-opacity"
            style={{ backgroundColor: '#FF8B5E', color: '#1A1B3A' }}
          >
            See how it went →
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
                    <span>Need a suggestion?</span>
                  </>
                )}
              </button>

              <button
                onClick={() => navigate('/results')}
                className="text-xs text-teal-chrome opacity-50 hover:opacity-80"
              >
                End conversation early
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
