import { describe, it, expect } from 'vitest';
import { fromFormValues, toFormValues, type FieldGroup } from '../recordForm';

const groups: FieldGroup[] = [
  {
    title: 'Test',
    fields: [
      { name: 'plate_no', label: 'Plate Number', type: 'text', required: true },
      { name: 'cost', label: 'Cost', type: 'number', min: 0 },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'vehicle_id', label: 'Vehicle', type: 'select', options: [{ value: '', label: 'None' }] },
    ],
  },
];

describe('toFormValues', () => {
  it('turns nulls into empty strings and numbers into strings', () => {
    expect(toFormValues({ plate_no: 'U 1', cost: 1500, date: null }, groups)).toEqual({
      plate_no: 'U 1',
      cost: '1500',
      date: '',
      vehicle_id: '',
    });
  });
});

describe('fromFormValues', () => {
  it('trims text, parses numbers (with commas), and stores blanks as null', () => {
    const { data, errors } = fromFormValues(
      { plate_no: '  U 1 ', cost: '1,500.50', date: '', vehicle_id: '' },
      groups
    );
    expect(errors).toEqual({});
    expect(data).toEqual({ plate_no: 'U 1', cost: 1500.5, date: null, vehicle_id: null });
  });

  it('reports a missing required field', () => {
    const { errors } = fromFormValues({ plate_no: '   ' }, groups);
    expect(errors.plate_no).toBe('Plate Number is required.');
  });

  it('rejects non-numbers and values below the minimum', () => {
    expect(fromFormValues({ plate_no: 'x', cost: 'abc' }, groups).errors.cost).toBe('Cost must be a number.');
    expect(fromFormValues({ plate_no: 'x', cost: '-5' }, groups).errors.cost).toBe("Cost can't be less than 0.");
  });
});
