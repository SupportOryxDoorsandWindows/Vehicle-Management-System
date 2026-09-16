export function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-oryx-silver rounded-lg p-4">
      <p className="text-sm text-oryx-silver">{label}</p>
      <p className="text-2xl font-bold text-oryx-blue">{value}</p>
    </div>
  );
}
