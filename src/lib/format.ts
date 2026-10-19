export function formatAED(amount: number | null): string {
  if (amount === null) return 'Not Available';
  return `AED ${Math.round(amount).toLocaleString('en-AE')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * "2026-10-17" -> "17 Oct 2026" (or "17 Oct" without the year, "Sat 17 Oct" with
 * the weekday). Reads the date as written, so it never shifts a day by time zone.
 */
export function formatDate(
  isoDate: string | null,
  { year = true, weekday = false }: { year?: boolean; weekday?: boolean } = {}
): string {
  if (!isoDate) return 'Not Available';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const [, y, m, d] = match.map(Number);
  const parts = [`${d} ${MONTHS[m - 1]}`];
  if (weekday) parts.unshift(WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]);
  if (year) parts.push(String(y));
  return parts.join(' ');
}

/** "EE 34759" -> { code: "EE", number: "34759" }; a plate without a code comes back whole. */
export function splitPlate(plate: string): { code: string | null; number: string } {
  const match = /^\s*([A-Za-z]{1,3})\s+(.+?)\s*$/.exec(plate);
  return match ? { code: match[1], number: match[2] } : { code: null, number: plate.trim() };
}
