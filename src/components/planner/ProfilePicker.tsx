import { useId, useState } from "react"
import { Lightbulb, Ellipsis } from "lucide-react"
import Chip from "../ui/Chip"
import ProfileIcon from "../ui/ProfileIcon"
import Sheet from "../ui/Sheet"

export interface ProfileOption {
  id: string
  label: string
  description: string
}

interface ProfilePickerProps {
  profiles: ProfileOption[]
  value: string
  onChange: (id: string) => void
}

/** The five profiles most people need sit in the row; the rest are one tap away in a sheet. */
const IN_THE_ROW = ["standard", "wheelchair", "senior", "pregnant", "stroller"]

/**
 * Who is travelling. A row of icon chips for the common profiles and a "More" button that opens every profile with its
 * description. A profile chosen from the sheet joins the row so the choice is always visible without opening anything.
 */
export default function ProfilePicker({ profiles, value, onChange }: ProfilePickerProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const labelId = useId()

  const inRow = profiles.filter((p) => IN_THE_ROW.includes(p.id) || p.id === value)
  const selected = profiles.find((p) => p.id === value)

  return (
    <div role="group" aria-labelledby={labelId} className="space-y-2.5">
      <p id={labelId} className="text-xs font-semibold uppercase tracking-wider text-navy-500">
        Accessibility Profile
      </p>
      <div className="flex flex-wrap gap-2">
        {inRow.map((p) => (
          <Chip key={p.id} selected={value === p.id} onClick={() => onChange(p.id)} icon={<ProfileIcon id={p.id} className="h-4 w-4" />}>
            {p.label}
          </Chip>
        ))}
        <Chip selected={false} aria-haspopup="dialog" onClick={() => setMoreOpen(true)} icon={<Ellipsis className="h-4 w-4" aria-hidden="true" />}>
          More
        </Chip>
      </div>
      {selected?.description && (
        <p className="flex items-start gap-1.5 rounded-control bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700" aria-hidden="true" />
          {selected.description}
        </p>
      )}

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Travel profile">
        <ul className="grid gap-2 sm:grid-cols-2">
          {profiles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={value === p.id}
                onClick={() => { onChange(p.id); setMoreOpen(false) }}
                className={`flex h-full min-h-14 w-full items-start gap-3 rounded-panel border p-3 text-left transition-colors ${
                  value === p.id ? "border-brand-500 bg-brand-50" : "border-navy-200 bg-white hover:bg-navy-50"
                }`}
              >
                <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-control ${value === p.id ? "bg-brand-500 text-white" : "bg-navy-100 text-navy-700"}`}>
                  <ProfileIcon id={p.id} className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-navy-900">{p.label}</span>
                  <span className="mt-0.5 block text-xs text-navy-600">{p.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  )
}
