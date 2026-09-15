export function normalizePlate(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function extractPlateFromVehicleNumberField(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const platePart = raw.split(' - ')[0];
  return normalizePlate(platePart);
}
