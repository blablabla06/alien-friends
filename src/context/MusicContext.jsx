import { createContext, useContext, useEffect, useRef, useState } from 'react'

// ── Track registry ────────────────────────────────────────────────────────────
const TRACK_SRCS = {
  home:     new URL('../assets/audio/home.mp3',     import.meta.url).href,
  practice: new URL('../assets/audio/practice.mp3', import.meta.url).href,
  main:     new URL('../assets/audio/main.mp3',     import.meta.url).href,
}

const MUSIC_VOLUME  = 0.15  // 15% — well below the 1.8× gain-boosted voice clips
const FADE_DURATION = 1500  // ms

const MusicContext = createContext(null)

export function MusicProvider({ children }) {
  // ── persistent mute state ─────────────────────────────────────────────────
  const [isMusicMuted, setIsMusicMuted] = useState(() => {
    try { return localStorage.getItem('af_music_muted') === 'true' } catch { return false }
  })

  // ── internal refs ─────────────────────────────────────────────────────────
  const audioRefs    = useRef({})   // { [trackKey]: HTMLAudioElement }
  const currentKey   = useRef(null) // active track key
  const fadeTimerRef = useRef(null)
  // Whether the user has ever interacted in this browser session (permits
  // programmatic play() calls after the first gesture).
  const everInteracted = useRef(false)

  // ── helpers ───────────────────────────────────────────────────────────────

  function getAudio(key) {
    if (!audioRefs.current[key]) {
      const a = new Audio()
      a.loop   = true
      a.volume = 0
      a.src    = TRACK_SRCS[key]
      audioRefs.current[key] = a
    }
    return audioRefs.current[key]
  }

  function cancelFade() {
    if (fadeTimerRef.current != null) {
      cancelAnimationFrame(fadeTimerRef.current)
      clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = null
    }
  }

  function fadeVolume(audio, targetVol, durationMs, onDone) {
    cancelFade()
    const startVol  = audio.volume
    const startTime = performance.now()
    function tick(now) {
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      const nextVol = startVol + (targetVol - startVol) * progress
      audio.volume  = Math.max(0, Math.min(1, nextVol))
      if (progress < 1) {
        fadeTimerRef.current = requestAnimationFrame(tick)
      } else {
        fadeTimerRef.current = null
        onDone?.()
      }
    }
    fadeTimerRef.current = requestAnimationFrame(tick)
  }

  function stopCurrent(callback) {
    const key = currentKey.current
    if (!key) { callback?.(); return }
    const audio = audioRefs.current[key]
    if (!audio || audio.paused) { currentKey.current = null; callback?.(); return }
    fadeVolume(audio, 0, FADE_DURATION / 2, () => {
      audio.pause()
      currentKey.current = null
      callback?.()
    })
  }

  /**
   * Switch to newKey.
   * If newKey === currentKey the track is already playing — keep it running.
   */
  function setTrack(newKey) {
    if (!newKey || !TRACK_SRCS[newKey]) return
    if (currentKey.current === newKey) return  // seamless — don't restart

    stopCurrent(() => {
      currentKey.current = newKey
      // If the user has interacted before, start immediately without needing
      // another click (handles navigating back to HomePage etc.)
      if (everInteracted.current) {
        _doPlay(newKey)
      }
    })
  }

  /**
   * Internal: actually call play() on the given key's Audio element.
   * Safe to call repeatedly — skips if already playing.
   */
  function _doPlay(key) {
    if (!key) return
    const audio = getAudio(key)
    if (!audio.paused) return  // already running

    const targetVol = isMusicMuted ? 0 : MUSIC_VOLUME
    audio.volume = 0
    audio.play().then(() => {
      if (!isMusicMuted) {
        fadeVolume(audio, targetVol, FADE_DURATION, null)
      }
    }).catch(() => { /* browser blocked — will retry on next interaction */ })
  }

  /**
   * Public: begin playing the current track.
   * Call from a user-interaction handler (or on mount after first gesture).
   */
  function startPlayback() {
    everInteracted.current = true
    _doPlay(currentKey.current)
  }

  // ── mute toggle ───────────────────────────────────────────────────────────
  function toggleMusicMute() {
    setIsMusicMuted(prev => {
      const next = !prev
      try { localStorage.setItem('af_music_muted', String(next)) } catch { /* ignore */ }

      const key = currentKey.current
      if (key && audioRefs.current[key]) {
        const audio = audioRefs.current[key]
        cancelFade()
        if (next) {
          fadeVolume(audio, 0, FADE_DURATION / 2, null)
        } else {
          if (!audio.paused) {
            fadeVolume(audio, MUSIC_VOLUME, FADE_DURATION, null)
          } else if (everInteracted.current) {
            // Was muted while paused — restart playback now that unmuted
            _doPlay(key)
          }
        }
      }
      return next
    })
  }

  // ── sync mute state to running audio ─────────────────────────────────────
  useEffect(() => {
    const key = currentKey.current
    if (!key || !audioRefs.current[key]) return
    const audio = audioRefs.current[key]
    if (isMusicMuted) {
      cancelFade()
      fadeVolume(audio, 0, FADE_DURATION / 2, null)
    } else if (!audio.paused) {
      cancelFade()
      fadeVolume(audio, MUSIC_VOLUME, FADE_DURATION, null)
    }
  }, [isMusicMuted]) // eslint-disable-line

  // ── clean up on app teardown ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelFade()
      Object.values(audioRefs.current).forEach(a => { try { a.pause() } catch {} })
    }
  }, [])

  return (
    <MusicContext.Provider value={{ setTrack, startPlayback, toggleMusicMute, isMusicMuted }}>
      {children}
    </MusicContext.Provider>
  )
}

export function useMusic() {
  const ctx = useContext(MusicContext)
  if (!ctx) throw new Error('useMusic must be used inside MusicProvider')
  return ctx
}

/**
 * useMusicTrack(key)
 *
 * Drop this into any page component to declare which track should play.
 *
 * Behaviour:
 * 1. On mount: calls setTrack(key).
 * 2. On mount: immediately attempts startPlayback() — succeeds silently if
 *    the browser already permits play() (i.e. user has interacted before in
 *    this session), fails silently if not.
 * 3. Registers a capture-phase click/touchstart listener that calls
 *    startPlayback() on the very first user interaction on this page.
 *    The listener is removed after firing once AND on component unmount.
 */
export function useMusicTrack(key) {
  const { setTrack, startPlayback } = useMusic()

  // Step 1 + 2: set track and attempt immediate play on every mount
  useEffect(() => {
    setTrack(key)
    // Attempt play immediately — works if user has interacted anywhere before.
    // If the browser blocks it, it's silently caught inside startPlayback/_doPlay.
    startPlayback()
  }, [key]) // eslint-disable-line

  // Step 3: also catch the very first interaction on this page as a fallback
  useEffect(() => {
    let fired = false
    function handleInteraction() {
      if (fired) return
      fired = true
      startPlayback()
      document.removeEventListener('click',      handleInteraction, true)
      document.removeEventListener('touchstart', handleInteraction, true)
    }
    document.addEventListener('click',      handleInteraction, true)
    document.addEventListener('touchstart', handleInteraction, true)
    return () => {
      document.removeEventListener('click',      handleInteraction, true)
      document.removeEventListener('touchstart', handleInteraction, true)
    }
  }, []) // eslint-disable-line

  return { triggerStart: startPlayback }
}
