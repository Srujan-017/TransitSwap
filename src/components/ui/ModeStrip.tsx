import LineBadge from "./LineBadge"

// The same colours the map and the route cards draw each mode in. A saved or past journey does not store the metro
// line's own colour, so a metro leg uses the brand blue.
const MODE_COLOUR: Record<string, string> = {
  metro: "#1f5bd8",
  bus: "#0f766e",
  auto: "#e0a500",
  walking: "#94a3b8",
}

const LABEL: Record<string, string> = { metro: "Metro", bus: "Bus", auto: "Auto", walking: "Walking" }

/** A thin bar across the top of a card, one equal slice per travel mode in the colour the map uses for it. Decorative. */
export function ModeStrip({ modes, className = "" }: { modes: string[]; className?: string }) {
  const list = modes.length > 0 ? modes : ["walking"]
  return (
    <div aria-hidden="true" data-testid="mode-strip" className={`flex h-1.5 w-full ${className}`}>
      {list.map((m, i) => (
        <span key={`${m}-${i}`} className="h-full flex-1" style={{ backgroundColor: MODE_COLOUR[m] ?? MODE_COLOUR.walking }} />
      ))}
    </div>
  )
}

/** The modes as named chips (Metro, Bus, Auto, Walking) with their icons, in the style of the route cards. */
export function ModeChips({ modes, className = "" }: { modes: string[]; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {modes.map((m, i) => (
        <LineBadge
          key={`${m}-${i}`}
          mode={(m === "metro" || m === "bus" || m === "auto" ? m : "walking")}
          label={LABEL[m] ?? m}
          color={m === "metro" ? MODE_COLOUR.metro : undefined}
        />
      ))}
    </div>
  )
}

export default ModeStrip
