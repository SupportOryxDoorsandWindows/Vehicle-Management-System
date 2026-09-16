export function FieldList({ fields }: { fields: Record<string, string | number | null> }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {Object.entries(fields).map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-oryx-silver">{label}</dt>
          <dd className="text-black">{value === null || value === '' ? 'Not Available' : value}</dd>
        </div>
      ))}
    </dl>
  );
}
