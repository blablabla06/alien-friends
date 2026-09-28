# Alien, Apparently 👽

**A bilingual (English / 中文) AI-powered visual novel about how people get labelled "the alien" — and what it takes to reach them.**

🏆 Top 5, Game Track — AI CAN DO IT Hackathon 2026 Malaysia
🎮 Play it live: https://alien-friends.alien-friends.workers.dev

---

## What it is

Alien, Apparently is a social-skills game where every character is driven by an LLM. You don't pick from a fixed script — you type (or choose) what you'd actually say, and the characters react based on their personality, what they know, and how much they trust you.

It has two connected experiences:

| Mode | What you do | Scored on |
|---|---|---|
| **Main Story** — *Alien, Apparently* | A 6-chapter university group-project story. Mira, Daniel, Sara and Evan — the teammate everyone has decided is "the alien". Hidden story state decides which of four endings you reach: **Exclusion, Healthy Boundaries, Mutual Adjustment, Forced Harmony**. | Clarity · Respect · Awareness · Boundary |
| **Practice Mode** | 7 standalone one-on-one conversations (a stranger, coworkers, an old friend, a uni teammate, Mum, an old best friend) across Easy / Medium / Hard tiers. | Clarity · Politeness · Empathy · Expression |

### Design highlights

- **Knowledge boundaries** — each character has a defined scope of what they know (`doesNotKnow`) and what they will never do (`neverDo`), so they can't leak information they shouldn't have.
- **Reveal-gated vulnerability** — characters only open up once your empathy crosses a threshold.
- **Dual-truth Evan** — the story shows you two versions of the same person (`evan-early` → `evan-full`).
- **Live mood feedback** — the scene colour shifts warm or cool as the conversation goes.
- **Fully bilingual** — UI, dialogue and voice lines in English and Chinese.

---

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19 (Vite) · Tailwind CSS · React Router · Recharts |
| Backend | Node.js / Express proxy (keeps the API key server-side) |
| AI | DeepSeek API |
| Deployment | Cloudflare Workers (Wrangler) |
| Art | Miora (AI-generated character portraits and backgrounds) |
| Voice | VoxFlow |
| Dev assistant | CodeBuddy |

---

## Getting started

**Requirements:** Node.js 18+ and a DeepSeek API key.

```bash
git clone https://github.com/blablabla06/alien-friends.git
cd alien-friends
npm install

cp .env.example .env
# open .env and set DEEPSEEK_API_KEY=your_key_here

npm run dev:all
```

This starts the frontend (Vite) and the API server (port 3001) together. Open the URL Vite prints (usually http://localhost:5173).

| Script | What it does |
|---|---|
| `npm run dev:all` | Frontend + backend together |
| `npm run dev` | Frontend only |
| `npm run dev:server` | Backend only |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |

### Deploy

```bash
npm run build
npx wrangler deploy
```

Set `DEEPSEEK_API_KEY` as a secret on the Worker (`npx wrangler secret put DEEPSEEK_API_KEY`).

---

## Project structure

```text
alien-friends/
├── README.md
├── CHANGELOG.md              # version history (v1 → v10)
├── CODEBUDDY.md              # context file for the CodeBuddy assistant
├── docs/
│   └── project-handoff.md    # original design doc: story, mechanics, plan
├── server/
│   └── index.js              # Express proxy → DeepSeek
├── src/
│   ├── assets/
│   │   ├── audio/            # background music
│   │   ├── avatars/          # Practice Mode characters
│   │   ├── backgrounds/      # scene backgrounds
│   │   ├── characters/       # Main Story portraits + full-body art
│   │   └── voice/            # voice lines: main-en / main-ch / practice-en / practice-ch
│   ├── components/           # reusable UI (ChatBubble, MoodMeter, ScoreBar…)
│   ├── context/              # game state, language, music providers
│   ├── data/
│   │   ├── alien-characters/ # Main Story character definitions
│   │   ├── characters/       # Practice Mode character definitions
│   │   └── scenarios/        # Practice Mode scenarios
│   ├── lib/                  # prompts, LLM client, scoring, parsing, i18n
│   ├── pages/                # screens (Home, AlienMain, Dialogue, Results…)
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
├── vite.config.js
├── tailwind.config.js
└── wrangler.jsonc
```
