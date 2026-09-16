import { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { fetchVehicleById } from '../../api/vehicles';
import type { Vehicle } from '../../types';

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-oryx-blue mb-1">
        {vehicle.brand} {vehicle.model}
      </h1>
      <p className="text-oryx-silver mb-4">Plate: {vehicle.plate_no}</p>
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
