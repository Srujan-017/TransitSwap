/**
 * The hosted backend sleeps when nobody has used it for a while, and the first request can take half a minute. Asking for its
 * health page as soon as the site opens wakes it while the visitor is still reading the first screen, so the sign-in, the
 * place search and the first route are not the requests that pay for the wake-up. Fire and forget: nothing depends on the answer.
 */
export function warmUpBackend(baseUrl: string = import.meta.env.VITE_API_URL || "http://localhost:5000/api"): void {
  try {
    void fetch(`${baseUrl}/health`, { cache: "no-store" }).catch(() => {})
  } catch {
    // no network API in this environment: nothing to warm
  }
}
