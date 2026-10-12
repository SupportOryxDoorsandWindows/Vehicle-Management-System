import type { FieldDef, FieldErrors, FieldGroup, FormValues } from '../lib/recordForm';

interface RecordFormProps {
  groups: FieldGroup[];
  values: FormValues;
  errors: FieldErrors;
  onChange: (name: string, value: string) => void;
}

const inputClass = 'w-full border border-oryx-silver rounded px-3 py-2';

function FieldInput({
  field,
  value,
  invalid,
  onChange,
}: {
  field: FieldDef;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const common = {
    id: `field-${field.name}`,
    value,
    required: field.required,
    'aria-invalid': invalid || undefined,
    'aria-describedby': invalid ? `field-${field.name}-error` : undefined,
    className: inputClass,
  };
  switch (field.type) {
    case 'select':
      return (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'textarea':
      return <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      // type="text" + inputMode so values like "1,500" can be typed and parsed.
      return <input {...common} type="text" inputMode="decimal" onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input {...common} type={field.type} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function RecordForm({ groups, values, errors, onChange }: RecordFormProps) {
  return (
    <>
      {groups.map((group) => (
        <fieldset key={group.title} className="mb-6">
          <legend className="text-lg font-semibold text-oryx-blue mb-3">{group.title}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {group.fields.map((field) => (
              <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : undefined}>
                <label htmlFor={`field-${field.name}`} className="block text-sm text-oryx-silver mb-1">
                  {field.label}
                  {field.required && ' *'}
                </label>
                <FieldInput
                  field={field}
                  value={values[field.name] ?? ''}
                  invalid={!!errors[field.name]}
                  onChange={(value) => onChange(field.name, value)}
                />
                {errors[field.name] && (
                  <p id={`field-${field.name}-error`} className="text-red-700 text-sm mt-1">
                    {errors[field.name]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}
