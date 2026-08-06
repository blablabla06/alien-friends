const QUOTE_RE = /"([^"]*)"|「([^」]*)」|"([^"]*)"/g

export function extractCleanDialogue(npcResponseRaw, npcActionRaw = null) {
  const raw = String(npcResponseRaw ?? '').trim()
  // ── Step 0: 先剥离括号内容，视为动作 ─────────────────────────────
  const bracketMatches = [...raw.matchAll(/[（(]([^）)]+)[）)]/g)].map(m => m[1].trim())
  const bracketAction = bracketMatches.length ? bracketMatches.join(' ') : null
  const rawWithoutBrackets = raw.replace(/[（(][^）)]+[）)]/g, '').trim()

  // ── Step 1: 用同一次遍历，同时提取"引号内的对话"和"引号外的叙述" ──
  const quotedSegments = []
  const narrationParts = []
  let lastIndex = 0
  let match
  QUOTE_RE.lastIndex = 0
  while ((match = QUOTE_RE.exec(rawWithoutBrackets)) !== null) {
    // 引号之前的这段文字（如果非空）算作叙述
    const before = rawWithoutBrackets.slice(lastIndex, match.index).trim()
    if (before) narrationParts.push(before)

    const spoken = (match[1] ?? match[2] ?? match[3] ?? '').trim()
    if (spoken) quotedSegments.push(spoken)

    lastIndex = match.index + match[0].length
  }
  // 最后一个引号之后剩余的文字，也算叙述
  const tail = rawWithoutBrackets.slice(lastIndex).trim()
  if (tail) narrationParts.push(tail)

  const cleanDialogue = quotedSegments.length > 0
    ? quotedSegments.join(' ')
    : rawWithoutBrackets

  const narrationFromResponse = narrationParts.join(' ').trim()

  // ── Step 2: 合并 npcAction + 括号动作 + 从 npcResponse 里提取的叙述 ──
  const parts = [
    npcActionRaw ? String(npcActionRaw).trim() : null,
    bracketAction,
    quotedSegments.length > 0 ? narrationFromResponse || null : null,
  ].filter(Boolean)

  const combinedNarration = parts.length > 0 ? parts.join(' ') : null

  return { cleanDialogue, combinedNarration }
}
