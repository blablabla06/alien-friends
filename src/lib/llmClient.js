/**
 * llmClient.js
 * Proxies all LLM calls through our local Express server (/api/chat).
 * The Hunyuan API key is stored ONLY on the server — never in the browser.
 *
 * All exported functions return a result object and never throw:
 *   { ok: true,  text: string }
 *   { ok: false, error: string }
 */

// In production you'd point this at your deployed API URL.
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'

// ─── types (JSDoc only) ──────────────────────────────────────────────────────

/**
 * @typedef {{ role: 'system'|'user'|'assistant', content: string }} Message
 * @typedef {{ ok: true,  text: string }} LLMSuccess
 * @typedef {{ ok: false, error: string }} LLMError
 * @typedef {LLMSuccess | LLMError} LLMResult
 */

// ─── core call ───────────────────────────────────────────────────────────────

/**
 * Send a messages array to our Express proxy, which forwards to Hunyuan.
 *
 * @param {Message[]} messages
 * @returns {Promise<LLMResult>}
 */
export async function callLLM(messages) {
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })

    // The server always returns JSON with { ok, text } or { ok, error }
    const data = await res.json()

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data?.error ?? `Server responded with HTTP ${res.status}`,
      }
    }

    return { ok: true, text: data.text }
  } catch (err) {
    return {
      ok: false,
      error: `Network error: ${err?.message ?? String(err)}`,
    }
  }
}

// ─── convenience helper ──────────────────────────────────────────────────────

/**
 * Ask the model for 3 suggested player replies.
 * Returns the same LLMResult shape, plus a `replies` array on success.
 *
 * @param {Message[]} messages - current dialogue history
 * @returns {Promise<LLMResult & { replies?: string[] }>}
 */
export async function getSuggestedReplies(messages) {
  const result = await callLLM([
    ...messages,
    {
      role: 'user',
      content:
        'Generate exactly 3 short, distinct reply options the player could say next. ' +
        'Return ONLY a JSON array of strings — no extra text.',
    },
  ])

  if (!result.ok) return result

  try {
    const parsed = JSON.parse(result.text)
    if (Array.isArray(parsed)) {
      return { ok: true, text: result.text, replies: parsed }
    }
    return { ok: false, error: 'Model did not return a JSON array for suggested replies.' }
  } catch {
    // Fall back to treating the whole response as a single option
    return { ok: true, text: result.text, replies: [result.text] }
  }
}
