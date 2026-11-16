/**
 * Where the street map's pictures come from.
 *
 * Default: the standard OpenStreetMap tiles (the same ones the live navigation screen uses), credited as the OSM tile
 * policy asks. That is light-use, free, and needs no account.
 *
 * Optional: CARTO's cleaner "Voyager" style. CARTO's own terms say its tiles need a free key (it is issued against an email
 * address, with no card), so this is used ONLY when a key is supplied through the VITE_CARTO_KEY environment variable;
 * nothing here ever calls CARTO without one. If CARTO's tiles fail to load, the map falls back to OpenStreetMap.
 */

export interface StreetTiles {
  /** Shown in the layer control and used to tell the two apart. */
  name: "OpenStreetMap" | "CARTO Voyager"
  url: string
  attribution: string
  subdomains?: string
  maxZoom: number
}

export const OSM_TILES: StreetTiles = {
  name: "OpenStreetMap",
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  subdomains: "abc",
  maxZoom: 19,
}

export function cartoVoyagerTiles(key: string): StreetTiles {
  return {
    name: "CARTO Voyager",
    url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  }
}

/** CARTO Voyager if (and only if) a non-empty key is given; the OpenStreetMap tiles otherwise. */
export function pickStreetTiles(cartoKey?: string): StreetTiles {
  const key = cartoKey?.trim()
  return key ? cartoVoyagerTiles(key) : OSM_TILES
}

export const STREET_TILES: StreetTiles = pickStreetTiles(import.meta.env.VITE_CARTO_KEY as string | undefined)
