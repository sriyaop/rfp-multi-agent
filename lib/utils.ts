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
 * Formats a number as proposal-ready currency.
 */
export function money(value: number, currency = "USD"): string {
  const locale =
    currency === "INR"
      ? "en-IN"
      : currency === "GBP"
      ? "en-GB"
      : currency === "EUR"
      ? "en-IE"
      : currency === "CAD"
      ? "en-CA"
      : currency === "AUD"
      ? "en-AU"
      : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Backward-compatible USD formatter for older proposal text paths.
 */
export function usd(value: number): string {
  return money(value, "USD");
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
