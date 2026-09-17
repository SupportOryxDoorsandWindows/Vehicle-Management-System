import { useOutletContext } from 'react-router-dom';
import type { Vehicle } from '../../types';
import { FieldList } from '../../components/FieldList';
import { DriverPhoto } from '../../components/DriverPhoto';

export function Overview() {
  const vehicle = useOutletContext<Vehicle>();
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <DriverPhoto driver={vehicle.driver} className="w-28 h-28 shrink-0" />
        <div>
          <p className="text-sm text-oryx-silver">Driver</p>
          <p className="text-black text-lg font-medium">{vehicle.driver ?? 'Not Assigned'}</p>
        </div>
      </div>
      <FieldList
        fields={{
          'Plate Number': vehicle.plate_no,
          Make: vehicle.brand,
          Model: vehicle.model,
          'Vehicle Type': vehicle.type_of_car,
          'Fuel Type': vehicle.fuel_type,
          'Number of Seats': vehicle.seats,
          'Chassis Number': vehicle.chassis_no,
          'Registration Date': vehicle.registration_date,
          'Vehicle Condition': vehicle.vehicle_condition,
          'Gear Type': vehicle.gear_type,
          'Tyre Size': vehicle.tyre_size,
          Owner: vehicle.owner,
          Department: vehicle.department,
          Mileage: vehicle.last_service_mileage_km,
          Status: vehicle.status,
          Remarks: vehicle.remarks,
        }}
      />
    </div>
  );
}
