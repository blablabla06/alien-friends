/**
 * server/index.js
 * Express proxy — forwards chat requests to DeepSeek via the openai SDK.
 *
 * Authentication: Bearer token (DEEPSEEK_API_KEY), server-side only.
 * Endpoint: https://api.deepseek.com
 * Model: deepseek-v4-flash
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
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3001
const MODEL = 'deepseek-v4-flash'

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
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: 'DEEPSEEK_API_KEY is not set in .env',
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
    baseURL: 'https://api.deepseek.com',
  })

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.8,
      timeout: 14_000,   // 14 s — just under the browser-side 15 s AbortController
    })

    // const text = response.choices?.[0]?.message?.content
    const choice = response.choices?.[0]
    let text = choice?.message?.content

    // 兜底：如果 content 为空，但 reasoning_content 里藏着真实答案
    // （DeepSeek 有时会把整个分析过程连同最终 JSON 一起塞进 
    // reasoning_content，而 content 留空），尝试从里面提取最后一个
    // JSON 对象。
    if ((!text || text.trim() === '') && choice?.message?.reasoning_content) {
      console.warn('[server] content 为空，尝试从 reasoning_content 提取 JSON')
      const reasoning = choice.message.reasoning_content
      const lastBrace = reasoning.lastIndexOf('{')
      if (lastBrace !== -1) {
        text = reasoning.slice(lastBrace)
      }
    }


    // 诊断：如果返回空内容，打印完整的 finish_reason 和原始 choice 内容
    if (!text || text.trim() === '') {
      console.error('[server] Empty response — finish_reason:', choice?.finish_reason)
      console.error('[server] Full choice object:', JSON.stringify(choice, null, 2))
      console.error('[server] Full usage:', JSON.stringify(response.usage, null, 2))
    }

    if (typeof text !== 'string') {
      console.error('[server] Unexpected response shape:', JSON.stringify(response))
      return res
        .status(502)
        .json({ ok: false, error: 'Unexpected response shape from DeepSeek.' })
    }

    return res.json({ ok: true, text })
  } catch (err) {
    const detail = err?.message ?? String(err)
    console.error('[server] DeepSeek error:', detail)
    return res.status(502).json({ ok: false, error: `DeepSeek error: ${detail}` })
  }
})

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  const credentialsOk = !!process.env.DEEPSEEK_API_KEY
  res.json({
    ok: true,
    message: 'Alien Friends API server is running.',
    credentials: credentialsOk ? 'present' : 'MISSING — set DEEPSEEK_API_KEY in .env',
  })
})

// ─── Serve built frontend (production) ────────────────────────────────────────

app.use(express.static(path.join(__dirname, '../dist')))
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`)
  console.log(`[server] Health: http://localhost:${PORT}/api/health`)
})
