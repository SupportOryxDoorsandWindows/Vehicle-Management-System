import { Link } from 'react-router-dom';
import type { Vehicle } from '../types';
import { formatAED, formatDate } from '../lib/format';
import { getVehicleImagePath } from '../lib/vehicleImage';
import type { VehicleAttention } from '../lib/vehicleAttention';
import { PlateChip } from './PlateChip';
import { TonePill } from './TonePill';
import { DriverAvatar } from './DriverAvatar';
import { NavIcon } from './NavIcons';

const ACTIVE: VehicleAttention = { tone: 'green', label: 'Active', rank: 1, daysLeft: null };
const INACTIVE: VehicleAttention = { tone: 'neutral', label: 'Inactive', rank: 0, daysLeft: null };

export function VehicleCard({
  vehicle,
  totalExpenses,
  attention,
  driverPhotoUrl,
}: {
  vehicle: Vehicle;
  totalExpenses: number;
  /** The status pill; defaults to the vehicle's plain Active / Inactive status. */
  attention?: VehicleAttention;
  driverPhotoUrl?: string | null;
}) {
  const imagePath = getVehicleImagePath(vehicle.model, vehicle.plate_no);
  const title = `${vehicle.brand ?? 'Not Available'} ${vehicle.model ?? 'Not Available'}`;
  const pill = attention ?? (vehicle.status === 'inactive' ? INACTIVE : ACTIVE);

  return (
    <Link
      to={`/vehicles/${vehicle.id}`}
      className="flex flex-col bg-white border border-oryx-line rounded-[14px] overflow-hidden no-underline text-oryx-ink shadow-[0_1px_2px_rgba(2,42,58,0.04)] hover:shadow-md hover:border-oryx-field transition-shadow"
    >
      <div className="relative h-[190px] bg-white border-b border-oryx-divider flex items-center justify-center">
        {imagePath ? (
          <img src={imagePath} alt={`${title}, representative image`} className="max-w-[88%] max-h-[168px] object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[#8C969D] text-xs">
            <NavIcon name="vehicles" size={56} />
            No photo yet
          </div>
        )}
        <TonePill tone={pill.tone} className="absolute top-3 left-3">
          {pill.label}
        </TonePill>
        {imagePath && (
          <span className="absolute bottom-2 right-3 text-[11px] text-oryx-faint">Representative image</span>
        )}
      </div>

      <div className="px-[18px] pt-4 pb-[18px] flex flex-col gap-3.5 flex-1">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h2 className="m-0 text-[17px] font-semibold text-oryx-blue">{title}</h2>
            <div className="text-[13px] text-oryx-muted">{vehicle.type_of_car ?? 'Type not recorded'}</div>
          </div>
          <PlateChip plate={vehicle.plate_no} />
        </div>

        <div className="flex items-center gap-3 px-3 py-2.5 bg-oryx-soft rounded-[10px]">
          <DriverAvatar driver={vehicle.driver} photoUrl={driverPhotoUrl} />
          <div className="min-w-0">
            <div className="text-xs text-oryx-muted">Driver</div>
            <div className="font-semibold truncate">{vehicle.driver ?? 'Not Assigned'}</div>
            <div className="text-xs text-oryx-muted">{vehicle.department ?? 'No department'}</div>
          </div>
        </div>

        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          <div>
            <dt className="text-oryx-muted">Condition</dt>
            <dd className="m-0 font-medium">{vehicle.vehicle_condition ?? 'Not Available'}</dd>
          </div>
          <div>
            <dt className="text-oryx-muted">Licence expiry</dt>
            <dd className="m-0 font-medium">{formatDate(vehicle.vehicle_license_expiry_date)}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-3 border-t border-oryx-divider flex justify-between items-baseline gap-3">
          <span className="text-[13px] text-oryx-muted">Total expenses</span>
          <span className="text-[17px] font-semibold text-oryx-blue tabular-nums">{formatAED(totalExpenses)}</span>
        </div>
      </div>
    </Link>
  );
}
