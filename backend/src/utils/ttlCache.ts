/**
 * Phase 11 — a small, bounded, in-process TTL cache shared by the cross-request
 * caches this phase adds (OSRM road legs, Nominatim geocoding, the /evaluation
 * benchmark). Bounded by both time (ttlMs) and size (maxEntries) so none of
 * them can grow into an unbounded memory leak from varied real user input
 * (e.g. every distinct address a user geocodes).
 */
export interface TtlCache<V> {
  get(key: string): V | undefined
  set(key: string, value: V): void
  readonly size: number
}

export function createTtlCache<V>(options: { ttlMs: number; maxEntries: number }): TtlCache<V> {
  const store = new Map<string, { value: V; expiresAt: number }>()

  function evictExpired(now: number) {
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key)
    }
  }

  return {
    get(key) {
      const entry = store.get(key)
      if (!entry) return undefined
      if (entry.expiresAt <= Date.now()) {
        store.delete(key)
        return undefined
      }
      return entry.value
    },
    set(key, value) {
      const now = Date.now()
      if (store.size >= options.maxEntries) {
        evictExpired(now)
        if (store.size >= options.maxEntries) {
          // Still full after dropping expired entries — evict the oldest
          // (Map preserves insertion order) rather than grow unbounded.
          const oldestKey = store.keys().next().value
          if (oldestKey !== undefined) store.delete(oldestKey)
        }
      }
      store.set(key, { value, expiresAt: now + options.ttlMs })
    },
    get size() {
      return store.size
    },
  }
}
