// Real driver photos, matched by exact name (never fuzzy — a wrong match
// would attach the wrong person's photo to a driver). Files are named by
// the driver's exact name in kebab-case, e.g. "Chris Dawson" -> chris-dawson.png.
// Whether a matching file actually exists is resolved at render time
// (see DriverPhoto's onError fallback), not here.
function toFileSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Returns the expected photo path for a driver's name, or null if there's no name to match. */
export function getDriverImagePath(driver: string | null): string | null {
  if (!driver) return null;
  const slug = toFileSlug(driver);
  if (!slug) return null;
  return `${import.meta.env.BASE_URL}driver-images/${slug}.png`;
}
