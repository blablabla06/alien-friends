import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext.jsx'
import { useGameState } from '../context/GameStateContext.jsx'
import { useMusic, useMusicTrack } from '../context/MusicContext.jsx'
import { storyText, storyUi } from '../lib/alienPrototypeI18n.js'
import { saveStoryRun, endingSlug } from '../lib/alienStoryHistory.js'
import { buildAlienNpcPrompt, buildPerspectiveShiftPrompt } from '../lib/aiCharacterPrompt.js'
import { extractCleanDialogue } from '../lib/npcResponseParser.js'
import { scoreAlienResponse } from '../lib/scoringEngine.js'
import { callLLM } from '../lib/llmClient.js'
import { calculateXpGain, updateStreak } from '../lib/progressionSystem.js'
import { tickMissions } from '../lib/dailyMissions.js'
import './AlienMainPage.css'

// ── character JSON data (source of truth for narrative/AI fields) ─────────────
import miraJson      from '../data/alien-characters/mira.json'
import danielJson    from '../data/alien-characters/daniel.json'
import evanEarlyJson from '../data/alien-characters/evan-early.json'
import evanFullJson  from '../data/alien-characters/evan-full.json'
import saraJson      from '../data/alien-characters/sara.json'

// ── chapter voice clips (EN) ──────────────────────────────────────────────────
import miraVoiceEn      from '../assets/voice/main-en/mira.wav'
import evanEarlyVoiceEn from '../assets/voice/main-en/evan-early.wav'
import danielVoiceEn    from '../assets/voice/main-en/daniel.wav'
import miraVoice2En     from '../assets/voice/main-en/mira-2.wav'
import evanFullVoiceEn  from '../assets/voice/main-en/evan-full.wav'
import saraVoiceEn      from '../assets/voice/main-en/sara.wav'

// ── chapter voice clips (ZH) ──────────────────────────────────────────────────
import miraVoiceZh      from '../assets/voice/main-ch/mira.wav'
import evanEarlyVoiceZh from '../assets/voice/main-ch/evan-early.wav'
import danielVoiceZh    from '../assets/voice/main-ch/daniel.wav'
import miraVoice2Zh     from '../assets/voice/main-ch/mira-2.wav'
import evanFullVoiceZh  from '../assets/voice/main-ch/evan-full.wav'
import saraVoiceZh      from '../assets/voice/main-ch/sara.wav'

const CHAPTER_VOICE = {
  label:       { en: miraVoiceEn,      zh: miraVoiceZh },
  lunch:       { en: evanEarlyVoiceEn, zh: evanEarlyVoiceZh },
  slides:      { en: danielVoiceEn,    zh: danielVoiceZh },
  rumour:      { en: miraVoice2En,     zh: miraVoice2Zh },
  perspective: { en: evanFullVoiceEn,  zh: evanFullVoiceZh },
  meeting:     { en: saraVoiceEn,      zh: saraVoiceZh },
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

// ── scene background images ───────────────────────────────────────────────────
import bgEnding      from '../assets/backgrounds/scene-ending.png'
import bgLabel       from '../assets/backgrounds/scene-label.png'
import bgSlides      from '../assets/backgrounds/scene-slides.png'
import bgRumour      from '../assets/backgrounds/scene-rumour.png'
import bgPerspective from '../assets/backgrounds/scene-perspective.png'
import bgMeeting     from '../assets/backgrounds/scene-meeting.png'

// ── character portrait / full-body images ─────────────────────────────────────
import miraPortrait    from '../assets/characters/mira-portrait.png'
import miraFullbody    from '../assets/characters/mira-fullbody.png'
import danielPortrait  from '../assets/characters/daniel-portrait.png'
import danielFullbody  from '../assets/characters/daniel-fullbody.png'
import evanPortrait    from '../assets/characters/evan-portrait.png'
import evanFullbody    from '../assets/characters/evan-fullbody.png'
import saraPortrait    from '../assets/characters/sara-portrait.png'
import saraFullbody    from '../assets/characters/sara-fullbody.png'

// ── display-only character data (portraits, colours) ─────────────────────────
// Narrative / AI-relevant data comes exclusively from the JSON files above.
const CHARACTERS = {
  mira: {
    name: 'Mira',
    groupRole: 'Member',
    role: 'Social connector',
    revealedInfo: 'Frames Evan before he arrives',
    color: '#8A8FA3',
    text: '#1A1D29',
    portrait: miraPortrait,
    fullbody: miraFullbody,
    json: miraJson,
  },
  daniel: {
    name: 'Daniel',
    groupRole: 'Member',
    role: 'Frustrated teammate',
    revealedInfo: 'Hurt by the slide change',
    color: '#FFD166',
    text: '#2b2008',
    portrait: danielPortrait,
    fullbody: danielFullbody,
    json: danielJson,
  },
  evan: {
    name: 'Evan',
    groupRole: 'Member',
    role: 'The labelled outsider',
    revealedInfo: 'Doesn\'t know what the group already said about him',
    color: '#9B6B8C',
    text: '#1A1D29',
    portrait: evanPortrait,
    fullbody: evanFullbody,
    json: evanFullJson,
  },
  sara: {
    name: 'Sara',
    groupRole: 'Leader',
    role: 'Group leader',
    revealedInfo: 'Trying to keep the decision respectful',
    color: '#D4A574',
    text: '#2b1208',
    portrait: saraPortrait,
    fullbody: saraFullbody,
    json: saraJson,
  },
}

// ── baseline game state ───────────────────────────────────────────────────────
const BASE_SCORES = { clarity: 48, respect: 50, awareness: 46, boundary: 42 }
const BASE_STATE  = { labelPower: 34, rumour: 22, tension: 38, evanTrust: 32 }

// ── lunch outcome thresholds ──────────────────────────────────────────────────
// evanTrust delta accumulated during Chapter 2 determines didEvanJoinLunch.
// Positive cumulative delta (trust improved) → 'joined'; negative → 'declined'; near-zero → 'ambivalent'.
const LUNCH_TRUST_THRESHOLD_JOIN     =  3  // cumulative delta ≥ +3 → joined
const LUNCH_TRUST_THRESHOLD_DECLINE  = -3  // cumulative delta ≤ -3 → declined
// everything in between → 'ambivalent'

// ── multi-turn conversation config ───────────────────────────────────────────
const MAX_TURNS_PER_CHAPTER = 3

// ── scenes ────────────────────────────────────────────────────────────────────
const SCENES = [
  {
    id: 'label',
    level: 'Chapter 1: The Label Comes First',
    title: 'The Label Comes First',
    subtitle: 'Discussion room, before Evan arrives',
    speaker: 'mira',
    background: bgLabel,
    line: 'Just so you know, Evan can be quite difficult.',
    narration: 'Before you meet Evan, Mira gives you a frame. Evan is not in the room yet, but the group already has a story about him.',
    objective: 'Decide whether to accept the label or ask what actually happened.',
    choices: ['conform', 'clarify', 'avoid'],
  },
  {
    id: 'lunch',
    level: 'Chapter 2: The Invitation',
    title: 'The Invitation',
    subtitle: 'Discussion room, just after everyone else leaves',
    speaker: 'evan',
    background: bgLabel,
    line: '...Oh. Hey. You don\'t have to wait around.',
    narration: 'Everyone else has already headed out. Evan stayed behind. You\'re the only one who hasn\'t left yet — and you haven\'t actually spoken to him directly before.',
    objective: 'Decide how to approach someone the group has already labelled, before you\'ve formed your own opinion.',
    choices: ['inviteCasual', 'inviteWarm', 'inviteAssuming'],
  },
  {
    id: 'slides',
    level: 'Chapter 3: The Edited Slides',
    title: 'The Edited Slides',
    subtitle: 'Shared presentation, Slide 6',
    speaker: 'daniel',
    background: bgSlides,
    line: 'I rehearsed the old version. Then Evan changed my slide without telling me.',
    narration: 'Daniel is genuinely affected. The figures were also genuinely inconsistent. Both things can be true.',
    narrationVariants: {
      joined:     'Evan came to lunch — briefly. He left before it ended. Nobody mentioned it, but it was noticed. Then this happened.',
      ambivalent: 'Evan stayed behind when everyone left for lunch. Whether he would have come, nobody thought to ask. Then this happened.',
      declined:   'Evan didn\'t come to lunch. The group moved on without him. Then this happened.',
    },
    objective: 'Avoid the extremes: Evan did nothing wrong, or Evan is the problem.',
    fact: 'Observed fact: Evan changed Slide 6 at 11:42 PM.',
    assumption: 'Unverified claim: Evan wanted to embarrass Daniel.',
    choices: ['attack', 'defendBlindly', 'separateIssues'],
  },
  {
    id: 'rumour',
    level: 'Chapter 4: Rumour Mutation',
    title: 'Rumour Mutation',
    subtitle: 'Group chat, late night',
    speaker: 'mira',
    background: bgRumour,
    line: 'Daniel said Evan criticised him again. Honestly, it sounds like Evan thinks everyone is incompetent.',
    narration: 'The original sentence changes as it moves through the group. Emotion fills in the missing parts.',
    narrationVariants: {
      joined:     'Evan came to lunch. Mira noticed. Now she\'s in the group chat, and the sentence that started with Evan has already changed shape.',
      ambivalent: 'Evan stayed behind. Nobody knows quite what to make of that. Now it\'s late, and the group chat is still going.',
      declined:   'Evan didn\'t come to lunch. The group decided that confirmed something. Now they\'re in the chat, and the sentence has already changed shape.',
    },
    objective: 'Catch the mutation before it becomes the group belief.',
    mutation: [
      'The figures on Slide 6 are inconsistent.',
      'Evan said Daniel\'s figures are wrong.',
      'Evan criticised Daniel again.',
      'Evan thinks everyone is incompetent.',
    ],
    choices: ['repeatRumour', 'originalMessage', 'correctWording'],
  },
  {
    id: 'perspective',
    level: 'Chapter 5: Perspective Shift',
    title: 'Replay as Evan',
    subtitle: 'The same event, different information',
    speaker: 'evan',
    background: bgPerspective,
    line: 'I saw the numbers were inconsistent. The deadline was tomorrow. I thought fixing it directly was better than waiting.',
    narration: 'From Evan\'s side, he did not know Daniel rehearsed the old slide, and already expected the group to judge him.',
    objective: 'Understanding missing context does not erase impact. Decide what to ask next.',
    perspective: true,
    fact: 'Missing context: Evan corrected a real error.',
    assumption: 'Still true: Evan changed someone else\'s work without warning.',
    choices: ['accuseEvan', 'askEvan', 'setRule'],
  },
  {
    id: 'meeting',
    level: 'Chapter 6: Final Meeting',
    title: 'Who Made the Alien?',
    subtitle: 'Submission day, group decision',
    speaker: 'sara',
    background: bgMeeting,
    line: 'We need to decide whether Evan stays on the project. I just want everyone to be respectful.',
    narration: 'Daniel needs accountability. Evan needs direct feedback. Mira needs to stop amplifying labels. Sara needs an actual decision.',
    objective: 'Write or choose a final response that creates a workable boundary.',
    final: true,
    choices: ['meetingRemove', 'meetingBoundary', 'meetingSupport'],
  },
]

// ── helpers ───────────────────────────────────────────────────────────────────
function clamp(value) { return Math.max(0, Math.min(100, value)) }

function applyDelta(target, delta) {
  const next = { ...target }
  for (const [key, value] of Object.entries(delta ?? {})) {
    next[key] = clamp((next[key] ?? 0) + value)
  }
  return next
}

function getAlienationPercent(state) {
  const { labelPower = 0, rumour = 0, tension = 0, evanTrust = 50 } = state ?? {}
  const socialPressure = labelPower * 0.42 + rumour * 0.36 + tension * 0.22
  const trustRelief = Math.max(0, evanTrust - 35) * 0.35
  return clamp(Math.round(socialPressure - trustRelief + 12))
}

function getAlienationStage(percent, isPerspective = false) {
  if (isPerspective) {
    return {
      id: 'cleared',
      zh: '视角切换：标签减弱',
      en: 'Perspective shift: label fading',
    }
  }
  if (percent >= 75) {
    return { id: 'alienated', zh: '已被群体异化', en: 'Alienated by the group' }
  }
  if (percent >= 50) {
    return { id: 'distorted', zh: '逐渐被外星人化', en: 'Becoming alienated' }
  }
  if (percent >= 25) {
    return { id: 'labelled', zh: '被标签化中', en: 'Being labelled' }
  }
  return { id: 'normal', zh: '正常看见', en: 'Seen normally' }
}
/**
 * Convert LLM alien score dimensions into the game's hidden state deltas.
 * The LLM returns absolute quality scores; we translate them into
 * meaningful signed deltas for labelPower, rumour, tension, evanTrust.
 */
function deriveStateDeltasFromScore(scoreResult) {
  const { clarity = 50, respect = 50, awareness = 50, boundary = 50 } = scoreResult
  // High clarity/awareness → less label power and rumour
  // High respect → less tension, more evanTrust
  // High boundary → less tension
  //
  // Scale factor 0.06 keeps per-turn deltas gentle (max ~±3 per dimension)
  // so hidden state changes meaningfully over 18 turns rather than saturating
  // after the first chapter. Full formula before scaling would be:
  //   labelPower raw ≈ (50-awareness)*0.4 + (50-clarity)*0.2  → max ±30
  //   After ×0.06 → max ±1.8, rounded → ±2 per turn.
  const SCALE = 0.06
  const labelPower = Math.round(((50 - awareness) * 0.4 + (50 - clarity)   * 0.2) * SCALE)
  const rumour     = Math.round(((50 - clarity)   * 0.4 + (50 - awareness) * 0.2) * SCALE)
  const tension    = Math.round(((50 - respect)   * 0.3 + (50 - boundary)  * 0.3) * SCALE)
  const evanTrust  = Math.round(((respect - 50)   * 0.4 + (awareness - 50) * 0.3) * SCALE)
  return { labelPower, rumour, tension, evanTrust }
}

/**
 * Returns a bilingual NPC "thinking pause" fallback line used whenever the
 * real NPC response cannot be recovered (timeout, parse failure, plain-narrative
 * fallback, LLM error).  Centralised here so every code path uses the same text.
 */
function getFallbackNpcText(characterName, lang) {
  return lang === 'zh'
    ? `${characterName}停顿了一下，似乎在思考你说的话。`
    : `${characterName} pauses, considering your words.`
}

/**
 * Last-resort fallback: model abandoned JSON entirely and returned free narrative prose.
 *
 * Parsing order (important — prevents bracket/quote content from interfering):
 *   1. Extract all parenthetical segments （…）/ (…) → npcAction
 *   2. Strip those segments from the text
 *   3. In the remaining text, extract double-quoted "…" or paired single-quoted '…'
 *      spans as spoken dialogue → npcResponse
 *   4. If no quotes found, the whole remaining text is the dialogue
 *
 * Single-quote handling: a pair of single quotes surrounding ≥1 character is
 * treated as a dialogue delimiter. Apostrophes in contractions (don't, I'm) are
 * naturally excluded because they are never balanced pairs around a phrase.
 */
function extractFromPlainNarrative(raw) {
  // Step 1 & 2: extract bracket content as actions, remove from text
  const actionMatches = [...raw.matchAll(/[（(]([^）)]+)[）)]/g)].map(m => m[1])
  const combinedAction = actionMatches.length ? actionMatches.join(' ') : null
  const withoutActions = raw.replace(/[（(][^）)]+[）)]/g, '').trim()

  // Step 3: collect double-quoted and paired single-quoted spans
  // Double-quote: "…"
  // Single-quote: only treat as dialogue delimiter when the opening ' is NOT
  //   immediately preceded by a word character (i.e. not a contraction apostrophe
  //   like don't / I'm).  Uses a lookbehind (?<!\w) for the opening quote and
  //   requires at least 2 characters inside to skip lone apostrophes.
  const quoteRe = /"([^"]+)"|(?<!\w)'([^']{2,})'/g
  const quoteMatches = []
  let m
  while ((m = quoteRe.exec(withoutActions)) !== null) {
    const spoken = (m[1] ?? m[2]).trim()
    if (spoken) quoteMatches.push(spoken)
  }

  // Step 4: join quoted spans, or fall back to entire remaining text
  const dialogue = quoteMatches.length > 0
    ? quoteMatches.join(' ')
    : withoutActions || raw.trim()

  return { npcResponse: dialogue, npcAction: combinedAction }
}

function parseAlienNpcJson(raw) {
  if (!raw) return null
  let text = raw.trim()

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()

  // ── Plain-narrative fallback: no '{' at all means model abandoned JSON entirely ──
  // Check BEFORE attempting any JSON extraction. Salvage real AI response rather
  // than falling back to generic placeholder text.
  if (!text.includes('{')) {
    console.warn('[parseAlienNpcJson] No JSON structure detected — model returned plain narrative. Extracting via plain-narrative fallback.')
    return extractFromPlainNarrative(text)
  }

  // Extract the outermost {...} block
  const first = text.indexOf('{')
  const last  = text.lastIndexOf('}')
  if (first !== -1 && last > first) text = text.slice(first, last + 1)

  // Sanitise common LLM mistakes that invalidate JSON:
  // 1. moodShift written as "better" | "worse" | "neutral" with literal pipes
  text = text.replace(/"moodShift"\s*:\s*"[^"]*"\s*\|[^,}\n]*/g, (match) => {
    const valueMatch = match.match(/"moodShift"\s*:\s*"([^"]*)"/)
    return valueMatch ? `"moodShift": "${valueMatch[1]}"` : '"moodShift": "neutral"'
  })
  // 2. Unquoted null written as the string "null" → keep as-is, JSON.parse handles it
  // 3. Trailing commas before closing brace/bracket
  text = text.replace(/,\s*([}\]])/g, '$1')

  try {
    return JSON.parse(text)
  } catch {
    // Last-resort: extract npcResponse value via regex so at least the spoken
    // line is recoverable even if the surrounding JSON is malformed.
    const responseMatch = text.match(/"npcResponse"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
    const actionMatch   = text.match(/"npcAction"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
    if (responseMatch) {
      return {
        npcResponse: responseMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
        npcAction:   actionMatch ? actionMatch[1].replace(/\\"/g, '"') : null,
      }
    }
    return null
  }
}

function getEnding(scores, hidden) {
  const overall = Math.round(
    scores.clarity  * 0.28 +
    scores.respect  * 0.24 +
    scores.awareness * 0.28 +
    scores.boundary * 0.20,
  )
  if (hidden.labelPower >= 70 || hidden.rumour >= 70) {
    return {
      name: 'Exclusion',
      quote: 'A group that needs an alien will eventually create another one.',
      summary: 'Evan is removed. The group feels relieved, but the pattern that created the label remains.',
      overall,
      badge: 'Rumour Witness',
    }
  }
  if (scores.boundary >= 70 && scores.awareness >= 62) {
    return {
      name: 'Healthy Boundary',
      quote: 'Understanding does not remove accountability.',
      summary: 'The team keeps the issue specific: Evan must notify changes, and the group must stop using personal labels.',
      overall,
      badge: 'Boundary Setter',
    }
  }
  if (overall >= 66) {
    return {
      name: 'Mutual Adjustment',
      quote: 'Belonging does not require sameness.',
      summary: 'Nobody becomes best friends, but the team creates enough trust and structure to keep working.',
      overall,
      badge: 'Perspective Builder',
    }
  }
  return {
    name: 'Forced Harmony',
    quote: 'Silence is not resolution.',
    summary: 'The meeting ends politely, but the real conflict continues underneath the surface.',
    overall,
    badge: 'First Run Complete',
  }
}

function buildMemoryEntry(scene, playerText, feedback, npcReaction, nextScores, nextHidden, turnIndex) {
  return {
    sceneId: scene.id,
    turnIndex,
    level: scene.level,
    title: scene.title,
    subtitle: scene.subtitle,
    speaker: scene.speaker,
    narration: scene.narration,
    line: scene.line,
    objective: scene.objective,
    fact: scene.fact,
    assumption: scene.assumption,
    mutation: scene.mutation,
    choiceLabel: `Turn ${turnIndex + 1}`,
    choiceText: playerText,
    npcReaction,
    feedback,
    scores: nextScores,
    state: nextHidden,
  }
}

// ── localStorage persistence ──────────────────────────────────────────────────
// Bumped to v3 to add turnCount + chapterHistory without corrupting v2 saves.
const LS_KEY = 'alienStory_v3'

function loadSavedState() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (
      typeof saved.sceneIndex === 'number' &&
      saved.scores && saved.hidden && Array.isArray(saved.choices)
    ) return saved
    return null
  } catch { return null }
}

// ── child components ──────────────────────────────────────────────────────────

function GroupRoster({ currentSpeaker, revealedIds, lang, ui, alienFilterIntensity, alienationPercent, alienationPulse, isPerspective }) {
  return (
    <section className="af-panel af-roster-panel">
      <h2>{ui.groupNotes}</h2>
      <div className="af-roster-list">
        {Object.entries(CHARACTERS).map(([id, character]) => {
          const revealed = revealedIds.has(id)
          const active   = id === currentSpeaker
          const isEvan   = id === 'evan'
          const stage    = getAlienationStage(alienationPercent, isPerspective && isEvan)

          const showRosterAlienation = isEvan && alienationPercent > 8 && !isPerspective
          const showPerspectiveCleared = isEvan && isPerspective
          const showAlienationMeter = isEvan && (showRosterAlienation || showPerspectiveCleared)
          const displayPercent = showPerspectiveCleared
            ? Math.max(8, Math.round(alienationPercent * 0.24))
            : alienationPercent
          const rosterIntensity = showRosterAlienation
            ? Math.max(0.52, alienFilterIntensity)
            : showPerspectiveCleared
              ? 0.24
              : alienFilterIntensity
          const shift = isEvan && alienationPulse && !isPerspective ? alienationPulse.delta : 0
          const shiftText = shift > 0 ? `+${shift}` : `${shift}`

          return (
            <div
              className={`af-roster-item ${active ? 'active' : ''} ${showRosterAlienation ? `alienating alien-stage-${stage.id}` : ''} ${showPerspectiveCleared ? 'alienation-cleared' : ''}`}
              key={id}
              style={isEvan ? {
                '--alien-intensity': rosterIntensity.toFixed(3),
                '--alien-progress': `${displayPercent}%`,
              } : undefined}
            >
              <div
                className={`af-character-face ${showRosterAlienation ? 'alienating' : ''} ${showPerspectiveCleared ? 'alienation-cleared' : ''}`}
                style={{ borderColor: character.color }}
              >
                <img src={character.portrait} alt={character.name} />
              </div>
              <div className="af-roster-copy">
                <div className="af-roster-topline">
                  <span className="af-character-name">{character.name}</span>
                  <span className="af-roster-tag">{storyText(character.groupRole, lang)}</span>
                </div>
                <div className={`af-roster-detail ${revealed ? 'revealed' : ''}`}>
                  {revealed ? storyText(character.revealedInfo, lang) : ui.noDetailYet}
                </div>
                {showAlienationMeter && (
                  <div className={`af-roster-alien-block ${showPerspectiveCleared ? 'cleared' : ''}`}>
                    <div className={`af-roster-alien-status af-roster-alien-status-${stage.id}`}>
                      <span className="af-roster-alien-dot" />
                      <span>{lang === 'zh' ? stage.zh : stage.en}</span>
                      {shift !== 0 && (
                        <span className={`af-roster-alien-shift ${shift > 0 ? 'up' : 'down'}`} key={alienationPulse.id}>
                          {shiftText}
                        </span>
                      )}
                    </div>
                    <div className="af-roster-alien-meter">
                      <div className="af-roster-alien-meter-row">
                        <span>{lang === 'zh' ? '异化程度' : 'Alienation'}</span>
                        <strong>{showPerspectiveCleared ? (lang === 'zh' ? '减弱中' : 'fading') : `${alienationPercent}%`}</strong>
                      </div>
                      <div className="af-roster-alien-track">
                        <div className="af-roster-alien-fill" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {active && <span className="af-speaking-dot">{ui.speakingNow}</span>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
function Meter({ label, value, color }) {
  return (
    <div className="af-meter">
      <div className="af-meter-row">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="af-meter-track">
        <div className="af-meter-fill" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function AlienMainPage() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const { state: gsState, actions: gsActions } = useGameState()
  const ui = storyUi[lang] ?? storyUi.en
  const p  = value => storyText(value, lang)

  // ── state — restored from localStorage if available ───────────────────────
  const saved = useMemo(() => loadSavedState(), [])

  const [sceneIndex,      setSceneIndex]      = useState(saved?.sceneIndex      ?? 0)
  const [scores,          setScores]          = useState(saved?.scores          ?? BASE_SCORES)
  const [hidden,          setHidden]          = useState(saved?.hidden          ?? BASE_STATE)
  const [choices,         setChoices]         = useState(saved?.choices         ?? [])
  const [lastFeedback,    setLastFeedback]    = useState(saved?.lastFeedback    ?? '')
  const [npcReactions,    setNpcReactions]    = useState(saved?.npcReactions    ?? {})
  const [finalText,       setFinalText]       = useState('')
  const [showReport,      setShowReport]      = useState(saved?.showReport      ?? false)
  const [showEnding,      setShowEnding]      = useState(saved?.showEnding      ?? false)
  const [isLoading,       setIsLoading]       = useState(false)
  const [loadingFor,      setLoadingFor]      = useState(null) // suggestedReply index, 'freeText', or 'init'
  const [alienationPulse, setAlienationPulse] = useState(null) // { id, delta } for the Evan roster feedback

  // ── Chapter 2 lunch outcome — derived once when the lunch chapter ends ────
  // 'joined' | 'ambivalent' | 'declined' | null (not yet determined)
  const [didEvanJoinLunch, setDidEvanJoinLunch] = useState(saved?.didEvanJoinLunch ?? null)

  // ── multi-turn conversation state ─────────────────────────────────────────
  // turnCount: how many player turns have been completed in the current chapter
  // chapterMessages: live conversation for the current chapter (NPC + player bubbles)
  // suggestedReplies: AI-generated options for the next player turn
  const [turnCount,        setTurnCount]        = useState(saved?.turnCount        ?? 0)
  const [chapterMessages,  setChapterMessages]  = useState(saved?.chapterMessages  ?? [])
  const [suggestedReplies, setSuggestedReplies] = useState(saved?.suggestedReplies ?? [])
  // initSuggestionsLoading: true while fetching the very first turn's suggestions
  const [initLoading,      setInitLoading]      = useState(false)
  // awaitingChapterAdvance: true after the final NPC reply is shown — waiting for player to click Continue
  const [awaitingChapterAdvance, setAwaitingChapterAdvance] = useState(saved?.awaitingChapterAdvance ?? false)

  // ── voice mute state — persisted to localStorage ─────────────────────────
  const [isMuted, setIsMuted] = useState(() => {
    try { return localStorage.getItem('af_voice_muted') === 'true' } catch { return false }
  })
  const audioRef = useRef(null) // tracks the currently playing HTMLAudioElement

  // ── background music ─────────────────────────────────────────────────────
  const { isMusicMuted, toggleMusicMute } = useMusic()
  useMusicTrack('main')

  // One AbortController per turn — replaces all manual ref/timeout comparisons.
  const abortRef = useRef(null)

  // Ref for the inner scrollable dialogue container — used to auto-scroll to newest message
  const dialogueScrollRef = useRef(null)

  const scene   = SCENES[sceneIndex]
  const speaker = CHARACTERS[scene.speaker]
  const ending  = useMemo(() => getEnding(scores, hidden), [scores, hidden])
  const revealedCharacterIds = useMemo(
    () => new Set(SCENES.slice(0, sceneIndex + 1).map(s => s.speaker)),
    [sceneIndex],
  )

  const alienationPercent = useMemo(() => getAlienationPercent(hidden), [hidden])
  const alienationStage = useMemo(
    () => getAlienationStage(alienationPercent, !!scene.perspective),
    [alienationPercent, scene.perspective],
  )

  // Main-scene filter is disabled in Evan's perspective, but the roster keeps
  // showing a cleared/fading state so players notice the contrast.
  const alienFilterIntensity = useMemo(() => {
    if (scene.perspective) return 0
    return Math.min(1, Math.max(0, alienationPercent / 100))
  }, [alienationPercent, scene.perspective])
  // ── auto-scroll dialogue to the newest message ───────────────────────────
  useEffect(() => {
    const el = dialogueScrollRef.current
    if (!el) return
    // Small rAF delay so the DOM has painted the new bubble before we scroll
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [chapterMessages, isLoading])
  useEffect(() => {
    if (!alienationPulse) return
    const timer = setTimeout(() => setAlienationPulse(null), 2200)
    return () => clearTimeout(timer)
  }, [alienationPulse])

  // ── dialogue history for the NPC prompt (from chapterMessages) ───────────
  // Converts the live chapterMessages array into the {role, text, action} format
  // expected by buildAlienNpcPrompt. action is preserved so that the prompt
  // builder can reconstruct a proper JSON assistant message (avoiding the
  // "bad example" effect where a plain-text history message teaches the model
  // to skip the JSON wrapper on subsequent turns).
  const currentSceneHistory = useMemo(() => {
    return chapterMessages
      .filter(m => m.role === 'npc' || m.role === 'user')
      .map(m => ({ role: m.role, text: m.text, action: m.action ?? null }))
  }, [chapterMessages])

  // ── auto-play chapter opening voice clip when a new scene is entered ────────
  // Fires whenever sceneIndex or lang changes (and not during report/ending views).
  // Stops any previously playing clip first so audio never overlaps.
  useEffect(() => {
    if (showReport || showEnding) return
    const src = CHAPTER_VOICE[scene.id]?.[lang]
    if (!src) return

    // Stop the previous clip immediately
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    if (isMuted) return

    audioRef.current = playVoiceClip(src)
  }, [sceneIndex, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── persist to localStorage on every relevant state change ──────────────
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        sceneIndex, scores, hidden, choices, lastFeedback, npcReactions, showReport, showEnding,
        turnCount, chapterMessages, suggestedReplies, awaitingChapterAdvance, didEvanJoinLunch,
      }))
    } catch { /* storage full or private-mode — fail silently */ }
  }, [sceneIndex, scores, hidden, choices, lastFeedback, npcReactions, showReport, showEnding,
      turnCount, chapterMessages, suggestedReplies, awaitingChapterAdvance, didEvanJoinLunch])

  // ── save to GameStateContext when ending is revealed — exactly once ─────────
  const didSaveEnding = useRef(false)
  useEffect(() => {
    if (!showEnding || didSaveEnding.current) return
    didSaveEnding.current = true

    const endingSnapshot = getEnding(scores, hidden)

    // Map story scores → Practice Mode dimension names
    const dimAverages = {
      clarity:    scores.clarity,
      politeness: scores.respect,
      empathy:    scores.awareness,
      expression: scores.boundary,
    }
    const composite = endingSnapshot.overall

    // Pick highest-scored npcReaction as the representative quote
    // (falls back to the ending's own quote if no NPC reactions recorded)
    const bestQuote = (() => {
      const withReactions = choices.filter(c => c.npcReaction)
      if (!withReactions.length) return endingSnapshot.quote
      const best = withReactions.reduce((a, b) => {
        const aScore = Object.values(a.scores ?? {}).reduce((s, v) => s + v, 0)
        const bScore = Object.values(b.scores ?? {}).reduce((s, v) => s + v, 0)
        return bScore > aScore ? b : a
      })
      return best.npcReaction
    })()

    const summary = {
      scenarioId:     'alien-main-story',
      scenarioTitle:  `Alien, Apparently — ${endingSnapshot.name}`,
      difficultyTier: 'hard',
      playedAt:       new Date().toISOString(),
      composite,
      dimAverages,
      // turnLog mirrors Practice Mode's structure: one entry per scene turn
      turnLog: choices.map(c => ({
        clarity:    c.scores?.clarity    ?? 0,
        politeness: c.scores?.respect    ?? 0,
        empathy:    c.scores?.awareness  ?? 0,
        expression: c.scores?.boundary   ?? 0,
        composite:  Math.round(
          (c.scores?.clarity ?? 0) * 0.28 +
          (c.scores?.respect ?? 0) * 0.24 +
          (c.scores?.awareness ?? 0) * 0.28 +
          (c.scores?.boundary ?? 0) * 0.20,
        ),
        text:       bestQuote,
      })),
    }

    // 1. Persist session entry
    gsActions.saveAlienSession(summary)

    // 1b. Save run to ending-collection / history (alienStory_history_v1)
    saveStoryRun({
      endingId:   endingSlug(endingSnapshot.name),
      endingName: endingSnapshot.name,
      overall:    endingSnapshot.overall,
      badge:      endingSnapshot.badge,
      summary:    endingSnapshot.summary,
      quote:      endingSnapshot.quote,
      scores,
      hidden,
      choices,
      playedAt:   new Date().toISOString(),
    })

    // 2. Award XP (same formula as Practice Mode — hard tier)
    const xpGain = calculateXpGain(composite, 'hard')
    gsActions.addXp(xpGain)

    // 3. Update streak
    const { streak: newStreak, date } = updateStreak(gsState.lastPlayedDate, gsState.streak)
    gsActions.setStreak(newStreak, date)

    // 4. Mark as completed scenario (for try_new_scenario mission + completedScenarios list)
    gsActions.completeScenario('alien-main-story')

    // 5. Tick missions — same two-event pattern as ResultsScreen
    const isNewScenario = !gsState.completedScenarios.includes('alien-main-story')
    const scenariosCompletedToday = (gsState.dailyMissions.scenariosCompletedToday ?? 0) + 1

    const scenarioEvent = {
      type: 'SCENARIO_COMPLETE',
      scenarioId: 'alien-main-story',
      tier: 'hard',
      isNewScenario,
      connectionMood: 50 + composite * 0.2, // proxy — story has no live mood meter
      scenariosCompletedToday,
    }
    const scoreEvent = {
      type: 'SCORE_RECORDED',
      scores: { ...dimAverages, composite },
    }

    const fired = [
      ...tickMissions(gsState.dailyMissions.missions, scenarioEvent),
      ...tickMissions(gsState.dailyMissions.missions, scoreEvent),
    ]
    const uniqueFired = [...new Set(fired)]

    gsActions.tickMissions(scenarioEvent)
    gsActions.tickMissions(scoreEvent)

    if (uniqueFired.length > 0) {
      const missionXp = uniqueFired.reduce((sum, id) => {
        const m = gsState.dailyMissions.missions.find(m => m.def.id === id)
        return sum + (m?.def.xpReward ?? 0)
      }, 0)
      if (missionXp > 0) gsActions.addXp(missionXp)
    }
  }, [showEnding]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── neutral fallback values — used when LLM times out or errors ───────────
  const FALLBACK_SCORE_DELTAS = { clarity: 2, respect: 2, awareness: 2, boundary: 2 }
  const FALLBACK_STATE_DELTAS = { labelPower: 0, rumour: 0, tension: 0, evanTrust: 0 }

  // ── fetch initial suggested replies for Turn 1 ────────────────────────────
  // Called once per chapter when turnCount === 0 and suggestedReplies are empty.
  // Uses a minimal "seed" prompt (just the authored opening line as context) so
  // the LLM can generate 3 style-matched suggestions without a prior player turn.
  const fetchInitialSuggestions = useCallback(async (controller) => {
    setInitLoading(true)

    // Fallback suggestions used when the fetch times out, errors, or returns unusable JSON
    // Bilingual — always matches the current game language so fallback text is never mismatched
    const fallbackSuggestions = lang === 'zh'
      ? [
          { line: '能跟我说说发生了什么吗？', style: 'clarifying' },
          { line: '听起来真的很让人沮丧。', style: 'warm' },
          { line: '我们一起想办法解决吧。', style: 'direct' },
        ]
      : [
          { line: 'Can you tell me more about what happened?', style: 'clarifying' },
          { line: "I hear you — that sounds really frustrating.", style: 'warm' },
          { line: "Let's try to figure this out together.", style: 'direct' },
        ]

    // 20-second timeout — raised from 12 s to match handleTurn and avoid premature fallback
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 20_000)

    try {
      // For Evan in the lunch scene, use the pre-slides character definition
      // so that slides-incident details never enter Turn 1 suggestions.
      const charJson       = (scene.id === 'lunch' && scene.speaker === 'evan') ? evanEarlyJson : speaker.json
      const isPerspective  = scene.perspective === true
      // Seed the history with the authored opening line so the LLM has context
      const seedHistory    = [{ role: 'npc', text: scene.line }]
      // isFinalTurn=false — we always need suggestions for Turn 1
      const npcMessages    = buildAlienNpcPrompt(
        charJson, scene, seedHistory, '__SUGGESTIONS_ONLY__', hidden, isPerspective, lang, false, sceneIndex,
      )
      // Patch the last user message to ask for suggestions only.
      // The instruction is bilingual — it must match lang so the model produces
      // replies in the correct language even before the player has typed anything.
      const seedPromptContent = lang === 'zh'
        ? `NPC刚刚说了："${scene.line}"\n请生成三条玩家接下来可以说的建议回复。` +
          `必须用简体中文写每条建议的文字。` +
          `只返回包含 suggestedReplies 的 JSON，npcResponse 设为空字符串 ""。`
        : `The NPC just said: "${scene.line}"\nGenerate the three suggested replies the player could say next. ` +
          `Return ONLY the JSON with suggestedReplies — npcResponse should be an empty string "".`
      const patchedMessages = npcMessages.map((m, i) =>
        i === npcMessages.length - 1
          ? { ...m, content: seedPromptContent }
          : m,
      )
      // ── Timing diagnostic: measure actual LLM round-trip for initial suggestions ──
      const _suggStartTime = Date.now()
      const result = await callLLM(patchedMessages, controller.signal)
      console.log(`[AlienMainPage] fetchInitialSuggestions took ${Date.now() - _suggStartTime}ms (scene: ${scene.id}, lang: ${lang})`)
      clearTimeout(timeoutId)
      if (controller.signal.aborted) {
        // Only apply fallback if it was OUR timeout, not a superseded stale call
        if (timedOut) {
          console.warn('[AlienMainPage] Initial suggestions timed out, using fallback.')
          setSuggestedReplies(fallbackSuggestions)
        }
        return
      }
      if (result.ok) {
        const parsed = parseAlienNpcJson(result.text)
        if (Array.isArray(parsed?.suggestedReplies) && parsed.suggestedReplies.length) {
          setSuggestedReplies(parsed.suggestedReplies)
        } else {
          // Parse succeeded but no usable suggestions — use fallback
          setSuggestedReplies(fallbackSuggestions)
        }
      } else {
        setSuggestedReplies(fallbackSuggestions)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      if (timedOut) {
        console.warn('[AlienMainPage] Initial suggestions timed out, using fallback.')
        setSuggestedReplies(fallbackSuggestions)
        return
      }
      if (err?.name === 'AbortError' || controller.signal.aborted) return

      // ── DIAGNOSTIC: full error dump for fetchInitialSuggestions ──
      console.error('[AlienMainPage] *** fetchInitialSuggestions EXCEPTION ***')
      console.error('  scene.id:', scene.id, '| scene.speaker:', scene.speaker, '| sceneIndex:', sceneIndex)
      console.error('  speaker.json (truthy?):', !!speaker?.json, '| id:', speaker?.json?.id ?? 'UNDEFINED')
      console.error('  err.name:', err?.name, '| err.message:', err?.message)
      console.error('  err stack:', err?.stack)
      console.error('  full err object:', err)

      setSuggestedReplies(fallbackSuggestions)
    } finally {
      setInitLoading(false)
    }
  }, [scene, speaker, hidden, lang, sceneIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── trigger initial suggestions when entering a new chapter ──────────────
  useEffect(() => {
    if (showReport || showEnding) return
    // Only fetch when we haven't yet and there's no loading in progress
    if (turnCount === 0 && suggestedReplies.length === 0 && !initLoading && !isLoading) {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      fetchInitialSuggestions(controller)
    }
  }, [sceneIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── core turn completion — single guarded path, called exactly once ────────
  // playerText: what the player said
  // npcReaction: NPC's spoken dialogue text
  // npcAction: optional third-person physical/emotional action (scene narration, may be null)
  // nextSuggestedReplies: AI suggestions for the NEXT turn (null on final turn)
  // scoreDeltas / stateDeltas: quality measurements for this turn
  // isFinalTurn: true when turnCount+1 >= MAX_TURNS_PER_CHAPTER
  const completeTurn = useCallback((
    playerText, feedback, npcReaction, npcAction, nextSuggestedReplies, scoreDeltas, stateDeltas, isFinalTurn, replyMeta = null,
  ) => {
    const nextScores  = applyDelta(scores, scoreDeltas ?? FALLBACK_SCORE_DELTAS)
    const nextHidden  = applyDelta(hidden,  stateDeltas ?? FALLBACK_STATE_DELTAS)
    const nextTurn    = turnCount + 1
    const alienationDelta = getAlienationPercent(nextHidden) - getAlienationPercent(hidden)

    setScores(nextScores)
    setHidden(nextHidden)
    setLastFeedback(feedback)
    setFinalText('')
    setIsLoading(false)
    setLoadingFor(null)
    if (alienationDelta !== 0) {
      setAlienationPulse({ id: Date.now(), delta: alienationDelta })
    }

    // Append player bubble + NPC response to chapterMessages.
    // npcAction (third-person narration) is stored on the message object separately
    // from the spoken text so the renderer can display them in different locations.
    const userMsg = { role: 'user', text: playerText }
    setChapterMessages(prev => [
      ...prev,
      userMsg,
      ...(npcReaction ? [{ role: 'npc', text: npcReaction, action: npcAction ?? null }] : []),
    ])

    if (npcReaction) {
      setNpcReactions(prev => ({ ...prev, [scene.id + '_turn' + nextTurn]: npcReaction }))
    }

    if (isFinalTurn) {
      // Record a single memory entry for this chapter (summary of the final turn)
      setChoices(prev => [
        ...prev,
        buildMemoryEntry(scene, playerText, feedback, npcReaction, nextScores, nextHidden, nextTurn - 1),
      ])
      // Clear suggestions but keep chapterMessages so the NPC's final reply stays visible.
      // The actual chapter transition fires only when the player clicks Continue.
      setSuggestedReplies([])
      setAwaitingChapterAdvance(true)
    } else {
      // Mid-chapter: update suggestions and increment turn count
      setSuggestedReplies(nextSuggestedReplies ?? [])
      setTurnCount(nextTurn)
    }
  }, [scores, hidden, scene, sceneIndex, turnCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── advance chapter — fires when player clicks "Continue" after final NPC reply ──
  const advanceChapter = useCallback(() => {
    setAwaitingChapterAdvance(false)
    setTurnCount(0)
    setChapterMessages([])

    // When leaving Chapter 2 (lunch), compute the lunch outcome from evanTrust delta.
    // hidden.evanTrust at this point reflects all deltas accumulated so far, including Ch2.
    // We compare against BASE_STATE.evanTrust to get the cumulative delta since game start.
    if (sceneIndex === 1) { // lunch scene index
      const evanTrustDelta = hidden.evanTrust - BASE_STATE.evanTrust
      const outcome =
        evanTrustDelta >= LUNCH_TRUST_THRESHOLD_JOIN    ? 'joined'
        : evanTrustDelta <= LUNCH_TRUST_THRESHOLD_DECLINE ? 'declined'
        : 'ambivalent'
      setDidEvanJoinLunch(outcome)
    }

    if (sceneIndex >= SCENES.length - 1) {
      setShowReport(true)
    } else {
      setSceneIndex(prev => prev + 1)
    }
  }, [sceneIndex, hidden])

  // ── single turn handler — suggested reply and free text go here ────────────
  const handleTurn = useCallback(async (playerText, loadingKey, replyMeta = null) => {
    // Cancel any in-flight request from a previous (stale) turn
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setLoadingFor(loadingKey)

    const nextTurnCount = turnCount + 1
    const isFinalTurn   = nextTurnCount >= MAX_TURNS_PER_CHAPTER

    // Generic bilingual fallback replies — used whenever suggestedReplies cannot be
    // extracted from the model response (plain-narrative fallback, timeout, parse failure).
    // Only meaningful on non-final turns; final turn never needs suggestions.
    // Randomly sample 3 from a pool of 6 so the player doesn't see identical options
    // every time the fallback fires.
    const genericFallbackReplies = (() => {
      if (isFinalTurn) return []
      const pool = lang === 'zh'
        ? [
            { text: '能再多说说吗？', style: 'clarifying' },
            { text: '我明白你的意思了。', style: 'warm' },
            { text: '那我们该怎么办？', style: 'direct' },
            { text: '你现在感觉怎么样？', style: 'warm' },
            { text: '我想更了解你的想法。', style: 'clarifying' },
            { text: '我们可以一起想想办法。', style: 'direct' },
          ]
        : [
            { text: 'Can you tell me more about that?', style: 'clarifying' },
            { text: 'I understand what you mean.', style: 'warm' },
            { text: 'So what should we do next?', style: 'direct' },
            { text: 'How are you feeling about this?', style: 'warm' },
            { text: "I'd like to understand your perspective better.", style: 'clarifying' },
            { text: "Let's figure this out together.", style: 'direct' },
          ]
      // Fisher-Yates shuffle, take first 3
      const shuffled = [...pool]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled.slice(0, 3)
    })()

    // ── Fallback suggestions patch-up ─────────────────────────────────────────
    // When the main NPC response came back as plain-narrative (no JSON wrapper),
    // suggestedReplies will be missing. Before giving up on AI-generated suggestions,
    // we fire one lightweight "suggestions only" request, reusing the same prompt
    // structure as fetchInitialSuggestions but scoped to the player's actual message.
    // Timeout: 7 s — short enough that a failure doesn't visibly delay the turn.
    const fetchFallbackSuggestions = async (currentPlayerText) => {
      const suggController = new AbortController()
      const suggTimeoutId  = setTimeout(() => suggController.abort(), 7_000)
      try {
        const charJson      = (scene.id === 'lunch' && scene.speaker === 'evan') ? evanEarlyJson : speaker.json
        const isPerspective = scene.perspective === true
        const baseMessages  = buildAlienNpcPrompt(
          charJson, scene, currentSceneHistory, currentPlayerText,
          hidden, isPerspective, lang, false, sceneIndex,
        )
        const patchContent = lang === 'zh'
          ? `玩家刚刚说了："${currentPlayerText}"\n请根据对话上下文，生成三条玩家接下来可以说的建议回复。` +
            `必须用简体中文写每条建议的文字。` +
            `只返回包含 suggestedReplies 的 JSON，npcAction 和 npcResponse 均设为空字符串 ""。`
          : `The player just said: "${currentPlayerText}"\nBased on the conversation so far, generate three suggested replies the player could say next. ` +
            `Return ONLY the JSON with suggestedReplies — set npcAction and npcResponse to empty strings "".`
        const patchedMessages = baseMessages.map((m, i) =>
          i === baseMessages.length - 1 ? { ...m, content: patchContent } : m,
        )
        const _t0     = Date.now()
        const result  = await callLLM(patchedMessages, suggController.signal)
        clearTimeout(suggTimeoutId)
        console.log(`[AlienMainPage] fetchFallbackSuggestions took ${Date.now() - _t0}ms`)
        if (result.ok) {
          const parsed = parseAlienNpcJson(result.text)
          if (Array.isArray(parsed?.suggestedReplies) && parsed.suggestedReplies.length) {
            console.log('[AlienMainPage] fetchFallbackSuggestions: AI suggestions retrieved successfully.')
            return parsed.suggestedReplies
          }
        }
      } catch (err) {
        clearTimeout(suggTimeoutId)
        if (err?.name !== 'AbortError') {
          console.warn('[AlienMainPage] fetchFallbackSuggestions error:', err?.message)
        }
      }
      console.warn('[AlienMainPage] fetchFallbackSuggestions failed or timed out — using genericFallbackReplies.')
      return null  // caller will substitute genericFallbackReplies
    }

    // timedOut distinguishes "our own 18s timeout fired" from "a newer turn aborted this stale one".
    // Only when timedOut=true must we still call completeTurn() so the UI always unfreezes.
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 18_000)

    try {
      // For Evan in the lunch scene, use the pre-slides character definition
      // so that slides-incident details never leak into his Chapter 2 dialogue.
      const charJson      = (scene.id === 'lunch' && scene.speaker === 'evan') ? evanEarlyJson : speaker.json
      const isPerspective = scene.perspective === true
      const npcMessages   = buildAlienNpcPrompt(
        charJson, scene, currentSceneHistory, playerText, hidden, isPerspective, lang, isFinalTurn, sceneIndex,
      )

      // const [npcResult, scoreResult] = await Promise.all([
      //   callLLM(npcMessages, controller.signal),
      //   scoreAlienResponse(playerText, charJson, scene, currentSceneHistory, lang, controller.signal),
      // ])

      const scorePromise = Promise.race([
        scoreAlienResponse(playerText, charJson, scene, currentSceneHistory, lang, controller.signal),
        new Promise(resolve => setTimeout(() => resolve({ ok: false, timedOut: true }), 10_000)),
      ]).catch(() => ({ ok: false }))

      const npcResult = await callLLM(npcMessages, controller.signal)

      clearTimeout(timeoutId)

      // clearTimeout(timeoutId)

      if (controller.signal.aborted) {
        if (timedOut) {
          // Our own 18s timeout fired — Promise.all resolved normally (llmClient/scoringEngine
          // catch internally), but the results are stale. Must still complete the turn so the
          // UI never freezes.
          console.warn('[AlienMainPage] Turn timed out (resolved path), using neutral fallback.')
          const fallbackText = getFallbackNpcText(speaker.name, lang)
          completeTurn(playerText, fallbackText, fallbackText, null, genericFallbackReplies, FALLBACK_SCORE_DELTAS, FALLBACK_STATE_DELTAS, isFinalTurn, replyMeta)
        }
        // timedOut === false → a newer turn aborted this stale call — return silently.
        return
      }

      // Parse NPC reaction + next suggested replies
      let npcReaction          = null
      let npcAction            = null
      let nextSuggestedReplies = []
      if (npcResult.ok) {
        console.log(`[DEBUG] Turn ${turnCount + 1} raw npcResult.text:`, npcResult.text)
        console.log(`[DEBUG] Turn ${turnCount + 1} nextSuggestedReplies:`, nextSuggestedReplies)

        const parsed         = parseAlienNpcJson(npcResult.text)
        const rawResponse    = parsed?.npcResponse ?? null
        const rawAction      = parsed?.npcAction   ?? null
        // If suggestedReplies is present in the parsed JSON, use them directly.
        // Otherwise, try one lightweight AI patch-up request (fetchFallbackSuggestions)
        // before falling back to the randomised generic pool.
        // fetchFallbackSuggestions is skipped on final turns (no suggestions needed).
        if (Array.isArray(parsed?.suggestedReplies) && parsed.suggestedReplies.length) {
          nextSuggestedReplies = parsed.suggestedReplies
        } else if (!isFinalTurn) {
          console.warn(`[AlienMainPage] Turn ${turnCount + 1}: suggestedReplies missing — attempting AI patch-up request.`)
          const aiSuggestions = await fetchFallbackSuggestions(playerText)
          nextSuggestedReplies = aiSuggestions ?? genericFallbackReplies
        }

        // Defensively split any narration that leaked into npcResponse.
        if (rawResponse) {
          const { cleanDialogue, combinedNarration } = extractCleanDialogue(rawResponse, rawAction)
          npcReaction = cleanDialogue
          npcAction   = combinedNarration
        }

        // ── DIAGNOSTIC: log final-turn raw output to help diagnose generic responses ──
        if (isFinalTurn) {
          console.group(`[AlienMainPage] FINAL TURN — scene: ${scene.id}, speaker: ${speaker.name}`)
          console.log('npcResult.ok:', npcResult.ok)
          console.log('raw npcResult.text:', npcResult.text)
          console.log('parseAlienNpcJson result:', parsed)
          console.log('extracted npcReaction (after parser):', npcReaction)
          console.log('extracted npcAction   (after parser):', npcAction)
          console.groupEnd()
        }
      } else if (isFinalTurn) {
        // npcResult.ok=false on a final turn — log so we can see the error shape
        console.group(`[AlienMainPage] FINAL TURN npcResult.ok=FALSE — scene: ${scene.id}, speaker: ${speaker.name}`)
        console.log('npcResult:', npcResult)
        console.log('raw text (if any):', npcResult.text)
        console.groupEnd()

        // Attempt to salvage: try parsing the raw text even when ok=false,
        // since llmClient may set ok:false for HTTP errors but still return a body.
        if (npcResult.text) {
          const salvaged = parseAlienNpcJson(npcResult.text)
          if (salvaged?.npcResponse) {
            const { cleanDialogue, combinedNarration } = extractCleanDialogue(
              salvaged.npcResponse,
              salvaged.npcAction ?? null,
            )
            npcReaction = cleanDialogue
            npcAction   = combinedNarration
            console.log('[AlienMainPage] FINAL TURN salvage parse succeeded:', npcReaction)
          }
        }
      }else{
        console.log(`[DEBUG] Turn ${turnCount + 1} raw npcResult.text:`, npcResult.text)
      }

      // If npcReaction is still null for any reason (ok:false with no salvageable body,
      // parse failure, or npcResponse missing), substitute the fallback.
      // This guarantees an NPC bubble always appears before completeTurn() fires.
      if (!npcReaction) {
        console.warn(`[AlienMainPage] npcReaction null after all attempts — scene: ${scene.id}, isFinalTurn: ${isFinalTurn}. Using fallback.`)
        npcReaction = getFallbackNpcText(speaker.name, lang)
      }

      // ── DIAGNOSTIC: log full scoreResult every turn ──────────────────────
      const scoreResult = await scorePromise
      console.group(`[AlienMainPage] scoreResult — scene: ${scene.id}, turn: ${turnCount + 1}/${MAX_TURNS_PER_CHAPTER}`)
      console.log('isHeuristic (fallback?):', scoreResult.isHeuristic ?? false)
      console.log('scoreResult:', JSON.stringify(scoreResult, null, 2))
      console.log('scores BEFORE delta:', JSON.stringify(scores))
      console.log('hidden BEFORE delta:', JSON.stringify(hidden))
      console.groupEnd()

      // Score deltas
      // LLM returns absolute quality values (0-100). We scale them into gentle
      // per-turn deltas so scores accumulate meaningfully over 3 turns × 6 chapters
      // rather than hitting the 0/100 ceiling in the first chapter.
      //
      // Formula: delta = round((absolute - 50) * 0.15)
      //   • A perfect turn (100) contributes +7.5 → rounds to +8
      //   • A neutral turn (50) contributes ±0
      //   • A poor turn (10) contributes −6
      // Starting from BASE_SCORES (~48), it takes ~4 "perfect" turns to reach 80.
      const DELTA_SCALE = 0.15
      const scoreDeltas = scoreResult.composite !== undefined ? {
        clarity:   Math.round((scoreResult.clarity   - 50) * DELTA_SCALE),
        respect:   Math.round((scoreResult.respect   - 50) * DELTA_SCALE),
        awareness: Math.round((scoreResult.awareness - 50) * DELTA_SCALE),
        boundary:  Math.round((scoreResult.boundary  - 50) * DELTA_SCALE),
      } : FALLBACK_SCORE_DELTAS

      const stateDeltas = scoreResult.composite !== undefined
        ? deriveStateDeltasFromScore(scoreResult)
        : FALLBACK_STATE_DELTAS

      const feedback = scoreResult.feedback?.trim()
        || getFallbackNpcText(speaker.name, lang)

      completeTurn(playerText, feedback, npcReaction, npcAction, nextSuggestedReplies, scoreDeltas, stateDeltas, isFinalTurn, replyMeta)

    } catch (err) {
      clearTimeout(timeoutId)
      if (timedOut) {
        // Our own timeout fired — must complete the turn so the UI always unfreezes.
        console.warn('[AlienMainPage] Turn timed out, using neutral fallback.')
        const fallbackText = getFallbackNpcText(speaker.name, lang)
        completeTurn(
          playerText,
          fallbackText,
          fallbackText, null, genericFallbackReplies, FALLBACK_SCORE_DELTAS, FALLBACK_STATE_DELTAS, isFinalTurn, replyMeta,
        )
        return
      }
      // A newer turn aborted this stale call — return silently without completing.
      if (err?.name === 'AbortError' || controller.signal.aborted) return

      // ── DIAGNOSTIC: full error dump so we can identify the exact crash site ──
      console.error('[AlienMainPage] *** handleTurn EXCEPTION ***')
      console.error('  scene.id:', scene.id, '| scene.speaker:', scene.speaker, '| sceneIndex:', sceneIndex)
      console.error('  speaker.json (truthy?):', !!speaker?.json, '| speaker.json id:', speaker?.json?.id ?? 'UNDEFINED')
      console.error('  charJson resolved to:', (scene.id === 'lunch' && scene.speaker === 'evan') ? 'evan-early' : 'speaker.json')
      console.error('  err.name:', err?.name)
      console.error('  err.message:', err?.message)
      console.error('  err stack:', err?.stack)
      console.error('  full err object:', err)

      console.warn('[AlienMainPage] LLM error, using neutral fallback:', err)
      const fallbackText = getFallbackNpcText(speaker.name, lang)
      completeTurn(
        playerText,
        fallbackText,
        fallbackText, null, genericFallbackReplies, FALLBACK_SCORE_DELTAS, FALLBACK_STATE_DELTAS, isFinalTurn, replyMeta,
      )
    }
  }, [completeTurn, scene, speaker, currentSceneHistory, hidden, lang, turnCount])

  function submitSuggestedReply(index) {
    const reply = suggestedReplies[index]
    if (!reply) return
    handleTurn(reply.text ?? reply.line ?? '', index)
  }
  function submitCustomText() {
    const t = finalText.trim()
    if (t) handleTurn(t, 'freeText')
  }

  function restart() {
    abortRef.current?.abort()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    try { localStorage.removeItem(LS_KEY) } catch { /* silent */ }
    setSceneIndex(0)
    setScores(BASE_SCORES)
    setHidden(BASE_STATE)
    setChoices([])
    setLastFeedback('')
    setNpcReactions({})
    setFinalText('')
    setShowReport(false)
    setShowEnding(false)
    setIsLoading(false)
    setLoadingFor(null)
    setAlienationPulse(null)
    setTurnCount(0)
    setChapterMessages([])
    setSuggestedReplies([])
    setAwaitingChapterAdvance(false)
    setDidEvanJoinLunch(null)
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="af-story-shell">

      <div className="af-topbar">
        <div className="af-topbar-title">
          <strong>Alien, Apparently</strong>
          <span>{ui.subtitle}</span>
        </div>
        <div className="af-topbar-actions">
          <button
            className="af-ghost-button"
            aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
            onClick={() => {
              const next = !isMuted
              setIsMuted(next)
              try { localStorage.setItem('af_voice_muted', String(next)) } catch { /* ignore */ }
              if (next && audioRef.current) {
                audioRef.current.pause()
                audioRef.current.src = ''
                audioRef.current = null
              }
            }}
            style={{ fontSize: '16px', padding: '4px 8px', lineHeight: 1 }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            className="af-ghost-button"
            aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
            title={isMusicMuted ? 'Unmute music' : 'Mute music'}
            onClick={toggleMusicMute}
            style={{ fontSize: '16px', padding: '4px 8px', lineHeight: 1 }}
          >
            {isMusicMuted ? '🎵' : '🎶'}
          </button>
          <button className="af-ghost-button" onClick={() => navigate('/')}>
            {ui.home}
          </button>
        </div>
      </div>

      {showEnding ? (
        <div className="af-report">
          <section
            className="af-ending-main"
            style={{
              '--af-ending-bg': `url("${bgEnding}")`,
              '--af-ending-tint': (
                ending.name === 'Exclusion'
                  ? 'rgba(155,107,140,0.38)'       // tension — #9B6B8C
                  : ending.name === 'Forced Harmony'
                    ? 'rgba(138,143,163,0.32)'     // distance — #8A8FA3
                    : 'rgba(217,142,95,0.36)'      // warmth — #D98E5F (Healthy Boundary + Mutual Adjustment)
              ),
            }}
          >
            <div>
              <div className="af-ending-kicker">{ui.endingUnlocked}</div>
              <h1>{p(ending.name)}</h1>
              <p className="af-ending-summary">{p(ending.summary)}</p>
              <p className="af-ending-quote">{p(ending.quote)}</p>
            </div>
            <div>
              <div className="af-report-actions">
                <button className="af-action-button primary" onClick={restart}>
                  {ui.replay}
                </button>
                <button className="af-action-button" onClick={() => navigate('/story-history')}>
                  {lang === 'zh' ? '故事历史' : 'Story History'}
                </button>
                <button className="af-action-button" onClick={() => navigate('/')}>
                  {ui.backHome}
                </button>
              </div>
            </div>
          </section>

          <aside className="af-side">
            <section className="af-panel">
              <h2>{ui.relational}</h2>
              <div className="af-meter-stack">
                <Meter label={ui.clarity}   value={scores.clarity}   color="#8A8FA3" />
                <Meter label={ui.respect}   value={scores.respect}   color="#FFD166" />
                <Meter label={ui.awareness} value={scores.awareness} color="#D4A574" />
                <Meter label={ui.boundary}  value={scores.boundary}  color="#9B6B8C" />
              </div>
            </section>

            <section className="af-panel">
              <h2>{ui.storyReport}</h2>
              <div className="af-summary-list">
                <div>{ui.overall}: {ending.overall}</div>
                <div>{ui.badge}: {p(ending.badge)}</div>
                <div>{ui.labelPower}: {hidden.labelPower}</div>
                <div>{ui.rumourStrength}: {hidden.rumour}</div>
                <div>{ui.choicesMade}: {choices.length}</div>
              </div>
            </section>

            <section className="af-panel">
              <h2>{ui.lastFeedback}</h2>
              <p className="af-feedback">{lastFeedback ? p(lastFeedback) : ui.noFeedback}</p>
            </section>
          </aside>
        </div>

      ) : showReport ? (
        <div className="af-memory-shell">
          <section className="af-book">
            <div className="af-book-header">
              <div className="af-book-kicker">{ui.conclusionKicker}</div>
              <h1>{ui.conclusionTitle}</h1>
              <p>{ui.conclusionIntro}</p>
            </div>

            <div className="af-memory-grid">
              {choices.map((memory, index) => (
                <article className="af-memory-page" key={memory.sceneId + '-' + index}>
                  <div className="af-memory-meta">{p(memory.level)} / {p(memory.subtitle)}</div>
                  <h2>{p(memory.title)}</h2>

                  <div className="af-memory-section">
                    <strong>{ui.whatHappened}</strong>
                    {p(memory.narration)}
                  </div>

                  <div className="af-memory-section">
                    <strong>{ui.playerResponse}</strong>
                    {p(memory.choiceLabel)}: "{p(memory.choiceText)}"
                  </div>

                  {memory.npcReaction && (
                    <div className="af-memory-section">
                      <strong>{CHARACTERS[memory.speaker]?.name ?? memory.speaker} responded:</strong>
                      {memory.npcReaction}
                    </div>
                  )}

                  <div className="af-memory-section">
                    <strong>{ui.feedback}</strong>
                    {p(memory.feedback)}
                  </div>

                  {(memory.fact || memory.assumption) && (
                    <div className="af-memory-section">
                      <strong>{ui.factAssumption}</strong>
                      <div className="af-memory-fact-list">
                        {memory.fact      && <div>{p(memory.fact)}</div>}
                        {memory.assumption && <div>{p(memory.assumption)}</div>}
                      </div>
                    </div>
                  )}

                  {memory.mutation && (
                    <div className="af-memory-section">
                      <strong>{ui.rumourChain}</strong>
                      <div className="af-memory-rumour-list">
                        {memory.mutation.map(item => <div key={item}>{p(item)}</div>)}
                      </div>
                    </div>
                  )}

                  <div className="af-memory-section">
                    <strong>{ui.statusAfter}</strong>
                    <div className="af-memory-status">
                      <Meter label={ui.label}     value={memory.state.labelPower} color="#9B6B8C" />
                      <Meter label={ui.rumour}    value={memory.state.rumour}     color="#9B6B8C" />
                      <Meter label={ui.tension}   value={memory.state.tension}    color="#FFD166" />
                      <Meter label={ui.evanTrust} value={memory.state.evanTrust}  color="#8A8FA3" />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="af-report-actions">
              <button className="af-action-button primary" onClick={() => setShowEnding(true)}>
                {ui.unlockEnding}
              </button>
              <button className="af-action-button" onClick={restart}>
                {ui.replay}
              </button>
            </div>
          </section>
        </div>

      ) : (
        <main className="af-stage">
          <section
            className={`af-visual ${scene.perspective ? 'perspective' : ''}`}
            style={{
              backgroundImage: `url("${scene.background}")`,
              '--alien-intensity': alienFilterIntensity.toFixed(3),
            }}
            data-alien-active={scene.speaker === 'evan' && alienFilterIntensity > 0.05 && !scene.perspective ? 'true' : 'false'}
          >
            <img
              key={scene.speaker}
              src={speaker.fullbody}
              alt={speaker.name}
              className={`af-character-fullbody ${scene.perspective ? 'flipped' : ''}${scene.speaker === 'evan' && alienFilterIntensity > 0.05 && !scene.perspective ? ` alien-filter alien-stage-${alienationStage.id}` : ''}`}
              style={{ '--alien-intensity': alienFilterIntensity.toFixed(3) }}
            />

            {/* Alien filter badge — only when Evan is the speaker, not perspective, above threshold */}
            {scene.speaker === 'evan' && alienFilterIntensity > 0.18 && !scene.perspective && (
              <div
                className="af-alien-filter-badge"
                style={{ opacity: Math.min(1, (alienFilterIntensity - 0.18) * 5) }}
              >
                <div className="af-alien-filter-badge-dot" />
                {lang === 'zh' ? '感知过滤中' : 'Perception Filtered'}
              </div>
            )}

            <div className="af-scene-content">
              <div className="af-scene-top">
                <div className="af-scene-meta">
                  <span className="af-pill">{p(scene.level)}</span>
                  <span className="af-pill">{p(scene.subtitle)}</span>
                </div>
                <div className="af-title-block">
                  <h1>{p(scene.title)}</h1>
                  <p>{p(scene.objective)}</p>
                </div>
              </div>
            </div>

            <div className="af-dialogue">
              <div className="af-speaker-line">
                <div className="af-speaker-identity">
                  <img
                    src={speaker.portrait}
                    alt={speaker.name}
                    className="af-speaker-portrait"
                  />
                  <div>
                    <div className="af-speaker-name" style={{ color: speaker.color }}>
                      {speaker.name}
                    </div>
                    <div className="af-speaker-role">{p(speaker.role)}</div>
                  </div>
                </div>
                <span className="af-pill">{ui.alienFilter}</span>
              </div>

              {/* ── Scrollable conversation area ─────────────────────────── */}
              <div className="af-dialogue-scroll" ref={dialogueScrollRef}>

                {/* Authored opening line (always visible, dimmed after first turn) */}
                <div
                  className="af-line"
                  style={chapterMessages.length > 0 ? { opacity: 0.4, fontSize: '13px' } : undefined}
                >
                  "{p(scene.line)}"
                </div>
                <p
                  className="af-narration"
                  style={chapterMessages.length > 0 ? { opacity: 0.35 } : undefined}
                >
                  {p(
                    (scene.narrationVariants && didEvanJoinLunch)
                      ? (scene.narrationVariants[didEvanJoinLunch] ?? scene.narration)
                      : scene.narration,
                  )}
                </p>

                {/* Live conversation history (player + NPC bubbles) */}
                {chapterMessages.map((msg, i) => {
                  if (msg.role === 'user') {
                    return (
                      <div
                        key={i}
                        style={{
                          alignSelf: 'flex-end',
                          maxWidth: '80%',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: 'rgba(237,235,228,0.12)',
                          border: '1px solid rgba(237,235,228,0.2)',
                          fontSize: '14px',
                          color: '#EDEBE4',
                        }}
                      >
                        {msg.text}
                      </div>
                    )
                  }
                  // NPC action narration (if present) + spoken bubble
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignSelf: 'flex-start', maxWidth: '85%' }}>
                      {msg.action && (
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          lineHeight: 1.5,
                          color: 'rgba(237,235,228,0.55)',
                          fontStyle: 'italic',
                          paddingLeft: '4px',
                          borderLeft: `2px solid ${speaker.color}44`,
                        }}>
                          {msg.action}
                        </p>
                      )}
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: `1.5px solid ${speaker.color}`,
                          background: `rgba(${speaker.color === '#9B6B8C' ? '155,107,140' : speaker.color === '#8A8FA3' ? '138,143,163' : speaker.color === '#FFD166' ? '255,209,102' : '212,165,116'},0.10)`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <img src={speaker.portrait} alt={speaker.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                          <span style={{ fontSize: '11px', fontWeight: 800, color: speaker.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {speaker.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#EDEBE4', fontStyle: 'italic' }}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* NPC typing / thinking indicator — shown while waiting for NPC reply */}
                {isLoading && (
                  <div className="af-typing-indicator">
                    <div
                      className="af-typing-bubble"
                      style={{
                        border: `1.5px solid ${speaker.color}88`,
                        background: `rgba(${speaker.color === '#9B6B8C' ? '155,107,140' : speaker.color === '#8A8FA3' ? '138,143,163' : speaker.color === '#FFD166' ? '255,209,102' : '212,165,116'},0.08)`,
                      }}
                    >
                      <img
                        src={speaker.portrait}
                        alt={speaker.name}
                        style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div className="af-typing-dots">
                        <span /><span /><span />
                      </div>
                    </div>
                    <span className="af-typing-label">
                      {lang === 'zh'
                        ? `${speaker.name} 正在输入…`
                        : `${speaker.name} is typing…`}
                    </span>
                  </div>
                )}

              </div>{/* end .af-dialogue-scroll */}
            </div>
          </section>

          <aside className="af-side">
            <GroupRoster
              currentSpeaker={scene.speaker}
              revealedIds={revealedCharacterIds}
              lang={lang}
              ui={ui}
              alienFilterIntensity={alienFilterIntensity}
              alienationPercent={alienationPercent}
              alienationPulse={alienationPulse}
              isPerspective={!!scene.perspective}
            />

            {/* Turn counter + chapter progress indicator */}
            <section className="af-panel af-progress-panel" style={{ padding: '10px 14px', background: 'rgba(237,235,228,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(237,235,228,0.6)' }}>
                <span>Turn {turnCount + 1} / {MAX_TURNS_PER_CHAPTER}</span>
                <span>Chapter {sceneIndex + 1} / {SCENES.length}</span>
              </div>
            </section>

            {/* AI-generated suggested replies */}
            {!awaitingChapterAdvance && !initLoading && suggestedReplies.length > 0 && (
              <section className="af-panel af-choice-panel">
                <h2>{ui.chooseResponse || 'Suggested Replies'}</h2>
                {/* While the NPC reply + next batch of suggestions are loading, show skeleton */}
                {isLoading ? (
                  <div className="af-skeleton-list">
                    {suggestedReplies.map((_, i) => (
                      <div key={i} className="af-skeleton-card">
                        <div className="af-skeleton-label" />
                        <div className="af-skeleton-line" />
                        <div className="af-skeleton-line" />
                      </div>
                    ))}
                    <div className="af-skeleton-status">
                      <div className="af-skeleton-status-dots">
                        <span /><span /><span />
                      </div>
                      {lang === 'zh' ? '正在生成回应选项…' : 'Generating response options…'}
                    </div>
                  </div>
                ) : (
                  <div className="af-choice-list">
                    {suggestedReplies.map((reply, index) => {
                      const lineText = reply.text ?? reply.line ?? ''
                      return (
                        <button
                          key={index}
                          className="af-choice-button"
                          onClick={() => submitSuggestedReply(index)}
                          disabled={isLoading}
                        >
                          <span className="af-choice-label" style={{ fontSize: '10px', opacity: 0.6 }}>
                            {reply.style || `Option ${index + 1}`}
                          </span>
                          <span className="af-choice-text">{lineText}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Loading state for initial suggestions (very first turn) */}
            {initLoading && !awaitingChapterAdvance && (
              <section className="af-panel af-choice-panel">
                <h2>{ui.chooseResponse || 'Suggested Replies'}</h2>
                <div className="af-skeleton-list">
                  {[0,1,2].map(i => (
                    <div key={i} className="af-skeleton-card">
                      <div className="af-skeleton-label" />
                      <div className="af-skeleton-line" />
                      <div className="af-skeleton-line" />
                    </div>
                  ))}
                  <div className="af-skeleton-status">
                    <div className="af-skeleton-status-dots">
                      <span /><span /><span />
                    </div>
                    {lang === 'zh' ? '正在生成回应选项…' : 'Generating response options…'}
                  </div>
                </div>
              </section>
            )}

            {/* Continue button — shown after the final NPC reply, before chapter advance */}
            {awaitingChapterAdvance && (
              <section className="af-panel af-continue-panel" style={{ textAlign: 'center', padding: '20px 14px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(237,235,228,0.6)', marginBottom: '14px' }}>
                  {sceneIndex >= SCENES.length - 1 ? 'End of story reached.' : `Chapter ${sceneIndex + 1} complete.`}
                </p>
                <button
                  className="af-primary-button"
                  style={{ width: '100%' }}
                  onClick={advanceChapter}
                >
                  {sceneIndex >= SCENES.length - 1 ? ui.unlockEnding || 'See Results →' : 'Continue →'}
                </button>
              </section>
            )}

            {/* Free-text input (hidden after final turn) */}
            {!awaitingChapterAdvance && (
            <section className="af-panel af-input-panel">
              <h2>{ui.writeOwn || 'Or write your own'}</h2>
              <div className="af-final-input">
                <textarea
                  value={finalText}
                  onChange={event => setFinalText(event.target.value)}
                  placeholder={ui.finalPlaceholder || 'Type your response...'}
                  disabled={isLoading}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      if (isLoading || awaitingChapterAdvance || !finalText.trim()) return
                      event.preventDefault()
                      submitCustomText()
                    }
                  }}
                />
                <button
                  className="af-primary-button"
                  disabled={!finalText.trim() || isLoading}
                  onClick={submitCustomText}
                >
                  {isLoading && loadingFor === 'freeText' ? '…' : ui.submitFinal || 'Send'}
                </button>
              </div>
            </section>
            )}

            {/* Last feedback (if available) */}
            {lastFeedback && (
              <section className="af-panel af-feedback-panel">
                <p className="af-feedback" style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>
                  {p(lastFeedback)}
                </p>
              </section>
            )}
          </aside>
        </main>
      )}
    </div>
  )
}
