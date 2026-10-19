import { describe, it, expect } from 'vitest';
import { formatDate, splitPlate } from '../format';

describe('formatDate', () => {
  it('reads the date as written, without a time zone shift', () => {
    expect(formatDate('2025-08-19')).toBe('19 Aug 2025');
    expect(formatDate('2026-10-17T00:00:00Z')).toBe('17 Oct 2026');
  });

  it('can leave out the year and add the weekday', () => {
    expect(formatDate('2026-10-17', { year: false })).toBe('17 Oct');
    expect(formatDate('2026-10-17', { year: false, weekday: true })).toBe('Sat 17 Oct');
  });

  it('says Not Available for no date, and leaves anything else as it is', () => {
    expect(formatDate(null)).toBe('Not Available');
    expect(formatDate('next week')).toBe('next week');
  });
});

describe('splitPlate', () => {
  it('splits the code from the number', () => {
    expect(splitPlate('EE 34759')).toEqual({ code: 'EE', number: '34759' });
    expect(splitPlate('K 13797')).toEqual({ code: 'K', number: '13797' });
  });

  it('keeps a plate without a separate code whole', () => {
    expect(splitPlate('O96848')).toEqual({ code: null, number: 'O96848' });
  });
});
