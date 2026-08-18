import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X, MapPin, Loader2, LocateFixed } from "lucide-react"
import { mapService } from "../../services/mapService"
import type { GeoLocation } from "../../types/map"

interface LocationSearchProps {
  label: string
  placeholder: string
  value: GeoLocation | null
  onSelect: (location: GeoLocation) => void
  onClear: () => void
  iconColor?: string
  showLocateButton?: boolean
  onLocate?: () => void
  locating?: boolean
}

export default function LocationSearch({
  label,
  placeholder,
  value,
  onSelect,
  onClear,
  iconColor = "#0ea5e9",
  showLocateButton = false,
  onLocate,
  locating = false,
}: LocationSearchProps) {
  const [inputValue, setInputValue] = useState("")
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchError, setSearchError] = useState("")

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await mapService.search(query.trim())
        setSuggestions(results)
        setIsOpen(results.length > 0)
        if (results.length === 0) setSearchError("No locations found.")
      } catch {
        setSearchError("Search unavailable. Please try again.")
        setSuggestions([])
        setIsOpen(false)
      } finally {
        setIsSearching(false)
      }
    }, 350)
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

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-navy-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>

      <div className="relative flex items-center">
        {/* Location dot indicator */}
        <div
          className="absolute left-3 w-2.5 h-2.5 rounded-full border-2 border-white ring-2 z-10 flex-shrink-0"
          style={{ background: iconColor, boxShadow: `0 0 0 2px ${iconColor}40` }}
        />

        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={isSelected ? value!.name : placeholder}
          className="w-full pl-8 pr-16 py-3 rounded-xl border border-navy-200 bg-navy-50 text-sm text-navy-900 placeholder-navy-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
        />

        {/* Right icons */}
        <div className="absolute right-2 flex items-center gap-1">
          {isSearching && <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />}
          {showLocateButton && !isSelected && onLocate && (
            <button
              type="button"
              onClick={onLocate}
              disabled={locating}
              title="Use my current location"
              className="p-1.5 rounded-lg text-navy-400 hover:text-brand-500 hover:bg-brand-50 transition-all disabled:opacity-50"
            >
              {locating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LocateFixed className="w-4 h-4" />
              )}
            </button>
          )}
          {isSelected && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-navy-400 hover:text-danger hover:bg-red-50 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Validation / search error */}
      {searchError && !isOpen && (
        <p className="text-xs text-navy-400 mt-1">{searchError}</p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-navy-200 shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((loc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(loc)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-brand-50 transition-colors border-b border-navy-100 last:border-0"
            >
              <MapPin className="w-4 h-4 text-navy-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy-800 truncate">{loc.name}</p>
                <p className="text-xs text-navy-400 truncate mt-0.5">{loc.address}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
