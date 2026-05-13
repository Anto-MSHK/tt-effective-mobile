import { isAtLeast18YearsOld } from '@/utils/age-check';

describe('isAtLeast18YearsOld', () => {
  const ref = new Date('2024-06-15T00:00:00.000Z');

  it('returns true if exactly 18 years old today', () => {
    expect(isAtLeast18YearsOld(new Date('2006-06-15'), ref)).toBe(true);
  });

  it('returns true if older than 18', () => {
    expect(isAtLeast18YearsOld(new Date('1990-01-01'), ref)).toBe(true);
  });

  it('returns false if exactly one day before 18th birthday', () => {
    expect(isAtLeast18YearsOld(new Date('2006-06-16'), ref)).toBe(false);
  });

  it('returns false if 17 years old', () => {
    expect(isAtLeast18YearsOld(new Date('2007-01-01'), ref)).toBe(false);
  });

  it('returns false if birthday is this year but not yet reached', () => {
    expect(isAtLeast18YearsOld(new Date('2006-12-31'), ref)).toBe(false);
  });

  it('returns true if birthday is this year and already passed', () => {
    expect(isAtLeast18YearsOld(new Date('2006-01-01'), ref)).toBe(true);
  });

  it('uses current date by default', () => {
    const pastBirth = new Date(Date.now() - 20 * 365.25 * 24 * 3600 * 1000);
    expect(isAtLeast18YearsOld(pastBirth)).toBe(true);
  });

  it('returns false for a newborn', () => {
    expect(isAtLeast18YearsOld(new Date('2024-06-14'), ref)).toBe(false);
  });
});
