import { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { fetchVehicleById } from '../../api/vehicles';
import type { Vehicle } from '../../types';
import { getVehicleImagePath } from '../../lib/vehicleImage';
import { VehiclePlaceholderImage } from '../../components/VehiclePlaceholderImage';

const tabs = [
  { to: '', label: 'Overview', end: true },
  { to: 'expenses', label: 'Expenses' },
  { to: 'maintenance', label: 'Maintenance' },
  { to: 'documents', label: 'Documents' },
  { to: 'finance', label: 'Finance' },
  { to: 'reports', label: 'Reports' },
];

export function VehicleProfileLayout() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (id) fetchVehicleById(id).then(setVehicle);
  }, [id]);

  if (!vehicle) return <p>Loading...</p>;

  const imagePath = getVehicleImagePath(vehicle.model);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        {imagePath ? (
          <div className="w-24 h-16 bg-white border border-oryx-silver rounded relative shrink-0">
            <img
              src={imagePath}
              alt={`${vehicle.brand ?? ''} ${vehicle.model ?? ''}`}
              className="w-full h-full object-contain p-1"
            />
          </div>
        ) : (
          <VehiclePlaceholderImage className="w-24 h-16 rounded shrink-0" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-oryx-blue mb-1">
            {vehicle.brand ?? 'Not Available'} {vehicle.model ?? 'Not Available'}
          </h1>
          <p className="text-oryx-silver">Plate: {vehicle.plate_no}</p>
          {imagePath && <p className="text-xs text-oryx-silver">Representative image, not this specific vehicle</p>}
        </div>
      </div>
      <div className="flex gap-4 border-b border-oryx-silver mb-4">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `pb-2 ${isActive ? 'border-b-2 border-oryx-blue font-semibold text-oryx-blue' : 'text-black'}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet context={vehicle} />
    </div>
  );
}
