import { useOutletContext } from 'react-router-dom';
import type { Vehicle } from '../../types';
import { formatDate } from '../../lib/format';
import { formatKm } from '../../lib/serviceLog';
import { useVehicleImage } from '../../lib/vehicleImageContext';
import { VehicleTurntable } from '../../components/VehicleTurntable';

export function Overview() {
  const vehicle = useOutletContext<Vehicle>();
  const image = useVehicleImage();
  const fields: [string, string | number | null][] = [
    ['Plate Number', vehicle.plate_no],
    ['Make', vehicle.brand],
    ['Model', vehicle.model],
    ['Vehicle Type', vehicle.type_of_car],
    ['Fuel Type', vehicle.fuel_type],
    ['Number of Seats', vehicle.seats],
    ['Chassis Number', vehicle.chassis_no],
    ['Registration Date', vehicle.registration_date && formatDate(vehicle.registration_date)],
    ['Vehicle Condition', vehicle.vehicle_condition],
    ['Gear Type', vehicle.gear_type],
    ['Tyre Size', vehicle.tyre_size],
    ['Owner', vehicle.owner],
    ['Driver', vehicle.driver ?? 'Not Assigned'],
    ['Department', vehicle.department],
    ['Mileage', vehicle.last_service_mileage_km != null ? formatKm(vehicle.last_service_mileage_km) : null],
    ['Status', vehicle.status === 'inactive' ? 'Inactive' : 'Active'],
    ['Remarks', vehicle.remarks],
  ];

  return (
    <div className="flex flex-wrap gap-6 items-stretch">
      <section
        aria-label="Vehicle details"
        className="flex-[1_1_420px] min-w-0 bg-white border border-oryx-line rounded-[14px] px-6 py-[22px]"
      >
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-7 gap-y-[18px]">
          {fields.map(([label, value]) => {
            const empty = value === null || value === '';
            return (
              <div key={label}>
                <dt className="text-[13px] text-oryx-muted">{label}</dt>
                <dd className={`mt-0.5 mb-0 text-base font-medium [overflow-wrap:anywhere] ${empty ? 'text-oryx-faint' : ''}`}>
                  {empty ? 'Not Available' : value}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
      {image.src && (
        <VehicleTurntable
          src={image.src}
          alt={`${vehicle.brand ?? ''} ${vehicle.model ?? ''}${image.isPhoto ? '' : ', representative image'}`.trim()}
        />
      )}
    </div>
  );
}
