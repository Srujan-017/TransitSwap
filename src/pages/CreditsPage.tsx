import { Link } from "react-router-dom"
import SkipLink from "../components/ui/SkipLink"
import { ArrowLeft, Bus, ExternalLink } from "lucide-react"
import Photo from "../components/ui/Photo"
import { PHOTO_LIST } from "../data/photoCredits"

// Other things the site is built on, each with the terms it asks us to follow.
const OTHER_CREDITS = [
  { name: "Map data", by: "© OpenStreetMap contributors", href: "https://www.openstreetmap.org/copyright", note: "Open Database Licence. Map tiles by OpenStreetMap, the OpenStreetMap France Humanitarian style and Esri World Imagery (the satellite view)." },
  { name: "Weather", by: "Open-Meteo.com", href: "https://open-meteo.com/", note: "Weather data licensed CC BY 4.0." },
  { name: "Map library", by: "Leaflet", href: "https://leafletjs.com/", note: "BSD 2-Clause licence." },
  { name: "Icons", by: "Lucide", href: "https://lucide.dev/", note: "ISC licence." },
  { name: "Fonts", by: "Inter and Plus Jakarta Sans", href: "https://fontsource.org/", note: "SIL Open Font Licence 1.1, served from this site through Fontsource." },
]

/** Public page: who took every photograph on the site, where it is from and under which licence. */
export default function CreditsPage() {
  return (
    <div className="min-h-screen bg-navy-50">
      <SkipLink />
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900">
              <Bus className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-navy-900">TransitSwap</span>
          </Link>
          <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-10 outline-none sm:px-6">
        <h1 className="font-display text-3xl font-bold text-navy-900">Credits</h1>
        <p className="mt-2 max-w-2xl text-navy-600">
          Every picture on TransitSwap is a real photograph by the person named below, used under the licence shown. None of them is
          AI-generated. Thank you to everyone who shares their work.
        </p>

        <h2 className="mt-10 font-display text-xl font-bold text-navy-900">Photographs</h2>
        <ul className="mt-4 grid gap-5 sm:grid-cols-2" aria-label="Photographs and their credits">
          {PHOTO_LIST.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-panel border border-navy-100 bg-white shadow-card">
              <Photo id={p.id} sizes="(min-width: 640px) 480px, 100vw" className="aspect-[3/2] w-full object-cover" />
              <div className="space-y-1.5 p-4 text-sm">
                <p className="font-semibold text-navy-900">{p.alt}</p>
                <p className="text-navy-600">
                  Photo by <span className="font-medium text-navy-800">{p.credit.author}</span> on{" "}
                  <a href={p.credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700">
                    {p.credit.source}<ExternalLink className="h-3 w-3" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </p>
                <p className="text-navy-600">
                  Licence:{" "}
                  <a href={p.credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700">
                    {p.credit.license}<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </p>
                <p className="text-xs text-navy-500">{p.credit.changes} Used for: {p.usedFor.toLowerCase()}.</p>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 font-display text-xl font-bold text-navy-900">Maps, weather, icons and fonts</h2>
        <ul className="mt-4 divide-y divide-navy-100 rounded-panel border border-navy-100 bg-white shadow-card">
          {OTHER_CREDITS.map((c) => (
            <li key={c.name} className="flex flex-col gap-0.5 p-4 text-sm sm:flex-row sm:items-baseline sm:gap-4">
              <span className="w-28 shrink-0 font-semibold text-navy-900">{c.name}</span>
              <span className="text-navy-600">
                <a href={c.href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700">
                  {c.by}<span className="sr-only"> (opens in a new tab)</span>
                </a>
                . {c.note}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs text-navy-500">
          TransitSwap is a student project. Transit, crowd and accessibility data in the app are synthetic demonstration data.
        </p>
      </main>
    </div>
  )
}
