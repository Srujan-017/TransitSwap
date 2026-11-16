// GENERATED from the photo conversion step (resized WebP files in public/images/photos) plus the credit details read
// from each photo's source page. Every photo on the site is a real photograph by a named photographer; nothing here is
// AI-generated. The /credits page and the <Photo> component both read this file, and photoCredits.test.ts checks that
// every photo has alt text, a credit, a licence and files on disk.

export type PhotoId =
  | "metro-sunset"
  | "green-line-train"
  | "tactile-platform"
  | "bmtc-bus"
  | "autos-vidhana-soudha"
  | "vidhana-soudha-rain"
  | "vidhana-soudha-clear"
  | "train-dusk"
  | "cubbon-park-station"
  | "streets-of-bangalore"
  | "street-view-bangalore"

export interface PhotoSize {
  /** Width in pixels of the file `/images/photos/<id>-<width>.webp`. */
  width: number
  height: number
}

export interface PhotoCredit {
  author: string
  source: "Unsplash" | "Wikimedia Commons"
  /** The photo's own page on its source site, where the author and licence can be checked. */
  sourceUrl: string
  license: string
  licenseUrl: string
  /** True where the licence (CC BY, CC BY-SA) requires crediting the author. Everything is credited regardless. */
  attributionRequired: boolean
  /** What we did to the original, as the Creative Commons licences require us to say. */
  changes: string
}

export interface PhotoEntry {
  id: PhotoId
  /** Describes the picture for screen readers. Never empty. */
  alt: string
  usedFor: string
  /** Available widths, smallest first. */
  sizes: PhotoSize[]
  /** A 24 px wide blurred copy shown while the real file loads. */
  placeholder: string
  averageColor: string
  credit: PhotoCredit
}

export const PHOTOS: Record<PhotoId, PhotoEntry> = {
  "metro-sunset": {
    id: "metro-sunset",
    alt: "A metro station platform with the sunset glowing through the station's glass wall",
    usedFor: "Landing hero",
    sizes: [{ width: 640, height: 360 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAOABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDESxtm08SlkEmwNuMoHOcEbepq42k6SI42bUljkZdxUHdistPKFjjyhvYDLkZPX9KnjNokQJtVY46nP+NS7opWZTuorWNiLeZpufvYwKKbdtE8mYohGPQUU1sJn//Z",
    averageColor: "#3a332a",
    credit: {
      author: "Jithin Vijayamohanan",
      source: "Unsplash",
      sourceUrl: "https://unsplash.com/photos/train-tracks-with-a-sunset-in-the-background-prb20cE4fvk",
      license: "Unsplash License",
      licenseUrl: "https://unsplash.com/license",
      attributionRequired: false,
      changes: "Resized and converted to WebP.",
    },
  },
  "green-line-train": {
    id: "green-line-train",
    alt: "A green and white metro train pulling into an elevated station",
    usedFor: "Metro feature, dashboard",
    sizes: [{ width: 640, height: 442 }, { width: 1280, height: 885 }, { width: 1920, height: 1327 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAARABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDAgtJfOVEixKT8uSAauNo95cAl9p+rrwfzqvEoi/eZcxg/eBOVp1x5BX5Npz3wDQIWbQJ4wC8kA69Hz0GfSis2RQDjYp+mRRSA07L7rfQ1ny0UUxjJP+PdPrRRRSQH/9k=",
    averageColor: "#373a37",
    credit: {
      author: "Asif Ahmed",
      source: "Unsplash",
      sourceUrl: "https://unsplash.com/photos/a-green-and-white-train-pulling-into-a-train-station-N8bQPdaZ2iU",
      license: "Unsplash License",
      licenseUrl: "https://unsplash.com/license",
      attributionRequired: false,
      changes: "Resized and converted to WebP.",
    },
  },
  "tactile-platform": {
    id: "tactile-platform",
    alt: "An empty metro platform with a yellow tactile guide strip along its edge",
    usedFor: "Accessible stations",
    sizes: [{ width: 640, height: 481 }, { width: 1280, height: 961 }, { width: 1920, height: 1442 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAASABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDnkj3cthQByWOBU25vL8u1R9p+82OW/wDre1a9jYW1yZEYMzqS0bMefpTnsztVVuJIwOACcj8xSuBjRadcz9E4orQe0u4BwFlXJOeT/Wip5h2LGmki7TB71euQPPnHbGcUUU3sCI7Qn1NFFFShn//Z",
    averageColor: "#5c5c53",
    credit: {
      author: "Deepak Thakur",
      source: "Unsplash",
      sourceUrl: "https://unsplash.com/photos/a-train-is-pulling-into-a-train-station-mn01pDwT_uI",
      license: "Unsplash License",
      licenseUrl: "https://unsplash.com/license",
      attributionRequired: false,
      changes: "Resized and converted to WebP.",
    },
  },
  "bmtc-bus": {
    id: "bmtc-bus",
    alt: "A red BMTC bus, route 335E, on a tree-lined road in Bengaluru",
    usedFor: "Buses with numbers",
    sizes: [{ width: 640, height: 407 }, { width: 1280, height: 814 }, { width: 1920, height: 1222 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDPN/L5/JY5JyG5znmtXTr+Esod44lDbctnANaLaRHLvJIBdtxwoAz+VYdzodxbyE+dCUJz3zn3GKhQ1HyrudPdarBbws6skj4wCCMH8aKyoI7BImE8W7nPyjAFFa8rIe+jP//Z",
    averageColor: "#939488",
    credit: {
      author: "Ramesh NG",
      source: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:A_BMTC_bus_Public_Transport_Bangalore_Karnataka_India_2014.jpg",
      license: "CC BY-SA 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      attributionRequired: true,
      changes: "Resized and converted to WebP.",
    },
  },
  "autos-vidhana-soudha": {
    id: "autos-vidhana-soudha",
    alt: "Two green and yellow auto-rickshaws passing Vidhana Soudha",
    usedFor: "Autos for the last mile",
    sizes: [{ width: 640, height: 426 }, { width: 1280, height: 852 }, { width: 1920, height: 1278 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAQABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDeN/Ysc/aYvzrKm1mNrs/L+6xtx3znrWLNJ9jcJcx/MRnbvzgVahxdKXhj3KvB5HX8alzYWiactxakEC5jwfeisC4aSOUKLU7QME4PJ/oKKv2suxHs4n//2Q==",
    averageColor: "#81857c",
    credit: {
      author: "Letian Zhang",
      source: "Unsplash",
      sourceUrl: "https://unsplash.com/photos/tuk-tuks-drive-past-a-grand-government-building-HJrZwkwa1ww",
      license: "Unsplash License",
      licenseUrl: "https://unsplash.com/license",
      attributionRequired: false,
      changes: "Resized and converted to WebP.",
    },
  },
  "vidhana-soudha-rain": {
    id: "vidhana-soudha-rain",
    alt: "Vidhana Soudha under a heavy grey monsoon sky",
    usedFor: "Weather-aware routes",
    sizes: [{ width: 640, height: 427 }, { width: 1280, height: 853 }, { width: 1920, height: 1280 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAQABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwC6OOlIzhVJY4A5rNOqArwmDkHk9u9V7q+klUEFUjYYx1zTuBro3mKHU5BGRRWOmozQoEjlCxr0wBRRzBY//9k=",
    averageColor: "#7e7f85",
    credit: {
      author: "Chinmay Dhope",
      source: "Unsplash",
      sourceUrl: "https://unsplash.com/photos/a-city-street-with-a-large-building-in-the-background-samuY3nlzSY",
      license: "Unsplash License",
      licenseUrl: "https://unsplash.com/license",
      attributionRequired: false,
      changes: "Cropped from portrait to landscape, resized and converted to WebP.",
    },
  },
  "vidhana-soudha-clear": {
    id: "vidhana-soudha-clear",
    alt: "Vidhana Soudha, Bengaluru, under a blue sky with white clouds",
    usedFor: "Sign-in and sign-up panel",
    sizes: [{ width: 640, height: 512 }, { width: 1280, height: 1024 }, { width: 1920, height: 1536 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAATABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCMR4I3dKu3ai6CNFEwOMfXFJb3VqhDkMWx025xUcupSG4Xyw6BCRjHykVbqLoZqD6jrbTmZt03yxjt3PtRTW1IFSAp555IopOpfqNRt0MNHYgknmrDyuq7Q3BHIoorn6lksSh87lB/Ciiioe4z/9k=",
    averageColor: "#7a888b",
    credit: {
      author: "zablanca_clicks",
      source: "Unsplash",
      sourceUrl: "https://unsplash.com/photos/a-large-building-with-a-lot-of-people-around-it-ZB9Mad3xL8Q",
      license: "Unsplash License",
      licenseUrl: "https://unsplash.com/license",
      attributionRequired: false,
      changes: "Resized and converted to WebP.",
    },
  },
  "train-dusk": {
    id: "train-dusk",
    alt: "A train waiting at a station platform at dusk, silhouetted against an orange sky",
    usedFor: "Page not found, dark sections",
    sizes: [{ width: 640, height: 360 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAOABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDFSezIw7kD/ZSrEV9pkK/u4Wd/V+a5+hRuYD1qXG+7KUrbI2JNRzC6RvLErk/KhAHJ5orIddrsuc4OKKFFLYTbP//Z",
    averageColor: "#31271d",
    credit: {
      author: "Jithin Vijayamohanan",
      source: "Unsplash",
      sourceUrl: "https://unsplash.com/photos/a-train-on-the-railway-tracks-VOYoKmp_zTA",
      license: "Unsplash License",
      licenseUrl: "https://unsplash.com/license",
      attributionRequired: false,
      changes: "Resized and converted to WebP.",
    },
  },
  "cubbon-park-station": {
    id: "cubbon-park-station",
    alt: "The concourse and escalators inside Cubbon Park Metro station",
    usedFor: "Empty states, how it works",
    sizes: [{ width: 640, height: 360 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAOABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCB9PYAEKEYjJ+YFT/hTRFNt8ntu3bNwxnHWqT3X7zy4AEz/ERk1K8CpamZT84HORnPvn1qdStC2tmSGPyM64PLjA/CiqwjPlRTlgwOMgjGRjNFLUd0f//Z",
    averageColor: "#6a6057",
    credit: {
      author: "Wilhelm Tell DCCXLVI",
      source: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Cubbon_Park_Metro_station_interior.jpg",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      attributionRequired: false,
      changes: "Resized and converted to WebP.",
    },
  },
  "streets-of-bangalore": {
    id: "streets-of-bangalore",
    alt: "An auto-rickshaw on a tree-shaded Bengaluru street",
    usedFor: "Dashboard header, commuters band",
    sizes: [{ width: 640, height: 427 }, { width: 1280, height: 853 }, { width: 1920, height: 1280 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAQABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDC3tDOSoyCcf8A1634iqosxyy7doU8A/gKJbG2wXWBeVJBbgZ7VTiW581Vl2NFjBVXIz71Fx2INQkVpXMaeWoztAHairUkcZjCRhi5PzJweO+PWii6HY//2Q==",
    averageColor: "#6d675c",
    credit: {
      author: "Eirik Refsdal",
      source: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Streets_of_Bangalore.jpg",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      attributionRequired: true,
      changes: "Resized and converted to WebP.",
    },
  },
  "street-view-bangalore": {
    id: "street-view-bangalore",
    alt: "Pedestrians and auto-rickshaws on a busy Bengaluru road",
    usedFor: "City street scene",
    sizes: [{ width: 640, height: 424 }, { width: 1280, height: 848 }, { width: 1920, height: 1272 }],
    placeholder: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAQABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCsxkZAofJz3/zmtGK9iNhBaCGOQsxR9xwPr9TWPblrp/LlLKMnA9selSSRiK6SONWKj5gSeQfWofcqNmQXVq8bscBselFW7tR9mBDkYOXAOSx9c0UWK5b7H//Z",
    averageColor: "#71665a",
    credit: {
      author: "Pasztilla aka Attila Terbócs",
      source: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Street_view_in_Bangalore,_India.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      attributionRequired: true,
      changes: "Resized and converted to WebP.",
    },
  },
}

export const PHOTO_LIST: PhotoEntry[] = Object.values(PHOTOS)

/** The URL of one size of a photo. */
export function photoUrl(id: PhotoId, width: number): string {
  return `/images/photos/${id}-${width}.webp`
}
