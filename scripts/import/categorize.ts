export type SystemCategory =
  | 'fuel'
  | 'insurance'
  | 'repairs'
  | 'maintenance'
  | 'registration'
  | 'finance'
  | 'other';

export function deriveSystemCategory(typeOfExpense: string, expense: string): SystemCategory {
  const type = typeOfExpense.toLowerCase();
  const combined = `${type} ${expense.toLowerCase()}`;

  if (/petrol|fuel|diesel/.test(combined)) return 'fuel';
  if (/insurance/.test(combined)) return 'insurance';
  if (type === 'repair' || /repair/.test(combined)) return 'repairs';
  if (/renewal|registration|licen[cs]e/.test(combined)) return 'registration';
  if (/servicing|tyre|test|cabin filter/.test(combined)) return 'maintenance';
  return 'other';
}
