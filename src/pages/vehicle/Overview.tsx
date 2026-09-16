import { useOutletContext } from 'react-router-dom';
import type { Vehicle } from '../../types';
import { FieldList } from '../../components/FieldList';

export function Overview() {
  const vehicle = useOutletContext<Vehicle>();
  return (
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
        Driver: vehicle.driver,
        Department: vehicle.department,
        Mileage: vehicle.last_service_mileage_km,
        Status: vehicle.status,
        Remarks: vehicle.remarks,
      }}
    />
  );
}
