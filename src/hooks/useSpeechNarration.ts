import { useCallback, useEffect, useRef } from "react"

/**
 * Thin wrapper over window.speechSynthesis for active-navigation voice
 * guidance. Degrades to a silent no-op when the API is unsupported (some
 * browsers/embedded webviews) — the caller is expected to still show the
 * instruction as text, which ActiveNavigationView.tsx always does anyway.
 */
export function useSpeechNarration() {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window
  const mutedRef = useRef(false)

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel()
  }, [isSupported])

  const speak = useCallback((text: string) => {
    if (!isSupported || mutedRef.current || !text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(utterance)
  }, [isSupported])

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted
    if (muted) stop()
  }, [stop])

  useEffect(() => stop, [stop])

  return { speak, stop, setMuted, isSupported }
}
