/**
 * Some of the planner's reason lines start with an emoji ("🎯 Recommended for high schedule reliability"). They look different
 * on every phone, so the interface shows the words and leaves the picture out. Only a leading emoji (and the space after it)
 * is removed; the words themselves are never changed.
 */
export function stripLeadingEmoji(text: string): string {
  return text.replace(/^[\s\p{Extended_Pictographic}‍️]+/u, "")
}
