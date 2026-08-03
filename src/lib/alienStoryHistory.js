/**
 * alienStoryHistory.js
 * --------------------
 * Persistent storage helpers for "Alien, Apparently" ending collection
 * and run history. Stored independently from the in-progress story save
 * (alienStory_v3) so a reset of in-progress state never silently wipes
 * the collection.
 *
 * localStorage key: alienStory_history_v1
 */

export const HISTORY_KEY = 'alienStory_history_v1'

// ── Canonical reachable endings ──────────────────────────────────────────────
// Add entries here only when getEnding() can actually return them.
export const STORY_ENDINGS = [
  { id: 'exclusion',         name: 'Exclusion' },
  { id: 'healthy-boundary',  name: 'Healthy Boundary' },
  { id: 'mutual-adjustment', name: 'Mutual Adjustment' },
  { id: 'forced-harmony',    name: 'Forced Harmony' },
]

// ── Localized ending metadata ─────────────────────────────────────────────────
// Use endingId as key. Display layer should always derive text from here,
// not from saved history strings (which may be English-only).
export const STORY_ENDING_DETAILS = {
  exclusion: {
    en: {
      name:    'Exclusion',
      badge:   'Rumour Witness',
      summary: 'Evan is removed. The group feels relieved, but the pattern that created the label remains.',
      quote:   'A group that needs an alien will eventually create another one.',
    },
    zh: {
      name:    '排除',
      badge:   '谣言见证者',
      summary: 'Evan 被移出小组。大家暂时松了一口气，但制造标签的模式并没有消失。',
      quote:   '一个需要"外星人"的群体，迟早会制造出下一个局外人。',
    },
  },
  'healthy-boundary': {
    en: {
      name:    'Healthy Boundary',
      badge:   'Boundary Setter',
      summary: 'The team keeps the issue specific: Evan must notify changes, and the group must stop using personal labels.',
      quote:   'Understanding does not remove accountability.',
    },
    zh: {
      name:    '健康边界',
      badge:   '边界建立者',
      summary: '小组把问题具体化：Evan 必须在修改前通知大家，而其他人也必须停止用人格标签定义他。',
      quote:   '理解并不等于取消责任。',
    },
  },
  'mutual-adjustment': {
    en: {
      name:    'Mutual Adjustment',
      badge:   'Perspective Builder',
      summary: 'Nobody becomes best friends, but the team creates enough trust and structure to keep working.',
      quote:   'Belonging does not require sameness.',
    },
    zh: {
      name:    '互相调整',
      badge:   '视角搭建者',
      summary: '大家没有突然变成好朋友，但小组建立了足够的信任和规则，让合作能够继续。',
      quote:   '归属感不要求每个人都一样。',
    },
  },
  'forced-harmony': {
    en: {
      name:    'Forced Harmony',
      badge:   'First Run Complete',
      summary: 'The meeting ends politely, but the real conflict continues underneath the surface.',
      quote:   'Silence is not resolution.',
    },
    zh: {
      name:    '被迫和谐',
      badge:   '首次通关',
      summary: '会议表面上礼貌结束，但真正的冲突仍然留在水面之下。',
      quote:   '沉默并不等于解决。',
    },
  },
}

/**
 * getStoryEndingText
 * Returns localized ending metadata for a given endingId.
 * Falls back to English if the requested language is not available.
 *
 * @param {string} endingId
 * @param {'en'|'zh'} lang
 * @returns {{ name, badge, summary, quote } | null}
 */
export function getStoryEndingText(endingId, lang = 'en') {
  return (
    STORY_ENDING_DETAILS[endingId]?.[lang] ??
    STORY_ENDING_DETAILS[endingId]?.en ??
    null
  )
}

const MAX_RUNS = 30

// ── Slug helper: "Healthy Boundary" → "healthy-boundary" ─────────────────────
export function endingSlug(name = '') {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

// ── Empty shape ───────────────────────────────────────────────────────────────
function emptyHistory() {
  return {
    unlockedEndings: {},
    runs: [],
    allEndingsUnlockedAt: null,
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────
export function getStoryHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return emptyHistory()
    const parsed = JSON.parse(raw)
    // Ensure shape is valid
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.unlockedEndings &&
      Array.isArray(parsed.runs)
    ) {
      return parsed
    }
    return emptyHistory()
  } catch {
    return emptyHistory()
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────
function writeHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    /* storage full or private mode — fail silently */
  }
}

/**
 * saveStoryRun
 * Persists a completed run and updates the unlocked-endings collection.
 *
 * @param {object} run – shape:
 *   { endingId, endingName, overall, badge, summary, quote, scores, hidden, choices, playedAt }
 */
export function saveStoryRun(run) {
  const history = getStoryHistory()

  // 1. Build the run record
  const runRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    playedAt:    run.playedAt ?? new Date().toISOString(),
    endingId:    run.endingId,
    endingName:  run.endingName,
    overall:     run.overall,
    badge:       run.badge,
    summary:     run.summary,
    quote:       run.quote,
    scores:      run.scores ?? {},
    hidden:      run.hidden ?? {},
    choices:     run.choices ?? [],
  }

  // 2. Prepend (newest first) and trim to MAX_RUNS
  history.runs = [runRecord, ...history.runs].slice(0, MAX_RUNS)

  // 3. Update unlocked endings — keep best overall, never overwrite firstUnlockedAt
  const existing = history.unlockedEndings[run.endingId]
  if (!existing) {
    history.unlockedEndings[run.endingId] = {
      id:               run.endingId,
      name:             run.endingName,
      firstUnlockedAt:  runRecord.playedAt,
      bestOverall:      run.overall,
      badge:            run.badge,
      summary:          run.summary,
      quote:            run.quote,
    }
  } else {
    // Update best score if this run is better
    if (run.overall > existing.bestOverall) {
      existing.bestOverall = run.overall
      existing.badge       = run.badge
    }
  }

  // 4. Check if all canonical endings are now unlocked
  const allUnlocked = STORY_ENDINGS.every(e => history.unlockedEndings[e.id])
  if (allUnlocked && !history.allEndingsUnlockedAt) {
    history.allEndingsUnlockedAt = new Date().toISOString()
  }

  writeHistory(history)
  return runRecord
}

// ── Convenience queries ───────────────────────────────────────────────────────

/** Returns true if the player has finished at least one run. */
export function hasCompletedStory() {
  const { runs } = getStoryHistory()
  return runs.length > 0
}

/** Returns a Set of ending IDs that have been unlocked. */
export function getUnlockedEndingIds() {
  const { unlockedEndings } = getStoryHistory()
  return new Set(Object.keys(unlockedEndings))
}

/** Returns true if every canonical ending has been unlocked. */
export function getAllEndingsUnlocked() {
  const unlocked = getUnlockedEndingIds()
  return STORY_ENDINGS.every(e => unlocked.has(e.id))
}
