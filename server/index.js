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
