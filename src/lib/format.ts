export function formatAED(amount: number | null): string {
  if (amount === null) return 'Not Available';
  return `AED ${Math.round(amount).toLocaleString('en-AE')}`;
}
