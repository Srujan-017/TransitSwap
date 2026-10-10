import { useEffect, useRef, useState } from "react"

/**
 * Triggers once when the attached element first scrolls into view — used to
 * fire the .animate-fade-slide-up CSS animation (src/index.css) per-section
 * on the Landing page, instead of only on initial mount. Falls back to
 * "already visible" when IntersectionObserver isn't available, so content
 * is never hidden for a browser that can't animate it in.
 */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(typeof IntersectionObserver === "undefined")

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}
