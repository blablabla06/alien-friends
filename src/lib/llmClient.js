/**
 * llmClient.js
 * Proxies all LLM calls through our local Express server (/api/chat).
 * The Hunyuan API key is stored ONLY on the server — never in the browser.
 *
 * All exported functions return a result object and never throw:
 *   { ok: true,  text: string }
 *   { ok: false, error: string, timedOut?: true }
 */

// In production you'd point this at your deployed API URL.
const API_BASE = import.meta.env.VITE_API_BASE ?? ''

/** How long to wait before aborting a single attempt (ms). */
const TIMEOUT_MS = 15_000

/** How many total attempts before giving up (1 = no retry, 2 = one retry). */
const MAX_ATTEMPTS = 2

// ─── types (JSDoc only) ──────────────────────────────────────────────────────

/**
 * @typedef {{ role: 'system'|'user'|'assistant', content: string }} Message
 * @typedef {{ ok: true,  text: string }} LLMSuccess
 * @typedef {{ ok: false, error: string, timedOut?: true }} LLMError
 * @typedef {LLMSuccess | LLMError} LLMResult
 */

// ─── single attempt (with timeout) ───────────────────────────────────────────

/**
 * One fetch attempt with a built-in AbortController timeout.
 * Returns LLMResult — never throws.
 *
 * @param {Message[]}    messages
 * @param {AbortSignal}  [outerSignal] - optional caller-supplied signal; if it
 *   fires before the internal timeout, the fetch is cancelled immediately.
 * @returns {Promise<LLMResult>}
 */
async function attemptCall(messages, outerSignal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  // If the caller aborts externally, propagate into our internal controller.
  outerSignal?.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    })

    clearTimeout(timer)

    // The server always returns JSON with { ok, text } or { ok, error }
    const data = await res.json()

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data?.error ?? `Server responded with HTTP ${res.status}`,
        // treat 5xx as retryable
        _retryable: res.status >= 500,
      }
    }

    return { ok: true, text: data.text }
  } catch (err) {
    clearTimeout(timer)

    const isAbort = err?.name === 'AbortError'
    return {
      ok: false,
      error: isAbort
        ? `Request timed out after ${TIMEOUT_MS / 1000} seconds.`
        : `Network error: ${err?.message ?? String(err)}`,
      timedOut: isAbort,
      _retryable: true,  // network errors and timeouts are worth retrying
    }
  }
}

// ─── core call (with retry) ───────────────────────────────────────────────────

/**
 * Send a messages array to our Express proxy, which forwards to the LLM.
 * Automatically retries once on transient network errors, timeouts, or 5xx.
 *
 * @param {Message[]}   messages
 * @param {AbortSignal} [signal] - optional; if aborted, the in-flight request
 *   is cancelled immediately and an AbortError-flavoured LLMError is returned.
 *   All existing callers that don't pass a signal continue to work unchanged.
 * @returns {Promise<LLMResult>}
 */
export async function callLLM(messages, signal) {
  let lastResult

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Don't even start a retry if the caller already cancelled
    if (signal?.aborted) {
      return { ok: false, error: 'Request cancelled by caller.', timedOut: false }
    }

    lastResult = await attemptCall(messages, signal)

    if (lastResult.ok) return lastResult

    // Don't retry if caller cancelled mid-attempt
    if (signal?.aborted) break

    // Only retry on transient failures
    if (!lastResult._retryable) break

    // Small back-off before the retry
    if (attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, 800))
    }
  }

  // Strip internal _retryable flag before returning
  const { _retryable: _, ...clean } = lastResult
  return clean
}
