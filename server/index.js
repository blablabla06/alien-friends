/**
 * server/index.js
 * Express proxy — forwards chat requests to TokenHub via the openai SDK.
 *
 * Authentication: Bearer token (TOKENHUB_API_KEY), server-side only.
 * Endpoint: https://tokenhub-intl.tencentcloudmaas.com/v1
 * Model: deepseek-v4-flash-202605
 *
 * POST /api/chat  { messages: [{ role, content }, …] }
 *   → 200  { ok: true,  text: string }
 *   → 4xx/5xx { ok: false, error: string }
 *
 * GET /api/health
 *   → 200  { ok: true, message: string, credentials: string }
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const MODEL = 'deepseek-v4-flash-202605'

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json())

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
  })
)

// ─── /api/chat ────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.TOKENHUB_API_KEY

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: 'TOKENHUB_API_KEY is not set in .env',
    })
  }

  const { messages } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res
      .status(400)
      .json({ ok: false, error: '`messages` must be a non-empty array.' })
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://tokenhub-intl.tencentcloudmaas.com/v1',
  })

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.8,
      timeout: 14_000,   // 14 s — just under the browser-side 15 s AbortController
    })

    const text = response.choices?.[0]?.message?.content

    if (typeof text !== 'string') {
      console.error('[server] Unexpected response shape:', JSON.stringify(response))
      return res
        .status(502)
        .json({ ok: false, error: 'Unexpected response shape from TokenHub.' })
    }

    return res.json({ ok: true, text })
  } catch (err) {
    const detail = err?.message ?? String(err)
    console.error('[server] TokenHub error:', detail)
    return res.status(502).json({ ok: false, error: `TokenHub error: ${detail}` })
  }
})

// ─── /api/alien-npc ───────────────────────────────────────────────────────────
//
// Generate an NPC reaction for the "Alien, Apparently" main game.
//
// POST /api/alien-npc
// Body: {
//   character:        object   — full alien-characters JSON (mira/daniel/evan/sara)
//   sceneContext:     object   — { id, level, title, subtitle, narration, fact?, assumption? }
//   dialogueHistory:  array    — [{ role:'user'|'npc', text:string }]
//   playerInput:      string   — the player's message this turn
//   gameState?:       object   — { evanTrust, labelPower, rumour, tension }
//   perspectiveShift?: boolean — true when replaying as Evan
//   lang?:            'en'|'zh'
// }
// Response: { ok:true, npcResponse:string, moodShift:'better'|'worse'|'neutral' }
//         | { ok:false, error:string }

app.post('/api/alien-npc', async (req, res) => {
  // Accepts a pre-built `messages` array (built by buildAlienNpcPrompt or
  // buildPerspectiveShiftPrompt on the client) plus a `mode` hint so the
  // server knows how to unpack the response.
  //
  // POST /api/alien-npc
  // Body: {
  //   messages:  Message[]           — pre-built prompt from aiCharacterPrompt.js
  //   mode?:     'normal'|'perspective'  — controls which JSON key to read back
  //   temperature?: number           — default 0.75
  // }
  // Response: { ok:true, npcResponse:string, moodShift:'better'|'worse'|'neutral' }
  //         | { ok:false, error:string }

  const apiKey = process.env.TOKENHUB_API_KEY
  if (!apiKey) return res.status(500).json({ ok: false, error: 'TOKENHUB_API_KEY not set.' })

  const { messages, mode = 'normal', temperature = 0.75 } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: '`messages` must be a non-empty array.' })
  }

  const client = new OpenAI({ apiKey, baseURL: 'https://tokenhub-intl.tencentcloudmaas.com/v1' })

  try {
    const response = await client.chat.completions.create({ model: MODEL, messages, temperature, timeout: 14_000 })
    const raw = response.choices?.[0]?.message?.content

    if (typeof raw !== 'string') {
      return res.status(502).json({ ok: false, error: 'Unexpected response shape from model.' })
    }

    let text = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()
    const first = text.indexOf('{'), last = text.lastIndexOf('}')
    if (first !== -1 && last > first) text = text.slice(first, last + 1)

    let parsed
    try { parsed = JSON.parse(text) } catch {
      return res.status(502).json({ ok: false, error: 'Model returned non-JSON.', raw })
    }

    // perspectiveShift builds return evanNarration; normal turns return npcResponse
    const npcResponse = mode === 'perspective'
      ? (parsed.evanNarration ?? parsed.npcResponse ?? '')
      : (parsed.npcResponse ?? '')
    const moodShift = parsed.moodShift ?? 'neutral'

    return res.json({ ok: true, npcResponse, moodShift })
  } catch (err) {
    return res.status(502).json({ ok: false, error: `TokenHub error: ${err?.message ?? String(err)}` })
  }
})

// ─── /api/alien-score ─────────────────────────────────────────────────────────
//
// Score a player message using the alien-game dimensions:
//   clarity, respect, awareness, boundary
//
// POST /api/alien-score
// Body: {
//   userText:             string
//   character:            object  — alien-characters JSON
//   sceneContext:         object  — { level, narration, fact?, assumption? }
//   conversationContext?: array   — [{ role, text }]
//   lang?:                'en'|'zh'
// }
// Response: { ok:true, clarity, respect, awareness, boundary, composite, feedback }
//         | { ok:false, error:string }

app.post('/api/alien-score', async (req, res) => {
  // Accepts a pre-built `messages` array (built by buildAlienScoringPrompt on
  // the client) and returns scored dimensions for the alien game.
  //
  // POST /api/alien-score
  // Body: {
  //   messages: Message[]  — pre-built scoring prompt from scoringEngine.js
  // }
  // Response: { ok:true, clarity, respect, awareness, boundary, composite, feedback }
  //         | { ok:false, error:string }

  const apiKey = process.env.TOKENHUB_API_KEY
  if (!apiKey) return res.status(500).json({ ok: false, error: 'TOKENHUB_API_KEY not set.' })

  const { messages } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: '`messages` must be a non-empty array.' })
  }

  const client = new OpenAI({ apiKey, baseURL: 'https://tokenhub-intl.tencentcloudmaas.com/v1' })

  try {
    const response = await client.chat.completions.create({ model: MODEL, messages, temperature: 0.3, timeout: 14_000 })
    const raw = response.choices?.[0]?.message?.content

    if (typeof raw !== 'string') {
      return res.status(502).json({ ok: false, error: 'Unexpected response shape from model.' })
    }

    let text = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()
    const first = text.indexOf('{'), last = text.lastIndexOf('}')
    if (first !== -1 && last > first) text = text.slice(first, last + 1)

    let parsed
    try { parsed = JSON.parse(text) } catch {
      return res.status(502).json({ ok: false, error: 'Model returned non-JSON.', raw })
    }

    const clampVal = v => Math.max(0, Math.min(100, Math.round(v ?? 50)))
    const clarity   = clampVal(parsed.clarity)
    const respect   = clampVal(parsed.respect)
    const awareness = clampVal(parsed.awareness)
    const boundary  = clampVal(parsed.boundary)
    const composite = clampVal(Math.round(clarity * 0.28 + respect * 0.24 + awareness * 0.28 + boundary * 0.20))

    return res.json({
      ok: true,
      clarity,
      respect,
      awareness,
      boundary,
      composite,
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
    })
  } catch (err) {
    return res.status(502).json({ ok: false, error: `TokenHub error: ${err?.message ?? String(err)}` })
  }
})

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  const credentialsOk = !!process.env.TOKENHUB_API_KEY
  res.json({
    ok: true,
    message: 'Alien Friends API server is running.',
    credentials: credentialsOk ? 'present' : 'MISSING — set TOKENHUB_API_KEY in .env',
  })
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`)
  console.log(`[server] Health: http://localhost:${PORT}/api/health`)
})
