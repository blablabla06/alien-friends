# Project: Alien Friends
A game where players practice conversations with people who feel 
emotionally distant or hard to reach in real life — "alien friends" — 
across escalating tiers of difficulty.

## Tech stack
- Frontend: React (Vite) + Tailwind CSS
- AI: LLM API for NPC dialogue, suggested replies, and scoring
- No backend persistence needed for MVP demo

## Core loop
Home → Select Scenario → Dialogue Screen (chat with AI NPC + 3 suggested 
replies + free-text option, real-time mood meter) → Results Screen 
→ Growth Report / progression update

## Scenarios (7 total, 3 tiers)
Easy: Stranger (coffee shop), Coworker-light (office)
Medium: Old friend/drifted (park bench), Coworker-conflict (office), 
Uni teammate (study room)
Hard: Mum (home kitchen), Old best friend/falling-out (supermarket)

## Visual Direction
- Mood: warm, hopeful, intimate — NOT sci-fi, NOT clinical
- Palette: indigo background (#1A1B3A), coral/amber accent (#FF8B5E), 
  teal UI chrome (#4ECDC4), warm off-white text (#F5F0E8)
- Design motif: color overlay warms from cool to warm as connection 
  score rises within a scenario
- Typography: rounded friendly headers (Quicksand/Nunito), clean body 
  text (Inter/Work Sans)

## Coding conventions
- Functional React components, hooks only
- One job per file, small components
- LLM prompt templates in /src/prompts/, never inlined in components
- Game data (characters, scenarios) in /src/data/ as JSON
- Core logic (scoring, sentiment, dialogue prompt-building) in /src/lib/, 
  pure functions where possible