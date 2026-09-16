export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired' | 'not_available';

export function getDocumentStatus(
  expiryDate: string | null,
  asOf: Date,
  expiringSoonDays = 30
): DocumentStatus {
  if (!expiryDate) return 'not_available';
  const expiry = new Date(expiryDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilExpiry = Math.floor((expiry.getTime() - asOf.getTime()) / msPerDay);
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= expiringSoonDays) return 'expiring_soon';
  return 'valid';
}
