import { useState, useEffect, useId, useRef, useCallback } from "react"
import { X, MapPin, Loader2, LocateFixed } from "lucide-react"
import { mapService } from "../../services/mapService"
import type { GeoLocation } from "../../types/map"

interface LocationSearchProps {
  label: string
  placeholder: string
  value: GeoLocation | null
  onSelect: (location: GeoLocation) => void
  onClear: () => void
  /** The start of a journey is drawn as a ring, the end as a pin, the way the big map apps do. */
  kind?: "origin" | "destination"
  /** Colour of the origin ring. */
  iconColor?: string
  showLocateButton?: boolean
  onLocate?: () => void
  locating?: boolean
  // Phase 12 — pre-fills the search text (e.g. carried over from the
  // landing page's search box) and runs a real geocoding search for it on
  // mount, instead of silently discarding what the user already typed.
  // Never fabricates a selected location — the user still picks a result.
  initialQuery?: string
}

/**
 * One row of the journey card: a place search with suggestions. The visible name ("Origin", "Destination") is a real label
 * tied to the field but shown only to screen readers, because the ring or pin and the placeholder already say it on screen.
 * It sits inside a card that supplies the border, so the field itself is borderless.
 */
export default function LocationSearch({
  label,
  placeholder,
  value,
  onSelect,
  onClear,
  kind = "origin",
  iconColor = "#1f5bd8",
  showLocateButton = false,
  onLocate,
  locating = false,
  initialQuery,
}: LocationSearchProps) {
  const [inputValue, setInputValue] = useState(initialQuery ?? "")
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchError, setSearchError] = useState("")
  const inputId = useId()
  const listId = useId()
  // The suggestion the arrow keys are on (-1 = none); Enter picks it.
  const [activeIndex, setActiveIndex] = useState(-1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Guards against an older search's response landing after a newer search's
  // (e.g. the user kept typing past the debounce window) — only the latest
  // fired search's results are ever applied.
  const latestSearchIdRef = useRef(0)

  // Sync display value when external value changes
  useEffect(() => {
    if (value) {
      setInputValue(value.name)
      setIsOpen(false)
      setSuggestions([])
    } else {
      setInputValue("")
    }
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleInput = useCallback((query: string) => {
    setInputValue(query)
    setSearchError("")
    setActiveIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const searchId = ++latestSearchIdRef.current
      setIsSearching(true)
      try {
        const results = await mapService.search(query.trim())
        if (searchId !== latestSearchIdRef.current) return
        setSuggestions(results)
        setActiveIndex(-1)
        setIsOpen(results.length > 0)
        if (results.length === 0) setSearchError("No locations found.")
      } catch {
        if (searchId !== latestSearchIdRef.current) return
        setSearchError("Search unavailable. Please try again.")
        setSuggestions([])
        setIsOpen(false)
      } finally {
        if (searchId === latestSearchIdRef.current) setIsSearching(false)
      }
    }, 350)
  }, [])

  // Fires the real search for a carried-over initial query exactly once on
  // mount, so the dropdown is already populated rather than leaving the
  // user to retype what they entered on the landing page.
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length >= 2) {
      handleInput(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelect = (location: GeoLocation) => {
    onSelect(location)
    setInputValue(location.name)
    setIsOpen(false)
    setSuggestions([])
    setSearchError("")
  }

  const handleClear = () => {
    onClear()
    setInputValue("")
    setSuggestions([])
    setIsOpen(false)
    setSearchError("")
  }

  const isSelected = !!value

  // The WAI-ARIA combobox keys: arrows move through the suggestions, Enter picks, Escape closes.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const listOpen = isOpen && suggestions.length > 0
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (suggestions.length === 0) return
      e.preventDefault()
      if (!listOpen) { setIsOpen(true); setActiveIndex(e.key === "ArrowDown" ? 0 : suggestions.length - 1); return }
      const step = e.key === "ArrowDown" ? 1 : -1
      setActiveIndex((i) => (i + step + suggestions.length) % suggestions.length)
    } else if (e.key === "Enter" && listOpen && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIndex])
    } else if (e.key === "Escape" && listOpen) {
      e.preventDefault()
      e.stopPropagation()
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>

      <div className="relative flex items-center">
        {/* Start: a ring. End: a pin. */}
        {kind === "destination" ? (
          <MapPin aria-hidden="true" className="absolute left-3.5 z-10 h-[18px] w-[18px] flex-shrink-0 text-danger" />
        ) : (
          <span
            aria-hidden="true"
            className="absolute left-4 z-10 h-3 w-3 flex-shrink-0 rounded-full border-[3px] bg-white"
            style={{ borderColor: iconColor }}
          />
        )}

        <input
          id={inputId}
          type="text"
          autoComplete="off"
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          placeholder={isSelected ? value!.name : placeholder}
          className="min-h-[3.25rem] w-full rounded-panel bg-transparent py-3 pl-11 pr-20 text-sm font-medium text-navy-900 placeholder-navy-500 transition-colors focus:bg-navy-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/50"
        />

        {/* Right icons */}
        <div className="absolute right-1.5 flex items-center gap-0.5">
          {isSearching && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-brand-500" />}
          {showLocateButton && !isSelected && onLocate && (
            <button
              type="button"
              onClick={onLocate}
              disabled={locating}
              title="Use my current location"
              aria-label="Use my current location"
              className="flex h-10 w-10 items-center justify-center rounded-full text-navy-500 transition-colors hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
            >
              {locating ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LocateFixed aria-hidden="true" className="h-[18px] w-[18px]" />}
            </button>
          )}
          {isSelected && (
            <button
              type="button"
              onClick={handleClear}
              title={`Clear ${label.toLowerCase()}`}
              aria-label={`Clear ${label.toLowerCase()}`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-navy-500 transition-colors hover:bg-red-50 hover:text-danger"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Validation / search error */}
      {searchError && !isOpen && (
        <p className="px-4 pb-2 text-xs text-navy-500">{searchError}</p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div id={listId} role="listbox" aria-label={`${label} suggestions`} className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-64 overflow-hidden overflow-y-auto rounded-panel border border-navy-100 bg-white shadow-float">
          {suggestions.map((loc, i) => (
            <button
              key={i}
              id={`${listId}-${i}`}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              tabIndex={-1}
              onClick={() => handleSelect(loc)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex min-h-12 w-full items-start gap-3 border-b border-navy-100/80 px-4 py-3 text-left transition-colors last:border-0 hover:bg-brand-50 ${i === activeIndex ? "bg-brand-50" : ""}`}
            >
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-navy-500" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy-800">{loc.name}</p>
                <p className="mt-0.5 truncate text-xs text-navy-500">{loc.address}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
