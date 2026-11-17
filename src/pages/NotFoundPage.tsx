import { Link } from "react-router-dom"
import SkipLink from "../components/ui/SkipLink"
import { Home, ArrowLeft } from "lucide-react"
import Button from "../components/ui/Button"
import Photo from "../components/ui/Photo"

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-950 px-4 py-12">
      <SkipLink />
      <Photo id="train-dusk" decorative priority sizes="100vw" className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/70 to-navy-950/40" />
      <main id="main-content" tabIndex={-1} className="relative w-full max-w-md text-center outline-none">
        <p aria-hidden="true" className="font-display text-8xl font-bold tracking-tight text-white sm:text-9xl">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Route not found</h1>
        <p className="mt-3 leading-relaxed text-white">
          Looks like this page took a wrong turn. Let TransitSwap get you back on track.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/">
            <Button variant="go" icon={<Home className="h-4 w-4" />}>Go Home</Button>
          </Link>
          <Button variant="outline" onClick={() => history.back()} icon={<ArrowLeft className="h-4 w-4" />}>
            Go Back
          </Button>
        </div>
      </main>
    </div>
  )
}
