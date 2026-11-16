interface AvatarProps {
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" }
// All four are dark enough for white initials at 4.5:1 or better.
const COLOURS = ["bg-brand-600", "bg-go-700", "bg-bus-700", "bg-navy-700"]

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0].charAt(0)
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
  return (first + second).toUpperCase()
}

/** A round badge with the person's initials; the colour is picked from the name so it is the same every time. */
export default function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ${SIZE[size]} ${COLOURS[hash % COLOURS.length]} ${className}`}>
      {initialsOf(name)}
    </span>
  )
}
