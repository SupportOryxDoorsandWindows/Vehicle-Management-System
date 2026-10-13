import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { fetchVehicleById } from '../../api/vehicles';
import { fetchLatestVehiclePhoto } from '../../api/documents';
import { getVehicleImagePath } from '../../lib/vehicleImage';
import { VehiclePlaceholderImage } from '../../components/VehiclePlaceholderImage';
import { LoadError } from '../../components/LoadError';
import { useLoad } from '../../lib/useLoad';
import { useIsAdmin } from '../../lib/useIsAdmin';

const tabs = [
  { to: '', label: 'Overview', end: true },
  { to: 'expenses', label: 'Expenses' },
  { to: 'maintenance', label: 'Maintenance' },
  { to: 'documents', label: 'Documents' },
  { to: 'finance', label: 'Finance' },
  { to: 'reports', label: 'Reports' },
];

export function VehicleProfileLayout() {
  const { id = '' } = useParams();
  const { data, error } = useLoad(
    () =>
      Promise.all([
        fetchVehicleById(id),
        // The photo is decoration: if it fails, fall back to the representative image.
        fetchLatestVehiclePhoto(id).catch(() => null),
      ]),
    [id]
  );
  const vehicle = data?.[0];
  const photo = data?.[1] ?? null;
  const isAdmin = useIsAdmin();

  if (error) return <LoadError what="this vehicle" message={error} />;
  if (vehicle === undefined) return <p>Loading...</p>;
  if (vehicle === null) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-oryx-blue mb-2">Vehicle not found</h1>
        <p className="mb-4">This vehicle doesn't exist or may have been removed.</p>
        <Link to="/vehicles" className="text-oryx-blue underline">
          Back to Vehicles
        </Link>
      </div>
    );
  }

  const photoUrl = photo?.url ?? null;
  const imagePath = photoUrl ?? getVehicleImagePath(vehicle.model);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        {imagePath ? (
          <div className="w-24 h-16 bg-white border border-oryx-silver rounded relative shrink-0">
            <img
              src={imagePath}
              alt={`${vehicle.brand ?? ''} ${vehicle.model ?? ''}`}
              className={photoUrl ? 'w-full h-full object-cover rounded' : 'w-full h-full object-contain p-1'}
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
          {imagePath && !photoUrl && (
            <p className="text-xs text-oryx-silver">Representative image, not this specific vehicle</p>
          )}
        </div>
        {isAdmin && (
          <Link
            to={`/vehicles/${vehicle.id}/edit`}
            className="ml-auto border border-oryx-blue text-oryx-blue rounded px-3 py-1 text-sm print:hidden"
          >
            Edit vehicle
          </Link>
        )}
      </div>
      <div className="flex gap-4 border-b border-oryx-silver mb-4 print:hidden">
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
