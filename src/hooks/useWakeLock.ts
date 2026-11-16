import { useEffect, useState } from "react"

/**
 * Keeps the screen on while `active` (so a phone does not dim and lock in the middle of a journey). Uses the
 * Screen Wake Lock API where the browser has it, and asks for the lock again when the page comes back to the
 * foreground (browsers release it whenever the page is hidden). Does nothing, harmlessly, elsewhere.
 */
export function useWakeLock(active: boolean): { supported: boolean; held: boolean } {
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!active || !supported) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen")
        if (cancelled) {
          void lock.release()
          return
        }
        sentinel = lock
        setHeld(true)
        lock.addEventListener("release", () => setHeld(false))
      } catch {
        setHeld(false) // refused (battery saver, permissions policy ...): navigation still works
      }
    }
    // Browsers release the lock when the page is hidden; take it again when the rider comes back.
    const onVisible = () => {
      if (document.visibilityState === "visible" && sentinel?.released) void acquire()
    }

    void acquire()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
      void sentinel?.release()
      setHeld(false)
    }
  }, [active, supported])

  return { supported, held }
}
