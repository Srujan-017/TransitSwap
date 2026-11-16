import { Link } from "react-router-dom"

/** The quiet footer under every signed-in page: what this is, and where the credits live. */
export default function AppFooter() {
  return (
    <footer className="border-t border-navy-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-navy-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          © {new Date().getFullYear()} TransitSwap · A student project. Transit, crowd and accessibility data are demonstration data.
        </p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link to="/credits" className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700">Photo credits</Link>
        </nav>
      </div>
    </footer>
  )
}
