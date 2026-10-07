/**
 * Phase 8 — deterministic (seeded) randomness for reproducible train/test
 * splits and synthetic data generation. Using Math.random() would make the
 * benchmark's reported numbers unreproducible between runs; a fixed seed
 * means the same inputs always produce the same split and the same report.
 */

// mulberry32 — small, fast, good-enough-for-synthetic-data PRNG. Not
// cryptographically secure, which is irrelevant here: this only needs to be
// deterministic given a seed, not unpredictable.
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Approximate standard-normal noise via the Box-Muller transform, scaled.
 * Good enough for "noisy, varied" synthetic demo data — not used for anything
 * statistically load-bearing.
 */
export function seededGaussianNoise(rand: () => number, scale: number): number {
  const u1 = Math.max(rand(), 1e-9)
  const u2 = rand()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return z * scale
}

/**
 * Fisher-Yates shuffle driven by a seeded PRNG — same seed always produces
 * the same permutation. Does not mutate the input array.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = createSeededRandom(seed)
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
