import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createVehicle, fetchVehicleById, updateVehicle, type VehicleInput } from '../api/vehicles';
import { normalizePlate } from '../../scripts/import/normalize';
import { RecordForm } from '../components/RecordForm';
import { LoadError } from '../components/LoadError';
import { fromFormValues, toFormValues, type FieldErrors } from '../lib/recordForm';
import { VEHICLE_FIELD_GROUPS } from '../lib/vehicleFields';
import { errorMessage, useLoad } from '../lib/useLoad';
import type { Vehicle } from '../types';

const NEW_VEHICLE = { status: 'active' };

/** /vehicles/new and /vehicles/:id/edit */
export function VehicleForm() {
  const { id } = useParams();
  const { data: vehicle, error } = useLoad(
    () => (id ? fetchVehicleById(id) : Promise.resolve(null)),
    [id]
  );

  if (error) return <LoadError what="this vehicle" message={error} />;
  if (vehicle === undefined) return <p>Loading...</p>;
  if (id && vehicle === null) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-oryx-blue mb-2">Vehicle not found</h1>
        <Link to="/vehicles" className="text-oryx-blue underline">
          Back to Vehicles
        </Link>
      </div>
    );
  }
  return <VehicleEditor key={id ?? 'new'} vehicle={vehicle} />;
}

function VehicleEditor({ vehicle }: { vehicle: Vehicle | null }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(() => toFormValues(vehicle ?? NEW_VEHICLE, VEHICLE_FIELD_GROUPS));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cancelTo = vehicle ? `/vehicles/${vehicle.id}` : '/vehicles';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { data, errors } = fromFormValues(values, VEHICLE_FIELD_GROUPS);
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const plate = normalizePlate(data.plate_no as string);
    const input = { ...data, plate_no: plate } as VehicleInput;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = vehicle ? await updateVehicle(vehicle.id, input) : await createVehicle(input);
      navigate(`/vehicles/${saved.id}`);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      setSaveError(code === '23505' ? `A vehicle with plate ${plate} already exists.` : errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-4xl">
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">
        {vehicle ? `Edit ${vehicle.plate_no}` : 'Add Vehicle'}
      </h1>
      <RecordForm
        groups={VEHICLE_FIELD_GROUPS}
        values={values}
        errors={errors}
        onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
      />
      {saveError && (
        <p role="alert" className="text-red-700 text-sm mb-4">
          {saveError}
        </p>
      )}
      <div className="flex gap-4 items-center">
        <button
          type="submit"
          disabled={saving}
          className="bg-oryx-blue text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : vehicle ? 'Save changes' : 'Add vehicle'}
        </button>
        <Link to={cancelTo} className="text-oryx-blue underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
