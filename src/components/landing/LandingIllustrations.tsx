// Hand-authored vector illustrations for the Landing page, in TransitSwap's
// own navy/sky-blue palette — matching the actual visual language found on
// the reference site (transitapp.com): flat illustrated city/transit scenes
// and vehicle silhouettes, not stock photography. No external image assets.

/** A simple city skyline + transit vehicles street scene for the hero. */
export function CityTransitScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 900 180" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* ground line */}
      <line x1="0" y1="160" x2="900" y2="160" stroke="#e2e8f0" strokeWidth="2" />
      {/* skyline silhouettes */}
      <g opacity="0.5">
        <rect x="20" y="70" width="46" height="90" rx="4" fill="#cbd5e1" />
        <rect x="74" y="40" width="40" height="120" rx="4" fill="#94a3b8" />
        <rect x="122" y="90" width="50" height="70" rx="4" fill="#cbd5e1" />
        <rect x="740" y="60" width="44" height="100" rx="4" fill="#cbd5e1" />
        <rect x="792" y="30" width="38" height="130" rx="4" fill="#94a3b8" />
        <rect x="838" y="85" width="44" height="75" rx="4" fill="#cbd5e1" />
      </g>
      {/* metro train */}
      <g transform="translate(360,90)">
        <rect x="0" y="0" width="150" height="55" rx="12" fill="#2563eb" />
        <rect x="8" y="10" width="28" height="22" rx="4" fill="#bfdbfe" />
        <rect x="44" y="10" width="28" height="22" rx="4" fill="#bfdbfe" />
        <rect x="80" y="10" width="28" height="22" rx="4" fill="#bfdbfe" />
        <rect x="116" y="10" width="26" height="22" rx="4" fill="#bfdbfe" />
        <circle cx="25" cy="60" r="8" fill="#1e293b" />
        <circle cx="125" cy="60" r="8" fill="#1e293b" />
      </g>
      {/* bus */}
      <g transform="translate(580,100)">
        <rect x="0" y="0" width="110" height="45" rx="10" fill="#16a34a" />
        <rect x="8" y="8" width="24" height="18" rx="3" fill="#bbf7d0" />
        <rect x="40" y="8" width="24" height="18" rx="3" fill="#bbf7d0" />
        <rect x="72" y="8" width="24" height="18" rx="3" fill="#bbf7d0" />
        <circle cx="22" cy="50" r="7" fill="#1e293b" />
        <circle cx="92" cy="50" r="7" fill="#1e293b" />
      </g>
      {/* pedestrian + dotted path to station */}
      <g transform="translate(220,120)">
        <circle cx="0" cy="-28" r="8" fill="#0ea5e9" />
        <path d="M0 -20 L0 10 M-10 0 L10 0 M0 10 L-8 30 M0 10 L8 30" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" />
      </g>
      <path d="M232 128 Q 290 100, 355 115" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" fill="none" />
      {/* cyclist */}
      <g transform="translate(140,128)">
        <circle cx="-10" cy="12" r="12" stroke="#f59e0b" strokeWidth="3" fill="none" />
        <circle cx="22" cy="12" r="12" stroke="#f59e0b" strokeWidth="3" fill="none" />
        <path d="M-10 12 L6 -8 L22 12 M6 -8 L-2 12 M6 -8 L0 -16" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="0" cy="-22" r="6" fill="#f59e0b" />
      </g>
    </svg>
  )
}

/** A small floating "live arrival" style badge card, echoing the reference site's UI-mockup cards. */
export function FloatingArrivalCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-[0_12px_30px_-8px_rgba(15,23,42,0.3)] px-4 py-2.5 ${className}`}>
      <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-wide">Next metro</p>
      <p className="font-display font-bold text-brand-600 text-lg leading-tight">3 min</p>
    </div>
  )
}
