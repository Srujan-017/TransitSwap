import {
  Accessibility, Armchair, Baby, Footprints, HandHelping, HeartPulse, IndianRupee, Luggage, PersonStanding, Scale, Target, Zap,
  type LucideIcon,
} from "lucide-react"

/**
 * One icon per travel profile and routing priority, replacing the emoji that used to stand in (🚶 ♿ 🧓 …), which look
 * different on every phone. The profile's text label is always shown or announced next to it, so the icon is
 * decoration (aria-hidden) unless a caller says otherwise.
 */
export const PROFILE_ICONS: Record<string, LucideIcon> = {
  standard: Footprints,
  wheelchair: Accessibility,
  senior: PersonStanding,
  pregnant: HeartPulse,
  stroller: Baby,
  luggage: Luggage,
  reduced_mobility: HandHelping,
  fastest: Zap,
  speed: Zap,
  cheapest: IndianRupee,
  comfort: Armchair,
  balanced: Scale,
  reliability: Target,
  accessibility: Accessibility,
}

interface ProfileIconProps {
  /** The profile id ("wheelchair", "senior", …) or routing priority ("fastest", "cheapest", "comfort"). */
  id: string
  className?: string
  /** Pass false only when the icon is the sole content of a control. */
  decorative?: boolean
}

export default function ProfileIcon({ id, className = "w-4 h-4", decorative = true }: ProfileIconProps) {
  const Icon = PROFILE_ICONS[id] ?? Footprints
  return <Icon className={className} aria-hidden={decorative ? true : undefined} data-profile-icon={id} />
}
