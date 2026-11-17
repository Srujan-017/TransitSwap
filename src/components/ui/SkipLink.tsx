/** The first stop when tabbing through any page: hidden until focused, then jumps past the navigation to #main-content. */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1300] focus:rounded-control focus:bg-navy-900 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
    >
      Skip to main content
    </a>
  )
}
