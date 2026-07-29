# Alien, Apparently — Full Project Handoff for Codex

## 0. Purpose of This Document

This document is a complete handoff for building **Alien, Apparently**, a browser-based AI-powered interactive visual novel for the **Tencent Cloud × UTM Hackathon 2026 — Game Track**.

It consolidates the project idea, gameplay concept, AI system, technical architecture, content structure, development plan, team responsibilities, hackathon requirements, risks, and completion criteria.

The intended reader is Codex, CodeBuddy, Claude, or another AI coding assistant helping the team implement the project.

---

# 1. Project Overview

## 1.1 Project Title

**Alien, Apparently**

## 1.2 Subtitle

**An AI-powered relational intelligence game about belonging, bias, and the people we choose not to understand.**

## 1.3 One-Sentence Pitch

**Alien, Apparently is a short AI-powered interactive visual novel where players navigate a university group assignment conflict, communicate with emotionally adaptive AI characters, investigate how rumours and assumptions turn one teammate into “the alien,” and receive measurable feedback on their relational intelligence.**

## 1.4 Core Message

The word **“Alien”** is not used literally.

It is a metaphor for a person whom a group gradually labels as:

- Strange
- Rude
- Unfriendly
- Difficult
- Creepy
- Not one of us
- Someone who does not belong

The game explores how an ordinary person can become “alien” through:

- First impressions
- Incomplete information
- Gossip
- Group conformity
- Negative interpretation
- Communication failure
- Real behavioural mistakes
- Defensive reactions caused by exclusion

The main message is:

> **You do not have to like someone to judge their behaviour fairly.**

The game does **not** claim that every difficult person is secretly good, harmless, or misunderstood.

It also teaches:

> **Understanding someone does not require tolerating harmful behaviour.**

---

# 2. Hackathon Challenge Alignment

## 2.1 Selected Track

**Track 2: Game**

## 2.2 Official Challenge

**Relational Intelligence Engine — AI-Powered Communication & Social Skills Training Game**

The game must:

- Be AI-powered
- Be playable from start to finish
- Use realistic social situations
- Include two-way interaction with AI characters
- Build communication and social confidence
- Include game mechanics and measurable progression
- Be browser-accessible
- Use CodeBuddy as a core development tool
- Include at least one module whose content is fully AI-generated

## 2.3 How This Project Matches

| Hackathon Requirement | Project Implementation |
|---|---|
| Real-life social scenarios | University group assignment conflict |
| Communication skills | Clarification, feedback, conflict mediation, boundary setting |
| Social confidence | Safe practice through replayable scenarios |
| Two-way dialogue | Three predefined responses plus free-text input |
| AI-driven characters | NPCs with personality, emotional state, memory, and incomplete knowledge |
| Emotion recognition | Tone and sentiment classification of player input |
| Adaptive response | NPCs respond differently based on player history and wording |
| Social skills scoring | Clarity, Respect, Emotional Awareness, Expression Quality |
| Game-like progression | Levels, XP, badge, mission completion, endings |
| Growth analytics | Final relational intelligence report |
| Creative mechanics | Rumour Mutation, Alien Perception Filter, Perspective Shift |
| Browser-accessible | React-based web game |
| AI-created content module | AI-generated key art, visual assets, audio, and scenario package |
| CodeBuddy requirement | CodeBuddy used throughout development and history exported |

---

# 3. Product Vision

## 3.1 Primary Deliverable

A complete browser-based game prototype that can be played in approximately:

- **Target duration: 10–12 minutes**
- **Maximum duration: 15 minutes**

The experience must be complete from start to finish.

## 3.2 Supporting Deliverable

A lightweight **Perspective Play Generator** prototype that demonstrates how an anonymised real-life interpersonal experience could be converted into another short social-simulation game.

The generator is a supporting feature, not the main hackathon product.

## 3.3 Product Layers

### Layer 1 — Player Experience

The actual game:

- Visual novel
- Group chat
- Private messages
- AI dialogue
- Rumour investigation
- Perspective replay
- Social skills scoring
- Multiple endings

### Layer 2 — Creator Experience

A reusable generation workflow:

- Creator fills in structured story details
- AI anonymises and fictionalises the story
- AI generates a standard game package
- The game engine reads the package
- A new 10–12 minute interactive scenario can be assembled

---

# 4. Target Users

The prototype targets:

- University students
- Students working on group assignments
- Interns
- Fresh graduates
- Early-career employees
- Members of multicultural teams
- People who want to practise difficult conversations safely

The first scenario uses a university group assignment because it is:

- Easy to understand
- Common and relatable
- Compact enough for a short game
- Suitable for teamwork, deadlines, gossip, conflict, and social exclusion
- Appropriate for UTM students and judges

---

# 5. Game Format

## 5.1 Chosen Format

**2D AI Interactive Visual Novel**

The game should not be built as a large explorable RPG.

## 5.2 Content Composition

Recommended split:

- 70% illustrated visual-novel scenes
- 20% phone/group-chat interaction
- 10% scoring, reflection, and mission summary

## 5.3 Presentation Style

The game should use:

- Illustrated campus scenes
- Character portraits
- Facial expressions
- Text dialogue
- Background music
- Sound effects
- Group-chat UI
- Private-message UI
- Short visual transitions
- Limited animation
- AI-generated reactions
- Four response choices

## 5.4 Response Structure

At major decision points, the player gets:

1. A common group-conforming response
2. A common defensive, avoidant, or immediate response
3. A clarification or boundary-setting response
4. A free-text response

Example:

> “Evan never joins us. He clearly does not want to be part of the group.”

Choices:

1. “Yes, I also think he does not like us.”
2. “Maybe we should just leave him alone.”
3. “Did anyone directly invite him?”
4. “Write your own response…”

The predefined answers should not be obvious “good / neutral / bad” answers.

They should represent realistic communication styles.

---

# 6. Main Characters

The MVP should use four major characters plus the player.

## 6.1 Player

A new member of the group.

The player has not formed a strong opinion at the beginning.

The player can:

- Agree with group assumptions
- Stay silent
- Ask questions
- Defend Evan
- Criticise Evan
- Separate facts from interpretations
- Set boundaries
- De-escalate conflict

## 6.2 Evan — “The Alien”

Traits:

- Technically capable
- Direct communicator
- Rarely participates in informal activities
- Gives short responses
- Sometimes changes shared work without explanation
- Believes efficiency is more important than discussion
- Does not notice emotional impact easily
- Becomes defensive when excluded

Important:

- Evan is not completely innocent
- Evan is not secretly perfect
- Evan genuinely causes a collaboration problem
- Evan also experiences unfair judgement and social exclusion

## 6.3 Mira — The Social Connector

Traits:

- Friendly
- Socially influential
- Often shares information between people
- Wants group cohesion
- Interprets other people’s behaviour quickly
- Can unintentionally mutate information while retelling it

Role:

- First introduces the “Alien” label
- Helps spread group beliefs
- Influences player perception

## 6.4 Daniel — The Frustrated Teammate

Traits:

- Responsible
- Sensitive to ownership and fairness
- Feels personally disrespected by unannounced edits
- Has legitimate frustration
- Sometimes converts impact into assumptions about intention

Role:

- His work was changed by Evan
- Represents valid harm mixed with interpretation

## 6.5 Sara — The Group Leader

Traits:

- Wants peace
- Avoids confrontation
- Tries to keep everyone satisfied
- Labels problems as “personality differences”
- Delays difficult decisions
- Eventually needs to facilitate the final discussion

Role:

- Represents passive leadership and conflict avoidance

---

# 7. Character Knowledge Boundaries

Each character must know only part of the story.

## 7.1 Evan Knows

- The figures in Slide 6 were inconsistent
- The deadline was close
- He made the correction directly
- He did not see the private lunch chat
- He believes direct correction is efficient
- He knows the group dislikes him

## 7.2 Evan Does Not Know

- Daniel was rehearsing from the old version
- Mira told the player he was difficult before they met
- The group interpreted his short replies as hostility
- The group is considering removing him

## 7.3 Mira Knows

- Evan does not join informal activities
- Daniel is angry
- Evan changed the slides
- Several group members already dislike Evan

## 7.4 Mira Does Not Know

- Evan was not invited directly to lunch
- Evan corrected a real numerical problem
- Evan thought the deadline required immediate action

## 7.5 Daniel Knows

- His slides were changed
- He discovered the change during rehearsal
- He felt embarrassed and unprepared
- Evan did not inform him

## 7.6 Daniel Does Not Know

- Evan found an actual inconsistency
- Evan believed the change was urgent
- Evan did not intend to embarrass him

## 7.7 Sara Knows

- The group is divided
- Evan’s behaviour has caused conflict
- Gossip is spreading
- Submission is close

## 7.8 Sara Does Not Fully Understand

- The original version of the rumour
- The difference between impact and intention
- How exclusion has affected Evan
- How her avoidance has worsened the issue

---

# 8. Gameplay Flow

## 8.1 Total Runtime

Target:

- 10–12 minutes normal play
- 15 minutes maximum

## 8.2 Level Structure

### Level 1 — First Impression

Focus:

- Premature judgement
- Social assumptions
- Inclusion
- Curiosity

### Level 2 — The Edited Slides

Focus:

- Behaviour versus identity
- Giving feedback
- Ownership
- Communication boundaries

### Level 3 — Rumour and Final Meeting

Focus:

- Conflict mediation
- Group pressure
- Emotional awareness
- Social exclusion

---

# 9. Full Story Flow

## 9.1 Opening — The Label Comes First

Duration:

- About 1 minute

Scene:

- University discussion room
- Player meets the group
- Before Evan speaks, Mira says:

> “Just so you know, Evan can be quite difficult.”

Visual effect:

- Evan’s normal portrait briefly gains a subtle alien-like distortion

Purpose:

- Show that perception is influenced before direct interaction

Player objective:

- Observe the group
- Begin forming an impression

## 9.2 Level 1 — The Lunch Invitation

Duration:

- About 2 minutes

Event:

- The group finishes a discussion
- Mira, Daniel, and the player prepare to eat
- Evan remains behind
- The group says he never wants to join them

Initial interpretation:

> “He clearly does not want to be part of the group.”

Hidden fact:

- Lunch was only discussed in a private chat
- Evan was never directly invited

Possible player actions:

- Agree with the group
- Stay silent
- Suggest leaving Evan alone
- Ask whether anyone invited him
- Ask Evan directly
- Write a custom response

Expected AI features:

- Detect player tone
- Generate short NPC reaction
- Update group conformity
- Update social distance
- Update trust

Learning point:

- Observation is not the same as intention

Observed fact:

> Evan did not join lunch.

Assumption:

> Evan dislikes the group.

## 9.3 Level 2 — The Edited Slides

Duration:

- About 3 minutes

Event:

- Daniel finds that Evan changed Slide 6
- Daniel is angry because he rehearsed the old version
- The group begins blaming Evan

Investigation reveals:

- The original figures were inconsistent
- Evan corrected them
- Evan did not notify Daniel
- Daniel was genuinely affected

Two truths:

1. Evan’s correction was technically useful
2. Evan’s communication method caused a real collaboration problem

The player must avoid two extremes:

- “Evan did nothing wrong”
- “Evan thinks everyone is incompetent”

Possible player actions:

- Criticise Evan personally
- Fully defend Evan
- Ask for evidence
- Acknowledge Daniel’s impact
- Separate correctness from communication
- Suggest a file-change rule
- Write a custom response

Key example response:

> “Correcting the figures and changing someone’s work without telling them are two separate issues. We should address both.”

Learning point:

- Understanding intention does not erase impact
- Valid criticism should target behaviour, not identity

## 9.4 Level 3A — Rumour Mutation

Duration:

- About 2 minutes

Original statement:

> “The figures on Slide 6 are inconsistent.”

Mutation chain:

1. “Evan said Daniel’s figures are wrong.”
2. “Evan criticised Daniel again.”
3. “Evan thinks Daniel cannot do his part.”
4. “Evan thinks everyone in the group is incompetent.”

The player sees:

- Original statement
- Daniel’s interpretation
- Mira’s retelling
- Final group belief

Possible actions:

- Repeat the rumour
- Correct the wording
- Ask for the original message
- Defend Evan without checking
- Ignore the discussion
- Write a custom response

Learning point:

- Information changes through emotion and social transmission

## 9.5 Perspective Shift

Duration:

- About 2 minutes

Prompt:

> “Replay this event from Evan’s perspective?”

The player replays a key event as Evan.

The player discovers:

- Evan was not included in the lunch chat
- He saw a deadline risk
- He believed direct correction was necessary
- He did not know Daniel was using the older version
- He assumed the group preferred efficiency
- He did not recognise the emotional impact
- He already expected the group to interpret him negatively

Visual effect:

- Evan appears normal
- The “Alien Filter” disappears
- Other group members may briefly appear distant, blurred, or distorted

Meaning:

> In someone else’s world, you may be the alien.

Important:

- This scene must not prove Evan is innocent
- It only reveals missing information

## 9.6 Level 3B — Final Group Meeting

Duration:

- About 2 minutes

The group discusses whether Evan should remain in the project.

The player must respond to:

- Daniel’s real frustration
- Evan’s communication failure
- Mira’s rumour amplification
- Sara’s leadership avoidance
- The team’s social exclusion
- Submission deadline pressure

The player can:

- Support removing Evan
- Defend Evan
- Propose a workflow rule
- Ask Evan to acknowledge the impact
- Ask the group to stop using personal labels
- Set a healthy boundary
- Write a final custom response

This is the most important free-text interaction.

The AI should classify whether the player:

- Separates behaviour from personality
- Acknowledges impact
- Requests accountability
- Reduces conflict
- Attacks identity
- Blindly follows the group
- Blindly defends Evan
- Creates an actionable plan

## 9.7 Ending and Growth Report

Duration:

- About 1 minute

Final line:

> **Who made the Alien?**

The result should include:

- Ending name
- Short narrative summary
- Relational Intelligence Score
- Skill dimensions
- Assumptions challenged
- Unverified claims repeated
- Behaviours addressed
- Missed clarification opportunities
- Recommended next mission
- XP and badge

---

# 10. Possible Endings

## 10.1 Mutual Adjustment

- Evan stays
- Evan agrees to notify the group before changes
- Team members agree to communicate directly
- The group stops using the “Alien” label
- Nobody becomes best friends
- Collaboration becomes workable

> Belonging does not require sameness.

## 10.2 Healthy Boundary

- Evan’s behaviour is addressed specifically
- The group creates rules
- Clear consequences are established
- Respect is maintained
- Evan may remain or leave depending on response

> Understanding does not remove accountability.

## 10.3 Forced Harmony

- Sara asks everyone to “be respectful”
- No real issue is resolved
- Gossip continues privately
- Surface peace hides ongoing tension

> Silence is not resolution.

## 10.4 Assimilation

- Evan forces himself to act like everyone else
- Uses more emojis
- Joins every activity
- Stops questioning decisions
- Team accepts him
- Evan becomes exhausted and less authentic

> Acceptance that requires self-erasure is not belonging.

## 10.5 Exclusion

- Evan is removed
- The group feels relieved
- Later, another member becomes the new outsider

> A group that needs an alien will eventually create another one.

---

# 11. Signature Game Mechanics

## 11.1 Rumour Mutation

The system stores:

- Original message
- Character interpretation
- Retold message
- Final group belief

```json
{
  "original": "The figures on Slide 6 are inconsistent.",
  "interpretations": [
    {
      "character": "Daniel",
      "meaning": "Evan does not trust my work."
    },
    {
      "character": "Mira",
      "retelling": "Evan criticised Daniel again."
    }
  ],
  "group_belief": "Evan thinks everyone is incompetent."
}
```

AI role:

- Generate controlled variations
- Stay within story facts
- Reflect character emotions and relationships

## 11.2 Alien Perception Filter

Evan must initially look like a normal student.

As the group label becomes stronger, the system gradually adds:

- Glitch
- Unnatural shadows
- Alien outline
- Distorted portrait
- Floating negative words
- Changed sound design
- Reduced saturation around Evan

During Perspective Shift:

- The filter disappears
- Evan looks normal
- The group may appear more distant or distorted

## 11.3 Fact Versus Assumption

The system classifies statements into:

- Observed fact
- Interpretation
- Unverified claim
- Unanswered question

```text
Observed Fact:
Evan changed Slide 6 at 11:42 PM.

Interpretation:
Evan wanted to prove Daniel was incompetent.

Unverified Claim:
Evan thinks the whole group is useless.

Unanswered Question:
Why did Evan believe the change was urgent?
```

## 11.4 Perspective Replay

One important event is replayed from another character’s perspective.

The physical event stays the same.

The available information changes.

This should be interactive, not only a cutscene.

## 11.5 Three Plus One Response System

Every major interaction includes:

- Three predefined choices
- One custom text field

Purpose:

- Fast play
- Controlled story
- AI-native interaction
- Real player expression

## 11.6 Persistent Character Memory

```json
{
  "characterId": "evan",
  "trustInPlayer": 34,
  "defensiveness": 68,
  "memories": [
    "Player stayed silent when Mira called Evan creepy.",
    "Player later asked Evan for his side of the story."
  ]
}
```

Characters should use memory in later responses.

---

# 12. Relational Intelligence Scoring

## 12.1 Visible Scores

### Communication Clarity

- Clear wording
- Specific description
- Direct questions
- Actionable suggestions

### Respect and Etiquette

- Avoiding insults
- Avoiding humiliation
- Respecting boundaries
- Appropriate tone

### Emotional Awareness

- Recognising frustration
- Acknowledging impact
- De-escalating emotion
- Perspective-taking

### Expression Quality

- Relevance
- Constructiveness
- Completeness
- Context suitability

### Overall Relational Intelligence

Composite score from all dimensions.

## 12.2 Hidden Story State

Track:

- Group conformity
- Social distance
- Team tension
- Rumour strength
- Evan defensiveness
- Daniel frustration
- Mira influence
- Sara avoidance
- Boundary clarity
- Psychological safety

---

# 13. Immediate Feedback

After each level, show a short card:

```text
RELATIONAL INSIGHT

+ You asked for evidence before judging intention.
+ Your boundary was specific and actionable.
- Your wording dismissed Daniel’s frustration.

Clarity: 82
Respect: 74
Emotional Awareness: 67
Expression Quality: 79
```

Keep feedback short and game-like.

---

# 14. Progression and Gamification

## 14.1 Long-Term Level Framework

| Level Range | Category |
|---|---|
| 1–20 | Everyday Interaction |
| 21–50 | Team Collaboration |
| 51–80 | Conflict Resolution |
| 81–100 | High-Stakes and Cross-Cultural Communication |

The MVP only implements three levels.

## 14.2 MVP Levels

- Level 1 — First Impression
- Level 2 — The Edited Slides
- Level 3 — Rumour and Final Meeting

## 14.3 Rewards

- XP
- Mission completion
- One-day streak
- Badge
- Ending unlock
- Recommended next mission

Possible badges:

- Question the Label
- Boundary Builder
- Perspective Seeker
- Rumour Breaker
- Clear Communicator

## 14.4 Daily Mission Card

```text
TODAY’S RELATIONAL MISSION

Group Assignment: Not One of Us
Difficulty: Beginner → Intermediate
Estimated Time: 10–12 minutes
Reward: +250 XP
Badge: Question the Label
```

Only one daily mission must work in the MVP.

---

# 15. AI System Design

## 15.1 AI Responsibilities

AI should handle:

1. Free-text intent classification
2. Tone and emotion classification
3. Short NPC response generation
4. Character memory updates
5. Rumour mutation
6. Final growth report
7. Optional scenario package generation
8. AI-generated visual or audio content

AI should not fully control the story.

## 15.2 Authored Layer

Controls:

- Main plot
- Scene order
- Required information
- Character backstories
- Ending conditions
- Safety boundaries
- Maximum interaction length
- Narrative checkpoints

## 15.3 AI Layer

Controls:

- Local wording
- Personalised NPC response
- Tone interpretation
- Memory-based reaction
- Rumour variation
- Reflection text
- Scenario package generation

## 15.4 Branch and Rejoin Pattern

```text
Player choice or free-text
↓
AI classifies the response
↓
NPC generates a short reaction
↓
Scores and memory update
↓
Story returns to an authored checkpoint
```

This prevents endless dialogue, story drift, inconsistent facts, and long runtime.

---

# 16. Suggested AI Classification Schema

```json
{
  "intent": [
    "ask_for_evidence",
    "join_gossip",
    "defend_without_evidence",
    "set_boundary",
    "attack_identity",
    "acknowledge_impact",
    "deescalate",
    "avoid_issue",
    "propose_solution"
  ],
  "tone": [
    "calm",
    "curious",
    "defensive",
    "accusatory",
    "empathetic",
    "dismissive",
    "hostile",
    "avoidant"
  ],
  "scores": {
    "clarity": 0,
    "respect": 0,
    "emotionalAwareness": 0,
    "expressionQuality": 0
  },
  "storyEffects": {
    "groupConformityDelta": 0,
    "socialDistanceDelta": 0,
    "teamTensionDelta": 0,
    "evanTrustDelta": 0,
    "danielFrustrationDelta": 0
  },
  "shortReason": ""
}
```

---

# 17. NPC Response Rules

NPC responses should:

- Be 1–3 sentences
- Stay in character
- Stay within known information
- Reflect current emotion
- Reflect previous player action
- Avoid revealing hidden facts too early
- Avoid educational lectures
- Return quickly
- Have a deterministic fallback

Example prompt:

```text
You are Mira, a university student in a group project.

Personality:
Friendly, socially influential, conflict-avoidant, quick to interpret behaviour.

Known facts:
- Evan changed Daniel’s slide.
- Daniel is upset.
- Evan did not join lunch.
- You do not know that Evan was not directly invited.

Current emotional state:
Concerned and slightly defensive.

Memory:
The player previously asked you for evidence instead of agreeing with your judgement.

Player message:
"{PLAYER_INPUT}"

Respond in 1–2 natural sentences.
Do not reveal facts Mira does not know.
Do not explain the game mechanics.
```

---

# 18. Fallback Behaviour

If the AI API fails:

- Use a prewritten fallback reaction
- Continue the story
- Never block the player

```json
{
  "sceneId": "edited_slides",
  "fallbackResponses": {
    "ask_for_evidence": "Daniel hesitates. 'I only know what I saw. He changed it without telling me.'",
    "attack_identity": "Mira looks uncomfortable. 'Maybe we should focus on what happened, not what kind of person he is.'",
    "set_boundary": "Sara nods. 'A change-notification rule would prevent this from happening again.'"
  }
}
```

---

# 19. Perspective Play Generator

## 19.1 Purpose

Demonstrate how new short social scenarios can be created.

It is not the main game.

## 19.2 Creator Inputs

Ask for:

- Setting
- Number of characters
- Character roles
- Who is treated as the outsider
- Observed behaviour
- Assumptions made
- Actual conflict
- Original statement
- Rumour mutation
- Hidden information
- Alternative perspective
- Desired learning question

## 19.3 Privacy Rules

The generator must:

- Warn about real names
- Avoid real photos
- Avoid identifiable school/company details
- Anonymise details
- Fictionalise the story
- Avoid mental health diagnosis
- Avoid declaring one person a villain
- Include at least two plausible perspectives
- Separate facts from interpretations
- Keep generated stories private by default

## 19.4 Generated Output

```text
Game Package
├── Title
├── Synopsis
├── Runtime target
├── Character profiles
├── Knowledge boundaries
├── Three scenes
├── Dialogue options
├── Free-text evaluation rules
├── Rumour chain
├── Perspective shift
├── Endings
├── Art prompts
├── Audio cues
└── Game-state JSON
```

Example:

```json
{
  "title": "The Fourth Member",
  "durationMinutes": 12,
  "setting": "university_group_assignment",
  "characters": [],
  "scenes": [],
  "rumourChain": [],
  "perspectiveShift": {},
  "endings": [],
  "artPrompts": [],
  "audioCues": []
}
```

---

# 20. AI Creation Requirement

The hackathon requires at least one fully AI-generated content module.

## 20.1 Recommended Primary Module — Game Key Art

Use Miora or WorkBuddy to generate:

- Cover art
- University discussion room
- Campus café
- Character concepts
- Character expressions
- Alien Perception overlays
- UI art

Keep:

- Prompts
- Generation history
- Draft versions
- Final assets
- Screenshots for PPT

## 20.2 Optional Audio Module

Generate:

- Main menu music
- Perspective Shift audio
- Ending theme
- Message sound
- Ambient sound

Full voice acting is not required.

## 20.3 AI Worldbuilding Module

The Perspective Play Generator can be a second module if it fully generates:

- Character profiles
- Scenario structure
- Rumour chain
- Perspective Shift
- Endings
- Art prompts

---

# 21. Technical Architecture

## 21.1 Frontend

Recommended:

- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand or React Context
- Framer Motion if time allows

Core components:

- Main menu
- Mission hub
- Scene renderer
- Character portrait panel
- Dialogue box
- Choice panel
- Free-text input
- Group chat
- Private message
- Score card
- Perspective Shift
- Ending report
- Generator form

## 21.2 Backend

Recommended:

- Python FastAPI

Responsibilities:

- AI orchestration
- Input classification
- NPC reply
- Memory summarisation
- Rumour mutation
- Ending reflection
- Generator output
- Logging

Node.js is acceptable if faster for the team.

## 21.3 Data Storage

MVP:

- Local JSON for authored story
- localStorage for player progress
- In-memory backend state
- Optional lightweight database

Persist:

- Current level
- Choices
- Scores
- Character trust
- Memory
- Ending unlocks
- XP
- Badge
- Generated scenario

## 21.4 Deployment

Deploy to a browser-accessible URL using Tencent Cloud or another accepted browser deployment route.

---

# 22. Suggested TypeScript Data Models

```ts
export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string[];
  communicationStyle: string[];
  emotionalState: string;
  trustInPlayer: number;
  defensiveness: number;
  knownFacts: string[];
  assumptions: string[];
  memories: string[];
  portraitByEmotion: Record<string, string>;
}
```

```ts
export interface Scene {
  id: string;
  level: number;
  title: string;
  background: string;
  music?: string;
  dialogue: DialogueLine[];
  decisionPoints: DecisionPoint[];
  checkpointId: string;
}
```

```ts
export interface DecisionPoint {
  id: string;
  prompt: string;
  predefinedChoices: Choice[];
  allowFreeText: boolean;
  aiCharacterId: string;
  maxFollowUpTurns: number;
}
```

```ts
export interface Choice {
  id: string;
  text: string;
  tags: string[];
  scoreEffects: Partial<SkillScores>;
  storyEffects: Record<string, number>;
  fallbackNpcResponse?: string;
}
```

```ts
export interface SkillScores {
  clarity: number;
  respect: number;
  emotionalAwareness: number;
  expressionQuality: number;
  overall: number;
}
```

```ts
export interface GameState {
  currentLevel: number;
  currentSceneId: string;
  playerChoices: PlayerChoiceRecord[];
  characters: Record<string, Character>;
  skillScores: SkillScores;
  xp: number;
  streak: number;
  unlockedBadges: string[];
  hiddenState: {
    groupConformity: number;
    socialDistance: number;
    teamTension: number;
    rumourStrength: number;
    boundaryClarity: number;
  };
}
```

---

# 23. Suggested Folder Structure

```text
alien-apparently/
├── README.md
├── docs/
│   ├── proposal.md
│   ├── story-bible.md
│   ├── scene-flow.md
│   ├── ai-prompts.md
│   └── submission-checklist.md
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── backgrounds/
│   │   │   ├── characters/
│   │   │   ├── audio/
│   │   │   └── ui/
│   │   ├── components/
│   │   │   ├── DialogueBox.tsx
│   │   │   ├── ChoicePanel.tsx
│   │   │   ├── FreeTextInput.tsx
│   │   │   ├── CharacterPortrait.tsx
│   │   │   ├── GroupChat.tsx
│   │   │   ├── ScoreCard.tsx
│   │   │   ├── MissionHub.tsx
│   │   │   └── EndingReport.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── GamePage.tsx
│   │   │   ├── EndingPage.tsx
│   │   │   └── GeneratorPage.tsx
│   │   ├── store/
│   │   │   └── gameStore.ts
│   │   ├── data/
│   │   │   ├── characters.json
│   │   │   ├── scenes.json
│   │   │   ├── endings.json
│   │   │   └── fallbackResponses.json
│   │   ├── services/
│   │   │   └── aiService.ts
│   │   └── types/
│   │       └── game.ts
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── classify.py
│   │   │   ├── npc_response.py
│   │   │   ├── rumour.py
│   │   │   ├── report.py
│   │   │   └── generator.py
│   │   ├── prompts/
│   │   ├── schemas/
│   │   └── services/
│   ├── requirements.txt
│   └── .env.example
└── deployment/
    └── README.md
```

---

# 24. API Endpoints

## Classify Free-Text

```http
POST /api/classify-response
```

## Generate NPC Response

```http
POST /api/npc-response
```

## Generate Rumour Mutation

```http
POST /api/rumour-mutation
```

## Generate Growth Report

```http
POST /api/growth-report
```

## Generate Scenario Package

```http
POST /api/generate-scenario
```

---

# 25. UI Screens

## Home Screen

- Game title
- Tagline
- Start
- Language if implemented
- Credits

## Mission Hub

- Daily mission
- Level
- XP
- Streak
- Reward
- Estimated time

## Visual Novel Scene

- Background
- Character portraits
- Character name
- Dialogue
- Continue

## Decision Screen

- Three choices
- Free-text
- Submit

## Group Chat

- Message history
- Original statement
- Retelling
- Player reply

## Perspective Shift

- Transition
- New point of view
- Hidden information
- Interactive choice

## Feedback Card

- Skill scores
- Two strengths
- One improvement

## Ending Report

- Ending
- Score
- Skill dimensions
- Badge
- XP
- Replay
- Generator link

---

# 26. Art Direction

Recommended:

> **2D illustrated visual novel with subtle glitch and alien-perception effects**

Required backgrounds:

1. University discussion room
2. Campus café or corridor
3. Group chat screen
4. Final meeting room
5. Perspective Shift version

Expressions per character:

- Neutral
- Happy
- Uncomfortable
- Defensive
- Angry
- Hurt
- Surprised

Alien filter:

- Glitch overlay
- Alien silhouette
- Negative words
- Distorted shadow
- Transition effect

---

# 27. Audio Direction

Use:

- Main menu music
- Campus ambience
- Message sound
- Tension music
- Perspective Shift audio
- Ending theme

Do not require full voice acting.

---

# 28. Accessibility

Support:

- Readable font size
- High contrast
- Subtitle-first interaction
- Audio controls
- Keyboard-accessible choices if possible
- No colour-only meaning
- Short scenes
- Skip animation

Future languages:

- English
- Chinese
- Bahasa Malaysia

MVP may be English-only.

---

# 29. Ethical and Safety Design

Do not:

- Diagnose personality or mental health
- Label neurodivergence
- Use real people without permission
- Use real names or photos
- Encourage humiliation
- Present one person as automatically evil
- Tell players to tolerate harmful behaviour
- Publicise private stories by default

Do:

- Separate facts from assumptions
- Include multiple perspectives
- Support healthy boundaries
- Preserve accountability
- Avoid one perfect moral answer
- Anonymise generated content

---

# 30. Development Strategy

## Phase 1 — Story Lock

Create:

- Story bible
- Character sheets
- Knowledge boundaries
- Three scenes
- Rumour chain
- Endings
- 12-minute timeline

## Phase 2 — Non-AI Vertical Slice

Build:

- Start screen
- Scene navigation
- Fixed dialogue
- Choices
- Group chat
- One ending
- Basic scoring

The game must be playable before adding AI.

## Phase 3 — AI Integration

Add:

- Free-text classification
- Tone detection
- Short NPC responses
- Memory
- Growth report

## Phase 4 — Signature Mechanics

Add:

- Rumour Mutation
- Perspective Shift
- Alien Filter
- Multiple endings

## Phase 5 — Game Layer

Add:

- Mission hub
- XP
- Badge
- Level labels
- Daily mission
- Feedback cards

## Phase 6 — Supporting Generator

Add:

- Structured form
- JSON output
- One generated alternative scenario package

Do not build a second full game.

## Phase 7 — Test and Submit

Complete:

- User testing
- Duration test
- AI fallback
- Deployment
- Demo video
- PPT
- CodeBuddy history
- Submission

---

# 31. Team Responsibilities

## Connie

- Product direction
- Story design
- Character relationships
- User flow
- Visual novel frontend
- Dialogue UI
- Group chat UI
- Score presentation
- User testing
- Proposal
- PPT
- Pitch
- Demo flow

## Jia Ji

- Backend
- AI architecture
- Prompt design
- Free-text classification
- Tone analysis
- Character memory
- NPC response logic
- Rumour Mutation
- State transitions
- Ending logic
- Technical testing

## Shared

- Final story review
- AI-generated assets
- Integration
- Playtesting
- Demo video
- Submission
- CodeBuddy documentation

---

# 32. Development Timeline

## Day 1

- Scope lock
- Team roles
- Story
- Characters
- Levels
- MVP freeze

## Day 2–3

- Story bible
- Scripts
- Wireframes
- Data models
- Prompt rules

## Day 4–6

- Frontend core
- Visual novel engine
- Choices
- Group chat
- Basic state

## Day 7–9

- AI backend
- Classification
- NPC response
- Memory
- Fallbacks

## Day 10–11

- Rumour Mutation
- Alien Filter
- Perspective Shift
- Endings

## Day 12

- First complete playable build
- Runtime check
- Remove slow content

## Day 13

- Generator prototype
- Scenario JSON

## Day 14

- Internal testing
- AI latency
- Failure handling
- Browser compatibility

## Day 15

- User testing with 5–8 users

## Day 16

- Fixes
- Demo recording
- PPT
- Submission preparation

## Submission Day

- Regression test
- Deploy
- Verify link
- Export CodeBuddy history
- Upload early

---

# 33. MVP Freeze

## Must Have

- One complete story
- Four characters
- Three levels
- Three choices plus free-text
- AI classification
- AI NPC response
- Tone recognition
- Rumour Mutation
- Perspective Shift
- Social skill scores
- Immediate feedback
- Growth report
- Three endings
- XP and badge
- AI-generated key art
- Browser deployment
- CodeBuddy history export

## Nice to Have

- Multiple languages
- AI audio
- More endings
- More badges
- Better animations
- Generator preview
- Retry comparison
- Social media bonus post

## Out of Scope

- Open-world campus
- Multiplayer
- Full voice acting
- 100 completed levels
- Parent/teacher dashboard
- Mobile app
- Unlimited generation
- Psychological profiling
- Second full game

---

# 34. Testing Plan

## Functional

Test:

- Every route
- Every decision
- Free-text
- AI timeout
- Fallback
- Scores
- Memory
- Endings
- Replay
- Refresh
- Deployment

## User Testing

Use 5–8 university students or early-career users.

Measure:

- Completion time
- Confusing scenes
- AI relevance
- Most memorable mechanic
- Fact-versus-assumption understanding
- Perspective Shift impact
- Whether the game feels preachy
- Ending fairness

Questions:

- When did you begin to dislike Evan?
- What changed your judgement?
- Did the game force you to support Evan?
- What was most memorable?
- Were AI responses believable?
- Did choices affect later dialogue?
- What does “Who made the Alien?” mean?

---

# 35. Success Metrics

The MVP succeeds if:

- 90% of testers finish under 15 minutes
- Players understand fact versus assumption
- Perspective Shift is remembered
- AI replies remain relevant
- Choices create consequences
- Final report is useful
- The experience feels like a game
- Browser deployment is stable

---

# 36. Submission Requirements

Prepare:

1. Browser game link
2. Demo video
3. Project introduction PPT
4. CodeBuddy conversation history
5. Team information
6. AI-created module explanation
7. Optional social media post

PPT should include:

- Problem
- Solution
- Target users
- Gameplay
- AI system
- AI-created module
- CodeBuddy use
- Architecture
- Demo
- Team
- Future expansion

---

# 37. Judging Strategy

Weights:

- Theme Alignment — 30
- Use of AI Tools — 40
- Game Quality — 30

## Theme Alignment

Show:

- Real university conflict
- Social integration
- Communication practice
- Conflict resolution
- Relational intelligence

## Use of AI Tools

Show:

- CodeBuddy history
- AI NPCs
- Tone recognition
- Character memory
- Rumour Mutation
- AI report
- AI-generated art
- Perspective Play Generator

## Game Quality

Show:

- Complete loop
- Clear objective
- Good pacing
- 10–12 minutes
- Strong visual identity
- Consequences
- Endings
- Replay value

---

# 38. Risks and Mitigation

## AI Goes Off Topic

- Short replies
- Strong prompts
- Knowledge boundaries
- Authored checkpoints
- Fallbacks

## Runtime Exceeds 15 Minutes

- Three levels only
- Maximum two AI turns per major scene
- Short dialogue
- Skip button
- Early duration tests

## Feels Like E-Learning

- Visual storytelling
- Tension
- Rumour mechanic
- Alien Filter
- Endings
- XP
- Minimal lectures

## Generator Takes Too Long

- One form
- One JSON output
- No second full game

## Visual Inconsistency

- One art style
- Limited backgrounds
- Limited expressions
- Save prompts

## API Failure

- Fallback responses
- Preloaded story
- Stable build
- Optional cached demo responses

---

# 39. Definition of Done

The project is done when:

- Public browser link works
- Player can start and finish all three levels
- Predefined and free-text responses work
- AI classifies tone and intent
- NPCs react
- Rumour Mutation is shown
- Perspective Shift is playable
- Scores are calculated
- An ending is reached
- Growth report is displayed
- Runtime is under 15 minutes
- AI-created module is documented
- CodeBuddy history is exported
- Demo video and PPT are ready

---

# 40. First Tasks for Codex

## Task 1 — Repository

Create frontend, backend, docs, data, and deployment folders.

## Task 2 — Types

Create data types for:

- Character
- Scene
- Dialogue
- Decision
- Choice
- Score
- Game state
- Ending

## Task 3 — Static Story Data

Create:

- characters.json
- scenes.json
- endings.json
- fallbackResponses.json

## Task 4 — Non-AI Engine

Implement:

- Scene renderer
- Dialogue
- Portraits
- Choices
- Free-text placeholder
- Transitions
- Basic score
- Full flow

## Task 5 — Group Chat

Implement original message, interpretation, retelling, and player response.

## Task 6 — AI API Stubs

Mock:

- classify-response
- npc-response
- growth-report
- generate-scenario

## Task 7 — Real AI

Replace mock endpoints with Tencent-compatible AI integration.

## Task 8 — Signature Mechanics

Implement:

- Alien Filter
- Perspective Shift
- Endings
- Final report

## Task 9 — Mission Hub

Implement:

- Level
- XP
- Badge
- Daily mission
- Start

## Task 10 — Deployment

Provide:

- Environment variable setup
- Build commands
- Deployment steps
- Health check
- Public URL verification

---

# 41. Final Project Statement

**Alien, Apparently** is not a game that teaches players to like everyone.

It asks players to recognise how quickly groups convert unfamiliar behaviour into identity, how rumours transform facts, how exclusion changes people, and how difficult behaviour can be addressed without cruelty or blind conformity.

The player may still dislike Evan.

The challenge is to decide whether they are responding to:

- What Evan actually did
- What the group assumed
- What the player was told
- Or the Alien that everyone created together

> **Who made the Alien?**
