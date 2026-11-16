/** "8:36 AM" — the clock time the rest of the app shows (the backend formats times the same way). */
export function formatClock(date: Date): string {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${hours}:${minutes < 10 ? `0${minutes}` : minutes} ${ampm}`
}
