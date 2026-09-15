import { describe, it, expect } from 'vitest';
import { deriveSystemCategory } from '../categorize';

describe('deriveSystemCategory', () => {
  it('maps real fixture rows to the expected category', () => {
    expect(deriveSystemCategory('Service', 'Petrol')).toBe('fuel');
    expect(deriveSystemCategory('Service', 'Vehicle Insurance')).toBe('insurance');
    expect(deriveSystemCategory('Repair', 'Toolbox')).toBe('repairs');
    expect(deriveSystemCategory('Repair', 'Re branding of stickers CIV ')).toBe('repairs');
    expect(deriveSystemCategory('Service', 'Car Tyre Replacement')).toBe('maintenance');
    expect(deriveSystemCategory('Service', 'Car Tyre Rotation')).toBe('maintenance');
    expect(deriveSystemCategory('Service', 'Vehicle Testing')).toBe('maintenance');
    expect(deriveSystemCategory('Service', 'AC Cabin Filter ')).toBe('maintenance');
    expect(deriveSystemCategory('Service', 'Car Servicing')).toBe('maintenance');
    expect(deriveSystemCategory('Service', 'Hire a Driver')).toBe('other');
    expect(deriveSystemCategory('New Purchase', 'Tools')).toBe('other');
    expect(deriveSystemCategory('Service', 'CIV Modification')).toBe('other');
  });

  it('maps registration/renewal text to registration (rule for future data; no current row exercises this)', () => {
    expect(deriveSystemCategory('Service', 'Car Renewal')).toBe('registration');
    expect(deriveSystemCategory('Service', 'Vehicle Registration')).toBe('registration');
  });
});
