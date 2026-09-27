export function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Human-readable, collision-resistant and non-sequential order reference.
 * The timestamp keeps it sortable/recognisable; the random block keeps public
 * tracking references unguessable (Date.now() alone was walkable).
 */
export function generateOrderId(): string {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 36)
  )
    .map((n) => n.toString(36))
    .join("")
    .toUpperCase();
  return `CR${time}${rand}`;
}

/** Escape a user-supplied string before interpolating it into a $regex. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN");
}
