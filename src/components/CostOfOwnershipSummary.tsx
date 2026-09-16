import { formatAED } from '../lib/format';
import type { CostOfOwnership } from '../lib/costOfOwnership';

const LABELS: Record<string, string> = {
  fuel: 'Fuel',
  insurance: 'Insurance',
  repairs: 'Repairs',
  maintenance: 'Maintenance',
  registration: 'Registration',
  other: 'Other Costs',
  financing: 'Financing',
  depreciation: 'Depreciation',
  taxesAndFees: 'Taxes & Fees',
};

export function CostOfOwnershipSummary({ result }: { result: CostOfOwnership }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-oryx-blue mb-2">Total Cost of Ownership</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-6">
        {Object.entries(result.categories).map(([key, value]) => (
          <div key={key}>
            <dt className="text-sm text-oryx-silver">{LABELS[key] ?? key}</dt>
            <dd className="text-black">{formatAED(value)}</dd>
          </div>
        ))}
      </dl>
      {result.excludedCategories.length > 0 && (
        <p className="text-sm text-oryx-silver mb-4">
          Excluded from totals (no source data): {result.excludedCategories.map((c) => LABELS[c] ?? c).join(', ')}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <dt className="text-sm text-oryx-silver">Total Cost</dt>
          <dd className="font-semibold text-oryx-blue">{formatAED(result.totalCost)}</dd>
        </div>
        <div>
          <dt className="text-sm text-oryx-silver">Average Annual Cost</dt>
          <dd className="font-semibold text-oryx-blue">{formatAED(result.averageAnnualCost)}</dd>
        </div>
        <div>
          <dt className="text-sm text-oryx-silver">Average Monthly Cost</dt>
          <dd className="font-semibold text-oryx-blue">{formatAED(result.averageMonthlyCost)}</dd>
        </div>
      </div>
      {result.costPerKm !== null && (
        <p className="mt-4">
          <span className="text-sm text-oryx-silver">Cost per KM: </span>
          <span className="font-semibold text-oryx-blue">AED {result.costPerKm.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}
