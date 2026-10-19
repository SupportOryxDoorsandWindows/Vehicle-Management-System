import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { fetchVehicleById } from '../../api/vehicles';
import { fetchLatestVehiclePhoto } from '../../api/documents';
import { getVehicleImagePath } from '../../lib/vehicleImage';
import { VehicleImageContext } from '../../lib/vehicleImageContext';
import { NavIcon } from '../../components/NavIcons';
import { PlateChip } from '../../components/PlateChip';
import { TonePill } from '../../components/TonePill';
import { DriverPhotoPanel } from '../../components/DriverPhotoPanel';
import { LoadError } from '../../components/LoadError';
import { BUTTON, BUTTON_PRIMARY, LINK } from '../../components/ui';
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
        <h1 className="text-2xl font-semibold text-oryx-blue mb-2">Vehicle not found</h1>
        <p className="mb-4">This vehicle doesn't exist or may have been removed.</p>
        <Link to="/vehicles" className={LINK}>
          Back to Vehicles
        </Link>
      </div>
    );
  }

  const photoUrl = photo?.url ?? null;
  const imagePath = photoUrl ?? getVehicleImagePath(vehicle.model);
  const title = `${vehicle.brand ?? 'Not Available'} ${vehicle.model ?? 'Not Available'}`;

  return (
    <VehicleImageContext.Provider value={{ src: imagePath, isPhoto: !!photoUrl }}>
      <div className="flex flex-col gap-[18px]">
        <nav aria-label="Breadcrumb" className="text-[13px] text-oryx-muted print:hidden">
          <Link to="/vehicles" className={LINK}>
            Vehicles
          </Link>{' '}
          <span aria-hidden="true">/</span> {vehicle.plate_no}
        </nav>

        <header className="flex flex-wrap items-center gap-5">
          {imagePath ? (
            <img
              src={imagePath}
              alt={title}
              className={`w-28 h-[76px] flex-none bg-white border border-oryx-line rounded-[10px] ${
                photoUrl ? 'object-cover' : 'object-contain p-1'
              }`}
            />
          ) : (
            <div className="w-28 h-[76px] flex-none bg-white border border-oryx-line rounded-[10px] flex items-center justify-center text-[#8C969D]">
              <NavIcon name="vehicles" size={40} />
            </div>
          )}
          <div className="flex-[1_1_280px] min-w-0">
            <h1 className="m-0 text-[28px] font-semibold tracking-[-0.01em] text-oryx-blue">{title}</h1>
            <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
              <PlateChip plate={vehicle.plate_no} size="lg" />
              <TonePill tone={vehicle.status === 'inactive' ? 'neutral' : 'green'} className="!py-0.5">
                {vehicle.status === 'inactive' ? 'Inactive' : 'Active'}
              </TonePill>
              {imagePath && !photoUrl && (
                <span className="text-xs text-oryx-faint">Representative image, not this specific vehicle</span>
              )}
            </div>
          </div>

          <DriverPhotoPanel driver={vehicle.driver} department={vehicle.department} />

          {isAdmin && (
            <div className="flex flex-wrap gap-2.5 print:hidden">
              <Link to={`/vehicles/${vehicle.id}/edit`} className={BUTTON}>
                Edit vehicle
              </Link>
              <Link to={`/expenses/new?vehicle=${vehicle.id}`} className={BUTTON_PRIMARY}>
                Add expense
              </Link>
            </div>
          )}
        </header>

        <nav aria-label="Vehicle sections" className="flex flex-wrap gap-1 border-b border-oryx-field print:hidden">
          {tabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `px-3.5 py-2.5 no-underline -mb-px ${
                  isActive
                    ? 'text-oryx-blue font-semibold border-b-[3px] border-oryx-blue'
                    : 'text-oryx-ink hover:text-oryx-blue'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div>
          <Outlet context={vehicle} />
        </div>
      </div>
    </VehicleImageContext.Provider>
  );
}
