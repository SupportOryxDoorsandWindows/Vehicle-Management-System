export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** For number fields: smallest allowed value. */
  min?: number;
  /** For select fields. An option with value '' saves as null. */
  options?: { value: string; label: string }[];
}

export interface FieldGroup {
  title: string;
  fields: FieldDef[];
}

export type FormValues = Record<string, string>;
export type FieldErrors = Record<string, string>;
export type RecordData = Record<string, string | number | null>;

function allFields(groups: FieldGroup[]): FieldDef[] {
  return groups.flatMap((g) => g.fields);
}

/** Database record → strings for controlled inputs (null becomes ''). */
export function toFormValues(record: object, groups: FieldGroup[]): FormValues {
  const source = record as Record<string, unknown>;
  const values: FormValues = {};
  for (const field of allFields(groups)) {
    const value = source[field.name];
    values[field.name] = value === null || value === undefined ? '' : String(value);
  }
  return values;
}

/**
 * Form strings → database record. Blank fields become null, numbers are
 * parsed (commas allowed), and required/number rules produce per-field errors.
 */
export function fromFormValues(
  values: FormValues,
  groups: FieldGroup[]
): { data: RecordData; errors: FieldErrors } {
  const data: RecordData = {};
  const errors: FieldErrors = {};
  for (const field of allFields(groups)) {
    const raw = (values[field.name] ?? '').trim();
    if (raw === '') {
      if (field.required) errors[field.name] = `${field.label} is required.`;
      data[field.name] = null;
      continue;
    }
    if (field.type === 'number') {
      const parsed = Number(raw.replace(/,/g, ''));
      if (!Number.isFinite(parsed)) {
        errors[field.name] = `${field.label} must be a number.`;
      } else if (field.min !== undefined && parsed < field.min) {
        errors[field.name] = `${field.label} can't be less than ${field.min}.`;
      }
      data[field.name] = parsed;
      continue;
    }
    data[field.name] = raw;
  }
  return { data, errors };
}
