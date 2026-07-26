/**
 * LanguageContext.jsx
 *
 * Provides { lang, setLang, t } to the whole app.
 *   lang   — 'en' | 'zh'
 *   setLang — toggle + persist to localStorage
 *   t(key)  — translate a dot-path key, e.g. t('home.startTalking')
 *
 * No third-party library — keeps the bundle small and avoids setup friction.
 */

import { createContext, useCallback, useContext, useState } from 'react'
import { translations } from '../lib/translations.js'

const LanguageContext = createContext(null)

const STORAGE_KEY = 'af_lang'

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'zh' || v === 'en') return v
  } catch { /* SSR / private mode */ }
  return 'en'
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang)

  const setLang = useCallback((l) => {
    const next = l === 'zh' ? 'zh' : 'en'
    setLangState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  }, [])

  /** Resolve a dot-path key against the translation map.
   *  Returns the string or function found at that path, or the key itself on miss. */
  const t = useCallback((key) => {
    const parts = key.split('.')
    let node = translations[lang]
    for (const p of parts) {
      if (node == null) return key
      node = node[p]
    }
    if (typeof node === 'string' || typeof node === 'function') return node
    return key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within <LanguageProvider>')
  return ctx
}

/**
 * Resolve a bilingual field from a data JSON.
 * Handles both legacy plain strings and the new { en, zh } shape.
 *
 * @param {string | { en: string, zh: string }} field
 * @param {'en'|'zh'} lang
 * @returns {string}
 */
export function resolveField(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang] ?? field.en ?? String(field)
}
