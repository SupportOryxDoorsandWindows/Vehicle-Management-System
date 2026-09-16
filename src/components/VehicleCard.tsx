import { Link } from 'react-router-dom';
import type { Vehicle } from '../types';
import { formatAED } from '../lib/format';
import { VehiclePlaceholderImage } from './VehiclePlaceholderImage';

export function VehicleCard({ vehicle, totalExpenses }: { vehicle: Vehicle; totalExpenses: number }) {
  return (
    <Link
      to={`/vehicles/${vehicle.id}`}
      className="block border border-oryx-silver rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <VehiclePlaceholderImage className="h-36" />
      <div className="p-4">
        <h3 className="font-semibold text-oryx-blue">
          {vehicle.brand ?? 'Not Available'} {vehicle.model ?? 'Not Available'}
        </h3>
        <p className="text-sm text-black">Plate: {vehicle.plate_no}</p>
        <p className="text-sm text-black">Driver: {vehicle.driver ?? 'Not Assigned'}</p>
        <p className="text-sm text-black">Department: {vehicle.department ?? 'Not Assigned'}</p>
        <div className="flex justify-between mt-2 text-sm">
          <span>Condition: {vehicle.vehicle_condition ?? 'Not Available'}</span>
          <span className="capitalize">Status: {vehicle.status}</span>
        </div>
        <p className="mt-2 font-semibold text-oryx-blue">Total Expenses: {formatAED(totalExpenses)}</p>
      </div>
    </Link>
  );
}
