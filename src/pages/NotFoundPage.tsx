import { Link } from "react-router-dom"
import { Home, ArrowLeft } from "lucide-react"
import Button from "../components/ui/Button"

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-navy-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-display font-bold text-navy-200 mb-4">404</div>
        <h1 className="font-display text-2xl font-bold text-navy-900 mb-3">
          Route not found
        </h1>
        <p className="text-navy-500 mb-8 leading-relaxed">
          Looks like this page took a wrong turn. Let TransitSwap get you back on track.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/">
            <Button icon={<Home className="w-4 h-4" />}>Go Home</Button>
          </Link>
          <Button variant="outline" onClick={() => history.back()} icon={<ArrowLeft className="w-4 h-4" />}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
