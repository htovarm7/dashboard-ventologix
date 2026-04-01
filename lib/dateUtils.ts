/**
 * Parses a YYYY-MM-DD date string as local time (not UTC).
 * Using `new Date("2024-01-15")` interprets the date as UTC midnight,
 * which displays as the previous day in negative UTC offsets.
 */
export function parseLocalDate(dateString: string): Date {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 * Avoids `new Date().toISOString().split("T")[0]` which returns UTC date.
 */
export function todayString(): string {
  return formatLocalDate(new Date());
}

/**
 * Formats a Date object as YYYY-MM-DD using local time.
 * Avoids `.toISOString().split("T")[0]` which uses UTC.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
