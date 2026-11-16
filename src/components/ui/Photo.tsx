import type { CSSProperties } from "react"
import { PHOTOS, photoUrl, type PhotoId } from "../../data/photoCredits"

interface PhotoProps {
  id: PhotoId
  /** Overrides the photo's own description. Leave out to use the described alt text from photoCredits.ts. */
  alt?: string
  /** Purely decorative (for example behind a headline that already says everything): empty alt and hidden from screen readers. */
  decorative?: boolean
  /** The `sizes` attribute: how wide the image is shown at each screen width, so the browser picks the right file. */
  sizes?: string
  /** Above the fold (the hero): load at once and at high priority instead of lazily. */
  priority?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * One of the site's real photographs, served from our own files (never hotlinked) as WebP at 640, 1280 and 1920 px with
 * a `srcset`, so a phone downloads about 20 to 50 KB instead of the full picture. While it loads, a tiny blurred copy
 * and the photo's average colour fill the space, so nothing jumps. Alt text always exists: the photo's own description,
 * unless the caller overrides it or marks the picture decorative.
 */
export default function Photo({ id, alt, decorative = false, sizes = "100vw", priority = false, className = "", style }: PhotoProps) {
  const photo = PHOTOS[id]
  const largest = photo.sizes[photo.sizes.length - 1]
  const srcSet = photo.sizes.map((s) => `${photoUrl(id, s.width)} ${s.width}w`).join(", ")

  return (
    <img
      src={photoUrl(id, photo.sizes[Math.min(1, photo.sizes.length - 1)].width)}
      srcSet={srcSet}
      sizes={sizes}
      width={largest.width}
      height={largest.height}
      alt={decorative ? "" : (alt ?? photo.alt)}
      aria-hidden={decorative ? true : undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={className}
      style={{ backgroundColor: photo.averageColor, backgroundImage: `url(${photo.placeholder})`, backgroundSize: "cover", ...style }}
    />
  )
}
