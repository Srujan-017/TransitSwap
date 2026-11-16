import { Accessibility, BusFront, CarTaxiFront, Footprints, Shuffle, TrainFront, type LucideIcon } from "lucide-react"

/**
 * One icon per way of travelling, replacing the 🚶 🚇 🚌 🛺 emoji. `wheelchair` swaps the walking icon for the access
 * symbol, as the step-by-step timeline did with its wheelchair emoji. Decorative by default; the mode's name is always
 * written next to it.
 */
export const MODE_ICONS: Record<string, LucideIcon> = {
  walking: Footprints,
  metro: TrainFront,
  bus: BusFront,
  auto: CarTaxiFront,
  any: Shuffle,
}

interface ModeIconProps {
  mode: string
  /** Use the wheelchair symbol for a walking leg. */
  wheelchair?: boolean
  className?: string
  decorative?: boolean
}

export default function ModeIcon({ mode, wheelchair = false, className = "w-4 h-4", decorative = true }: ModeIconProps) {
  const Icon = wheelchair && mode === "walking" ? Accessibility : (MODE_ICONS[mode] ?? BusFront)
  return <Icon className={className} aria-hidden={decorative ? true : undefined} data-mode-icon={mode} />
}
