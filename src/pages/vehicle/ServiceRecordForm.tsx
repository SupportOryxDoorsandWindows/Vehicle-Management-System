import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  createServiceRecord,
  deleteServiceRecord,
  fetchServiceRecords,
  updateServiceRecord,
  type ServiceRecordInput,
} from '../../api/serviceRecords';
import { RecordForm } from '../../components/RecordForm';
import { LoadError } from '../../components/LoadError';
import { DeleteButton } from '../../components/DeleteButton';
import { fromFormValues, toFormValues, type FieldErrors } from '../../lib/recordForm';
import { SERVICE_FIELD_GROUPS, todayIso } from '../../lib/serviceLog';
import { errorMessage, useLoad } from '../../lib/useLoad';
import type { ServiceRecord, Vehicle } from '../../types';

/** /vehicles/:id/maintenance/new and /vehicles/:id/maintenance/:recordId/edit */
export function ServiceRecordForm() {
  const vehicle = useOutletContext<Vehicle>();
  const { recordId } = useParams();
  const { data: record, error } = useLoad(
    () =>
      recordId
        ? fetchServiceRecords(vehicle.id).then((log) => log.find((r) => r.id === recordId) ?? null)
        : Promise.resolve(null),
    [vehicle.id, recordId]
  );

  if (error) return <LoadError what="this service record" message={error} />;
  if (record === undefined) return <p>Loading...</p>;
  if (recordId && record === null) {
    return (
      <div>
        <p className="mb-2">This service record doesn't exist or may have been deleted.</p>
        <Link to={`/vehicles/${vehicle.id}/maintenance`} className="text-oryx-blue underline">
          Back to Maintenance
        </Link>
      </div>
    );
  }
  return <ServiceRecordEditor key={recordId ?? 'new'} vehicle={vehicle} record={record} />;
}

function ServiceRecordEditor({ vehicle, record }: { vehicle: Vehicle; record: ServiceRecord | null }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(() =>
    toFormValues(record ?? { record_date: todayIso(), kind: 'service' }, SERVICE_FIELD_GROUPS)
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const backTo = `/vehicles/${vehicle.id}/maintenance`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { data, errors } = fromFormValues(values, SERVICE_FIELD_GROUPS);
    if (data.kind === 'reading' && data.odometer_km === null) {
      errors.odometer_km = 'Odometer (KM) is required for an odometer reading.';
    }
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const input = { ...data, vehicle_id: vehicle.id } as ServiceRecordInput;
    setSaving(true);
    setSaveError(null);
    try {
      if (record) await updateServiceRecord(record.id, input);
      else await createServiceRecord(input);
      navigate(backTo);
    } catch (err) {
      setSaveError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-4xl">
      <h2 className="text-xl font-bold text-oryx-blue mb-4">
        {record ? 'Edit Service Record' : 'Add Service Record'}
      </h2>
      <RecordForm
        groups={SERVICE_FIELD_GROUPS}
        values={values}
        errors={errors}
        onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
      />
      <p className="text-sm text-oryx-silver mb-6">
        Record the cost, quotation and invoice as an expense; this log is for dates and mileage.
      </p>
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
          {saving ? 'Saving...' : record ? 'Save changes' : 'Add record'}
        </button>
        <Link to={backTo} className="text-oryx-blue underline">
          Cancel
        </Link>
      </div>
      {record && (
        <DeleteButton
          label="Delete record"
          confirmMessage={`Delete the ${record.record_date} record?`}
          onDelete={async () => {
            await deleteServiceRecord(record.id);
            navigate(backTo);
          }}
        />
      )}
    </form>
  );
}
