/**
 * Converts free-form text into a list of cleaned, unique bullet-like items.
 */
export function toUniqueItems(items: string[], fallback: string[] = []): string[] {
  const cleaned = items
    .map((item) => item.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);

  return Array.from(new Set(cleaned.length > 0 ? cleaned : fallback));
}

/**
 * Formats a number as a USD currency string for proposal-ready output.
 */
export function usd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Rounds a decimal to one digit to keep estimates readable.
 */
export function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Returns an ISO date after adding the requested number of weeks.
 */
export function dateAfterWeeks(weeks: number): string {
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}
