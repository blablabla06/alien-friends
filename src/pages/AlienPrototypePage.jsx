import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext.jsx'
import { prototypeText, prototypeUi } from '../lib/alienPrototypeI18n.js'

const CLASSROOM_IMAGE =
  'https://commons.wikimedia.org/wiki/Special:FilePath/W-classroom.jpg'

const CAFE_IMAGE =
  'https://commons.wikimedia.org/wiki/Special:FilePath/Barry_Univ_Cafe.jpg'

const BASE_SCORES = {
  clarity: 48,
  respect: 50,
  awareness: 46,
  boundary: 42,
}

const BASE_STATE = {
  labelPower: 34,
  rumour: 22,
  tension: 38,
  evanTrust: 32,
}

const CHARACTERS = {
  mira: {
    name: 'Mira',
    groupRole: 'Member',
    role: 'Social connector',
    revealedInfo: 'Frames Evan before he arrives',
    color: '#4ECDC4',
    text: '#102a2a',
  },
  daniel: {
    name: 'Daniel',
    groupRole: 'Member',
    role: 'Frustrated teammate',
    revealedInfo: 'Hurt by the slide change',
    color: '#FFD166',
    text: '#2b2008',
  },
  evan: {
    name: 'Evan',
    groupRole: 'Member',
    role: 'The labelled outsider',
    revealedInfo: 'Acting with missing context',
    color: '#A78BFA',
    text: '#18122b',
  },
  sara: {
    name: 'Sara',
    groupRole: 'Leader',
    role: 'Group leader',
    revealedInfo: 'Trying to keep the decision respectful',
    color: '#FF8B5E',
    text: '#2b1208',
  },
}

const CHOICES = {
  conform: {
    label: 'Go with the group',
    text: 'Yeah, I also get that feeling. He seems like he does not want to be part of us.',
    effects: {
      scores: { clarity: -2, respect: -8, awareness: -10, boundary: -4 },
      state: { labelPower: 18, rumour: 12, tension: 8, evanTrust: -8 },
    },
    feedback: 'The label gets stronger before you have direct evidence.',
  },
  clarify: {
    label: 'Ask for facts',
    text: 'Wait, what happened exactly? Did anyone ask Evan directly?',
    effects: {
      scores: { clarity: 12, respect: 5, awareness: 10, boundary: 4 },
      state: { labelPower: -8, rumour: -4, tension: -2, evanTrust: 8 },
    },
    feedback: 'You slow the group down and separate facts from assumptions.',
  },
  avoid: {
    label: 'Stay out of it',
    text: 'Maybe we should just leave him alone if he prefers that.',
    effects: {
      scores: { clarity: 2, respect: 3, awareness: -4, boundary: -2 },
      state: { labelPower: 6, rumour: 5, tension: 2, evanTrust: -2 },
    },
    feedback: 'Avoiding conflict feels polite, but the assumption still spreads.',
  },
  attack: {
    label: 'Make it personal',
    text: 'That is so arrogant. He clearly thinks everyone else is useless.',
    effects: {
      scores: { clarity: -8, respect: -16, awareness: -12, boundary: -6 },
      state: { labelPower: 20, rumour: 18, tension: 14, evanTrust: -12 },
    },
    feedback: 'The group turns one behaviour into Evan\'s whole identity.',
  },
  defendBlindly: {
    label: 'Defend Evan fully',
    text: 'Maybe he fixed it. If the numbers were wrong, Daniel should not be angry.',
    effects: {
      scores: { clarity: 4, respect: -2, awareness: -9, boundary: -4 },
      state: { labelPower: -2, rumour: -2, tension: 10, evanTrust: 7 },
    },
    feedback: 'You protect Evan from unfair judgement, but Daniel\'s real impact is dismissed.',
  },
  separateIssues: {
    label: 'Separate two issues',
    text: 'Correcting the figures and changing someone\'s work without telling them are two separate problems. We should address both.',
    effects: {
      scores: { clarity: 16, respect: 10, awareness: 14, boundary: 16 },
      state: { labelPower: -12, rumour: -8, tension: -7, evanTrust: 10 },
    },
    feedback: 'This keeps accountability without turning Evan into a villain.',
  },
  repeatRumour: {
    label: 'Repeat the rumour',
    text: 'So Evan basically thinks Daniel cannot do his part?',
    effects: {
      scores: { clarity: -5, respect: -8, awareness: -12, boundary: -4 },
      state: { labelPower: 14, rumour: 22, tension: 10, evanTrust: -9 },
    },
    feedback: 'A retelling becomes more certain than the original message.',
  },
  originalMessage: {
    label: 'Ask for the original',
    text: 'Can we look at Evan\'s original message before deciding what he meant?',
    effects: {
      scores: { clarity: 15, respect: 6, awareness: 10, boundary: 8 },
      state: { labelPower: -10, rumour: -18, tension: -5, evanTrust: 8 },
    },
    feedback: 'You interrupt the mutation chain and check the source.',
  },
  correctWording: {
    label: 'Correct the wording',
    text: 'He said the figures were inconsistent. That is not the same as saying Daniel is incompetent.',
    effects: {
      scores: { clarity: 14, respect: 8, awareness: 8, boundary: 7 },
      state: { labelPower: -8, rumour: -14, tension: -3, evanTrust: 7 },
    },
    feedback: 'You reduce distortion without pretending there was no conflict.',
  },
  accuseEvan: {
    label: 'Accuse Evan',
    text: 'You should have known this would upset Daniel. Why did you not ask anyone?',
    effects: {
      scores: { clarity: 4, respect: -7, awareness: -2, boundary: 4 },
      state: { labelPower: 7, rumour: 2, tension: 8, evanTrust: -12 },
    },
    feedback: 'Evan hears another attack before he has room to explain.',
  },
  askEvan: {
    label: 'Ask Evan why',
    text: 'I see why Daniel was affected. Can you explain what made the change feel urgent to you?',
    effects: {
      scores: { clarity: 14, respect: 12, awareness: 16, boundary: 8 },
      state: { labelPower: -10, rumour: -6, tension: -7, evanTrust: 16 },
    },
    feedback: 'You hold the impact and the missing context at the same time.',
  },
  setRule: {
    label: 'Suggest a rule',
    text: 'Next time, can we agree that any slide change needs a short note in the group chat?',
    effects: {
      scores: { clarity: 14, respect: 10, awareness: 7, boundary: 18 },
      state: { labelPower: -7, rumour: -5, tension: -8, evanTrust: 10 },
    },
    feedback: 'A concrete rule gives the group a way forward.',
  },
}

const SCENES = [
  {
    id: 'label',
    level: 'Chapter 1',
    title: 'The Label Comes First',
    subtitle: 'Discussion room, before Evan arrives',
    speaker: 'mira',
    background: CLASSROOM_IMAGE,
    line: 'Just so you know, Evan can be quite difficult.',
    narration:
      'Before you meet Evan, Mira gives you a frame. Evan is not in the room yet, but the group already has a story about him.',
    objective: 'Decide whether to accept the label or ask what actually happened.',
    choices: ['conform', 'clarify', 'avoid'],
  },
  {
    id: 'lunch',
    level: 'Chapter 1',
    title: 'The Lunch Invitation',
    subtitle: 'Campus cafe, ten minutes later',
    speaker: 'daniel',
    background: CAFE_IMAGE,
    line: 'He never joins us. It is like he does not want to be part of the team.',
    narration:
      'The group is leaving for lunch. Evan stays behind. You notice nobody actually said the lunch plan out loud.',
    objective: 'Separate the observed fact from the group interpretation.',
    fact: 'Observed fact: Evan did not join lunch.',
    assumption: 'Assumption: Evan dislikes the group.',
    choices: ['conform', 'clarify', 'avoid'],
  },
  {
    id: 'slides',
    level: 'Chapter 2',
    title: 'The Edited Slides',
    subtitle: 'Shared presentation, Slide 6',
    speaker: 'daniel',
    background: CLASSROOM_IMAGE,
    line: 'I rehearsed the old version. Then Evan changed my slide without telling me.',
    narration:
      'Daniel is genuinely affected. The figures were also genuinely inconsistent. Both things can be true.',
    objective: 'Avoid the extremes: Evan did nothing wrong, or Evan is the problem.',
    fact: 'Observed fact: Evan changed Slide 6 at 11:42 PM.',
    assumption: 'Unverified claim: Evan wanted to embarrass Daniel.',
    choices: ['attack', 'defendBlindly', 'separateIssues'],
  },
  {
    id: 'rumour',
    level: 'Chapter 3',
    title: 'Rumour Mutation',
    subtitle: 'Group chat, late night',
    speaker: 'mira',
    background: CLASSROOM_IMAGE,
    line: 'Daniel said Evan criticised him again. Honestly, it sounds like Evan thinks everyone is incompetent.',
    narration:
      'The original sentence changes as it moves through the group. Emotion fills in the missing parts.',
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
    level: 'Perspective Shift',
    title: 'Replay as Evan',
    subtitle: 'The same event, different information',
    speaker: 'evan',
    background: CLASSROOM_IMAGE,
    line: 'I saw the numbers were inconsistent. The deadline was tomorrow. I thought fixing it directly was better than waiting.',
    narration:
      'From Evan\'s side, he was not invited to lunch, did not know Daniel rehearsed the old slide, and already expected the group to judge him.',
    objective: 'Understanding missing context does not erase impact. Decide what to ask next.',
    perspective: true,
    fact: 'Missing context: Evan corrected a real error.',
    assumption: 'Still true: Evan changed someone else\'s work without warning.',
    choices: ['accuseEvan', 'askEvan', 'setRule'],
  },
  {
    id: 'meeting',
    level: 'Final Meeting',
    title: 'Who Made the Alien?',
    subtitle: 'Submission day, group decision',
    speaker: 'sara',
    background: CLASSROOM_IMAGE,
    line: 'We need to decide whether Evan stays on the project. I just want everyone to be respectful.',
    narration:
      'Daniel needs accountability. Evan needs direct feedback. Mira needs to stop amplifying labels. Sara needs an actual decision.',
    objective: 'Write or choose a final response that creates a workable boundary.',
    final: true,
    choices: ['attack', 'separateIssues', 'setRule'],
  },
]

function clamp(value) {
  return Math.max(0, Math.min(100, value))
}

function applyDelta(target, delta) {
  const next = { ...target }
  for (const [key, value] of Object.entries(delta ?? {})) {
    next[key] = clamp((next[key] ?? 0) + value)
  }
  return next
}

function scoreFinalText(text) {
  const lower = text.toLowerCase()
  const hasImpact = /impact|hurt|affected|frustrat|embarrass|upset|daniel|影响|伤害|难受|尴尬|感受|丹尼尔/.test(lower)
  const hasBoundary = /rule|notify|message|tell|before|next time|change|规则|通知|留言|群聊|下次|修改|更改/.test(lower)
  const hasFairness = /both|separate|fact|assum|original|understand|evidence|两件事|区分|事实|假设|原话|理解|证据|同时/.test(lower)
  const attacksIdentity = /weird|alien|creepy|arrogant|useless|kick|remove|怪|异类|外星人|傲慢|没用|踢|移除|赶走/.test(lower)

  if (!text.trim()) return null

  if (attacksIdentity) {
    return {
      scores: { clarity: -2, respect: -16, awareness: -10, boundary: -5 },
      state: { labelPower: 16, rumour: 10, tension: 14, evanTrust: -12 },
      feedback: 'Your final reply uses identity labels, so the group keeps looking for an alien.',
    }
  }

  return {
    scores: {
      clarity: hasFairness ? 14 : 5,
      respect: 8,
      awareness: hasImpact ? 14 : 4,
      boundary: hasBoundary ? 18 : 3,
    },
    state: {
      labelPower: hasFairness ? -10 : -3,
      rumour: hasFairness ? -8 : -2,
      tension: hasImpact && hasBoundary ? -12 : -4,
      evanTrust: hasImpact ? 9 : 4,
    },
    feedback: hasImpact && hasBoundary && hasFairness
      ? 'Strong final move: you name impact, separate facts from assumptions, and propose a rule.'
      : 'Your final reply helps, but it could be stronger if it named impact and proposed a concrete rule.',
  }
}

function getEnding(scores, hidden) {
  const overall = Math.round(
    scores.clarity * 0.28 +
    scores.respect * 0.24 +
    scores.awareness * 0.28 +
    scores.boundary * 0.2
  )

  if (hidden.labelPower >= 70 || hidden.rumour >= 70) {
    return {
      name: 'Exclusion',
      quote: 'A group that needs an alien will eventually create another one.',
      summary:
        'Evan is removed. The group feels relieved, but the pattern that created the label remains.',
      overall,
      badge: 'Rumour Witness',
    }
  }

  if (scores.boundary >= 70 && scores.awareness >= 62) {
    return {
      name: 'Healthy Boundary',
      quote: 'Understanding does not remove accountability.',
      summary:
        'The team keeps the issue specific: Evan must notify changes, and the group must stop using personal labels.',
      overall,
      badge: 'Boundary Setter',
    }
  }

  if (overall >= 66) {
    return {
      name: 'Mutual Adjustment',
      quote: 'Belonging does not require sameness.',
      summary:
        'Nobody becomes best friends, but the team creates enough trust and structure to keep working.',
      overall,
      badge: 'Perspective Builder',
    }
  }

  return {
    name: 'Forced Harmony',
    quote: 'Silence is not resolution.',
    summary:
      'The meeting ends politely, but the real conflict continues underneath the surface.',
    overall,
    badge: 'First Run Complete',
  }
}

function GroupRoster({ currentSpeaker, revealedIds, lang, ui }) {
  return (
    <section className="af-panel af-roster-panel">
      <h2>{ui.groupNotes}</h2>
      <div className="af-roster-list">
        {Object.entries(CHARACTERS).map(([id, character]) => {
          const revealed = revealedIds.has(id)
          const active = id === currentSpeaker

          return (
            <div className={`af-roster-item ${active ? 'active' : ''}`} key={id}>
              <div
                className="af-character-face"
                style={{ backgroundColor: character.color, color: character.text }}
              >
                {character.name[0]}
              </div>
              <div className="af-roster-copy">
                <div className="af-roster-topline">
                  <span className="af-character-name">{character.name}</span>
                  <span className="af-roster-tag">{prototypeText(character.groupRole, lang)}</span>
                </div>
                <div className={`af-roster-detail ${revealed ? 'revealed' : ''}`}>
                  {revealed ? prototypeText(character.revealedInfo, lang) : ui.noDetailYet}
                </div>
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

function buildMemoryEntry(scene, choice, feedback, nextScores, nextHidden, choiceId) {
  return {
    sceneId: scene.id,
    choiceId,
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
    choiceLabel: choice.label,
    choiceText: choice.text,
    feedback,
    scores: nextScores,
    state: nextHidden,
  }
}

export default function AlienPrototypePage() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const ui = prototypeUi[lang] ?? prototypeUi.en
  const p = value => prototypeText(value, lang)
  const [sceneIndex, setSceneIndex] = useState(0)
  const [scores, setScores] = useState(BASE_SCORES)
  const [hidden, setHidden] = useState(BASE_STATE)
  const [choices, setChoices] = useState([])
  const [lastFeedback, setLastFeedback] = useState('')
  const [finalText, setFinalText] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [showEnding, setShowEnding] = useState(false)

  const scene = SCENES[sceneIndex]
  const speaker = CHARACTERS[scene.speaker]
  const ending = useMemo(() => getEnding(scores, hidden), [scores, hidden])
  const revealedCharacterIds = useMemo(
    () => new Set(SCENES.slice(0, sceneIndex + 1).map(item => item.speaker)),
    [sceneIndex],
  )

  function completeTurn(choiceId, choice, feedback) {
    const nextScores = applyDelta(scores, choice.effects.scores)
    const nextHidden = applyDelta(hidden, choice.effects.state)

    setScores(nextScores)
    setHidden(nextHidden)
    setChoices(prev => [
      ...prev,
      buildMemoryEntry(scene, choice, feedback, nextScores, nextHidden, choiceId),
    ])
    setLastFeedback(feedback)
    setFinalText('')

    if (sceneIndex >= SCENES.length - 1) {
      setShowReport(true)
      return
    }
    setSceneIndex(prev => prev + 1)
  }

  function choose(choiceId) {
    const choice = CHOICES[choiceId]
    completeTurn(choiceId, choice, choice.feedback)
  }

  function submitCustomText() {
    const result = scoreFinalText(finalText)
    if (!result) return

    completeTurn(
      'freeText',
      {
        label: 'Custom response',
        text: finalText.trim(),
        effects: result,
      },
      result.feedback
    )
  }

  function restart() {
    setSceneIndex(0)
    setScores(BASE_SCORES)
    setHidden(BASE_STATE)
    setChoices([])
    setLastFeedback('')
    setFinalText('')
    setShowReport(false)
    setShowEnding(false)
  }

  return (
    <div className="af-prototype-shell">
      <style>{`
        .af-prototype-shell {
          min-height: 100vh;
          background: #101225;
          color: #F5F0E8;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }

        .af-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: rgba(10, 12, 28, 0.84);
          backdrop-filter: blur(14px);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .af-topbar-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .af-topbar-title strong {
          font-size: 16px;
          letter-spacing: 0;
          color: #FF8B5E;
        }

        .af-topbar-title span {
          font-size: 11px;
          color: rgba(245,240,232,0.48);
        }

        .af-ghost-button {
          border: 1px solid rgba(78,205,196,0.35);
          color: #4ECDC4;
          background: rgba(78,205,196,0.09);
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .af-stage {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 20px;
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
          gap: 18px;
          flex: 1;
        }

        .af-visual {
          min-height: 650px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          background-position: center;
          background-size: cover;
          box-shadow: 0 24px 80px rgba(0,0,0,0.36);
        }

        .af-visual::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(10,12,28,0.92), rgba(10,12,28,0.34) 46%, rgba(10,12,28,0.78)),
            radial-gradient(circle at 68% 28%, rgba(167,139,250,0.22), transparent 34%);
        }

        .af-visual.perspective::before {
          background:
            linear-gradient(90deg, rgba(10,12,28,0.8), rgba(10,12,28,0.2) 48%, rgba(10,12,28,0.86)),
            radial-gradient(circle at 60% 30%, rgba(78,205,196,0.2), transparent 36%);
        }

        .af-scene-content {
          position: relative;
          z-index: 2;
          min-height: 650px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 28px;
        }

        .af-scene-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .af-pill {
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.08);
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: rgba(245,240,232,0.72);
        }

        .af-title-block {
          max-width: 650px;
          margin-top: 14px;
        }

        .af-title-block h1 {
          margin: 0;
          font-size: clamp(36px, 6vw, 72px);
          line-height: 0.95;
          letter-spacing: 0;
          color: #F5F0E8;
        }

        .af-title-block p {
          margin: 12px 0 0;
          color: rgba(245,240,232,0.66);
          font-size: 14px;
        }

        .af-roster-panel {
          padding: 13px;
        }

        .af-roster-list {
          display: grid;
          gap: 8px;
        }

        .af-roster-item {
          min-width: 0;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(10,12,28,0.34);
          border-radius: 12px;
          padding: 9px;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .af-roster-item.active {
          border-color: rgba(255,139,94,0.66);
          background: rgba(255,139,94,0.11);
          transform: translateY(-1px);
        }

        .af-character-face {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-weight: 900;
          flex-shrink: 0;
        }

        .af-roster-copy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .af-roster-topline {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .af-character-name {
          min-width: 0;
          font-size: 13px;
          font-weight: 900;
          color: #F5F0E8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .af-roster-tag,
        .af-speaking-dot {
          white-space: nowrap;
          border-radius: 999px;
          background: rgba(78,205,196,0.13);
          color: #4ECDC4;
          padding: 3px 7px;
          font-size: 10px;
          font-weight: 900;
        }

        .af-speaking-dot {
          background: rgba(255,139,94,0.16);
          color: #FF8B5E;
        }

        .af-roster-detail {
          font-size: 11px;
          line-height: 1.35;
          color: rgba(245,240,232,0.42);
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .af-roster-detail.revealed {
          color: rgba(245,240,232,0.72);
        }

        .af-dialogue {
          max-width: 760px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(10,12,28,0.84);
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 18px 50px rgba(0,0,0,0.28);
        }

        .af-speaker-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .af-speaker-name {
          font-size: 13px;
          font-weight: 900;
        }

        .af-speaker-role {
          font-size: 11px;
          color: rgba(245,240,232,0.48);
        }

        .af-line {
          font-size: 21px;
          line-height: 1.38;
          color: #fff9f0;
        }

        .af-narration {
          margin-top: 12px;
          font-size: 14px;
          line-height: 1.55;
          color: rgba(245,240,232,0.66);
        }

        .af-side {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
        }

        .af-panel {
          border: 1px solid rgba(255,255,255,0.11);
          background: rgba(255,255,255,0.055);
          border-radius: 14px;
          padding: 15px;
        }

        .af-panel h2,
        .af-panel h3 {
          margin: 0 0 10px;
          color: #4ECDC4;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0;
        }

        .af-objective {
          color: rgba(245,240,232,0.78);
          line-height: 1.45;
          font-size: 13px;
        }

        .af-fact-box {
          display: grid;
          gap: 8px;
        }

        .af-fact-box div {
          border-left: 3px solid rgba(78,205,196,0.75);
          background: rgba(78,205,196,0.08);
          padding: 9px 10px;
          border-radius: 8px;
          font-size: 12px;
          color: rgba(245,240,232,0.78);
        }

        .af-fact-box div:nth-child(2) {
          border-left-color: rgba(255,139,94,0.8);
          background: rgba(255,139,94,0.08);
        }

        .af-choice-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .af-choice-button {
          width: 100%;
          text-align: left;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.075);
          color: #F5F0E8;
          border-radius: 12px;
          padding: 12px;
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        }

        .af-choice-button:hover {
          transform: translateY(-1px);
          border-color: rgba(255,139,94,0.52);
          background: rgba(255,139,94,0.12);
        }

        .af-choice-label {
          display: block;
          font-size: 12px;
          color: #FF8B5E;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .af-choice-text {
          display: block;
          font-size: 13px;
          line-height: 1.38;
          color: rgba(245,240,232,0.8);
        }

        .af-mutation {
          display: grid;
          gap: 8px;
          counter-reset: rumour-step;
        }

        .af-mutation-step {
          counter-increment: rumour-step;
          display: flex;
          gap: 8px;
          align-items: flex-start;
          font-size: 12px;
          line-height: 1.35;
          color: rgba(245,240,232,0.78);
        }

        .af-mutation-step::before {
          content: counter(rumour-step);
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(255,139,94,0.18);
          color: #FF8B5E;
          font-size: 11px;
          font-weight: 900;
        }

        .af-meter-stack {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .af-meter {
          min-width: 0;
        }

        .af-meter-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
          color: rgba(245,240,232,0.55);
          margin-bottom: 5px;
        }

        .af-meter-row strong {
          color: rgba(245,240,232,0.9);
        }

        .af-meter-track {
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.1);
        }

        .af-meter-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.28s ease;
        }

        .af-feedback {
          min-height: 40px;
          font-size: 12px;
          line-height: 1.4;
          color: rgba(245,240,232,0.64);
        }

        .af-final-input {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .af-final-input textarea {
          width: 100%;
          min-height: 82px;
          resize: vertical;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(10,12,28,0.55);
          color: #F5F0E8;
          padding: 12px;
          outline: none;
          font-size: 13px;
          line-height: 1.4;
        }

        .af-primary-button {
          width: 100%;
          border: 0;
          background: #FF8B5E;
          color: #101225;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 900;
        }

        .af-primary-button:disabled {
          opacity: 0.45;
        }

        .af-report {
          min-height: calc(100vh - 66px);
          width: min(980px, 100%);
          margin: 0 auto;
          padding: 28px 20px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
          gap: 18px;
          align-items: stretch;
        }

        .af-ending-main {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.12);
          background:
            linear-gradient(135deg, rgba(255,139,94,0.18), rgba(78,205,196,0.12)),
            rgba(255,255,255,0.06);
          padding: 26px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 520px;
        }

        .af-ending-main h1 {
          margin: 8px 0 12px;
          font-size: clamp(42px, 8vw, 76px);
          line-height: 0.96;
          letter-spacing: 0;
        }

        .af-ending-kicker {
          color: #4ECDC4;
          text-transform: uppercase;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0;
        }

        .af-ending-summary {
          font-size: 17px;
          line-height: 1.52;
          color: rgba(245,240,232,0.82);
          max-width: 58ch;
        }

        .af-ending-quote {
          font-size: 20px;
          color: #FF8B5E;
          font-weight: 900;
          margin-top: 18px;
        }

        .af-report-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 28px;
        }

        .af-action-button {
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.08);
          color: #F5F0E8;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 800;
        }

        .af-action-button.primary {
          background: #FF8B5E;
          color: #101225;
          border-color: transparent;
        }

        .af-summary-list {
          display: grid;
          gap: 9px;
          font-size: 13px;
          color: rgba(245,240,232,0.72);
        }

        .af-summary-list div {
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .af-credit {
          margin-top: auto;
          font-size: 10px;
          color: rgba(245,240,232,0.36);
        }

        .af-credit a {
          color: rgba(78,205,196,0.8);
          text-decoration: underline;
        }

        .af-memory-shell {
          width: min(1080px, 100%);
          margin: 0 auto;
          padding: 24px 20px 34px;
        }

        .af-book {
          border: 1px solid rgba(255,255,255,0.13);
          border-radius: 18px;
          background: linear-gradient(90deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035));
          box-shadow: 0 24px 80px rgba(0,0,0,0.32);
          padding: 24px;
        }

        .af-book-header {
          max-width: 760px;
          margin-bottom: 20px;
        }

        .af-book-kicker {
          color: #4ECDC4;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .af-book-header h1 {
          margin: 8px 0 10px;
          color: #F5F0E8;
          font-size: clamp(34px, 6vw, 64px);
          line-height: 1;
          letter-spacing: 0;
        }

        .af-book-header p {
          margin: 0;
          color: rgba(245,240,232,0.66);
          line-height: 1.55;
        }

        .af-memory-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .af-memory-page {
          min-width: 0;
          border: 1px solid rgba(70, 42, 18, 0.14);
          background: #F5F0E8;
          color: #1B1A22;
          border-radius: 10px;
          padding: 16px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.55), 0 10px 30px rgba(0,0,0,0.18);
        }

        .af-memory-page h2 {
          margin: 5px 0 12px;
          color: #1B1A22;
          font-size: 20px;
          line-height: 1.15;
        }

        .af-memory-meta {
          color: #8B5E3C;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .af-memory-section {
          border-top: 1px solid rgba(27,26,34,0.11);
          padding-top: 10px;
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.5;
        }

        .af-memory-section strong {
          display: block;
          color: #8B5E3C;
          font-size: 11px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .af-memory-fact-list {
          display: grid;
          gap: 6px;
        }

        .af-memory-fact-list div,
        .af-memory-rumour-list div {
          border-radius: 8px;
          background: rgba(27,26,34,0.06);
          padding: 8px;
        }

        .af-memory-rumour-list {
          display: grid;
          gap: 6px;
          counter-reset: memory-rumour;
        }

        .af-memory-rumour-list div::before {
          counter-increment: memory-rumour;
          content: counter(memory-rumour) '. ';
          color: #8B5E3C;
          font-weight: 900;
        }

        .af-memory-status {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .af-memory-status .af-meter-row {
          color: rgba(27,26,34,0.62);
        }

        .af-memory-status .af-meter-row strong {
          display: inline;
          margin: 0;
          color: #1B1A22;
        }

        .af-memory-status .af-meter-track {
          background: rgba(27,26,34,0.1);
        }

        @media (max-width: 900px) {
          .af-stage,
          .af-report {
            grid-template-columns: 1fr;
          }

          .af-visual,
          .af-scene-content {
            min-height: 560px;
          }

          .af-memory-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .af-topbar {
            padding: 13px 14px;
          }

          .af-stage {
            padding: 12px;
          }

          .af-scene-content {
            padding: 18px;
          }

          .af-title-block h1 {
            font-size: 38px;
          }

          .af-line {
            font-size: 18px;
          }

          .af-meter-stack,
          .af-memory-grid,
          .af-memory-status {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="af-topbar">
        <div className="af-topbar-title">
          <strong>Alien, Apparently</strong>
          <span>{ui.subtitle}</span>
        </div>
        <button className="af-ghost-button" onClick={() => navigate('/')}>
          {ui.home}
        </button>
      </div>

      {showEnding ? (
        <div className="af-report">
          <section className="af-ending-main">
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
                <button className="af-action-button" onClick={() => navigate('/')}>
                  {ui.backHome}
                </button>
              </div>
              <p className="af-credit">
                {ui.creditPrefix}{' '}
                <a href="https://commons.wikimedia.org/wiki/File:W-classroom.jpg" target="_blank" rel="noreferrer">
                  W-classroom.jpg
                </a>{' '}
                {ui.creditAnd}{' '}
                <a href="https://commons.wikimedia.org/wiki/File:Barry_Univ_Cafe.jpg" target="_blank" rel="noreferrer">
                  Barry Univ Cafe.jpg
                </a>.
              </p>
            </div>
          </section>

          <aside className="af-side">
            <section className="af-panel">
              <h2>{ui.relational}</h2>
              <div className="af-meter-stack">
                <Meter label={ui.clarity} value={scores.clarity} color="#4ECDC4" />
                <Meter label={ui.respect} value={scores.respect} color="#FFD166" />
                <Meter label={ui.awareness} value={scores.awareness} color="#FF8B5E" />
                <Meter label={ui.boundary} value={scores.boundary} color="#A78BFA" />
              </div>
            </section>

            <section className="af-panel">
              <h2>{ui.prototypeReport}</h2>
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

                  <div className="af-memory-section">
                    <strong>{ui.feedback}</strong>
                    {p(memory.feedback)}
                  </div>

                  {(memory.fact || memory.assumption) && (
                    <div className="af-memory-section">
                      <strong>{ui.factAssumption}</strong>
                      <div className="af-memory-fact-list">
                        {memory.fact && <div>{p(memory.fact)}</div>}
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
                      <Meter label={ui.label} value={memory.state.labelPower} color="#A78BFA" />
                      <Meter label={ui.rumour} value={memory.state.rumour} color="#FF8B5E" />
                      <Meter label={ui.tension} value={memory.state.tension} color="#FFD166" />
                      <Meter label={ui.evanTrust} value={memory.state.evanTrust} color="#4ECDC4" />
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
            style={{ backgroundImage: `url("${scene.background}")` }}
          >
            <div className="af-scene-content">
              <div>
                <div className="af-scene-meta">
                  <span className="af-pill">{p(scene.level)}</span>
                  <span className="af-pill">{p(scene.subtitle)}</span>
                </div>

                <div className="af-title-block">
                  <h1>{p(scene.title)}</h1>
                  <p>{p(scene.objective)}</p>
                </div>

              </div>

              <div className="af-dialogue">
                <div className="af-speaker-line">
                  <div>
                    <div className="af-speaker-name" style={{ color: speaker.color }}>
                      {speaker.name}
                    </div>
                    <div className="af-speaker-role">{p(speaker.role)}</div>
                  </div>
                  <span className="af-pill">
                    {ui.alienFilter}
                  </span>
                </div>
                <div className="af-line">"{p(scene.line)}"</div>
                <p className="af-narration">{p(scene.narration)}</p>
              </div>
            </div>
          </section>

          <aside className="af-side">
            <GroupRoster
              currentSpeaker={scene.speaker}
              revealedIds={revealedCharacterIds}
              lang={lang}
              ui={ui}
            />

            {false && (scene.fact || scene.assumption) && (
              <section className="af-panel">
                <h2>{ui.factVsAssumption}</h2>
                <div className="af-fact-box">
                  {scene.fact && <div>{p(scene.fact)}</div>}
                  {scene.assumption && <div>{p(scene.assumption)}</div>}
                </div>
              </section>
            )}

            {false && scene.mutation && (
              <section className="af-panel">
                <h2>{ui.rumourChain}</h2>
                <div className="af-mutation">
                  {scene.mutation.map(item => (
                    <div key={item} className="af-mutation-step">{p(item)}</div>
                  ))}
                </div>
              </section>
            )}

            <section className="af-panel">
              <h2>{ui.chooseResponse}</h2>
              <div className="af-choice-list">
                {scene.choices.map(choiceId => {
                  const choice = CHOICES[choiceId]
                  return (
                    <button
                      key={choiceId}
                      className="af-choice-button"
                      onClick={() => choose(choiceId)}
                    >
                      <span className="af-choice-label">{p(choice.label)}</span>
                      <span className="af-choice-text">{p(choice.text)}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            {true && (
              <section className="af-panel">
                <h2>{ui.writeOwn}</h2>
                <div className="af-final-input">
                  <textarea
                    value={finalText}
                    onChange={event => setFinalText(event.target.value)}
                    placeholder={ui.finalPlaceholder}
                  />
                  <button
                    className="af-primary-button"
                    disabled={!finalText.trim()}
                    onClick={submitCustomText}
                  >
                    {ui.submitFinal}
                  </button>
                </div>
              </section>
            )}

          </aside>
        </main>
      )}
    </div>
  )
}
