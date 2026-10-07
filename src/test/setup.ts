import "@testing-library/jest-dom/vitest"

// Phase 10 — jsdom (29+) no longer bundles its own localStorage/sessionStorage
// implementation; it delegates to the host Node runtime's experimental Web
// Storage API, which requires a `--localstorage-file` CLI flag this project
// does not (and should not have to) set just to run component tests. Without
// it, `window.localStorage` is simply `undefined` in jsdom, and AuthContext
// (read on every render) would throw. A minimal in-memory polyfill is all
// these tests need — no quota, no storage events, no persistence.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => void store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

if (!window.localStorage || typeof window.localStorage.clear !== "function") {
  Object.defineProperty(window, "localStorage", { value: createMemoryStorage(), configurable: true })
}
if (!window.sessionStorage || typeof window.sessionStorage.clear !== "function") {
  Object.defineProperty(window, "sessionStorage", { value: createMemoryStorage(), configurable: true })
}

// Phase 10 — jsdom has no real implementation of these browser APIs; several
// pages/components call them (Leaflet map sizing, scroll-into-view on route
// selection) and would otherwise throw in every test that renders them.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})
