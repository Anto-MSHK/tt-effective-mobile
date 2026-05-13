import { PASSWORD_POLICY_REGEX, passwordFieldSchema } from '@/utils/password-policy';

describe('PASSWORD_POLICY_REGEX', () => {
  const valid = ['Admin1!x', 'Secure@123', 'P@ssw0rd', 'Hello1!World'];

  it.each(valid)('accepts valid password: %s', (pwd) => {
    expect(PASSWORD_POLICY_REGEX.test(pwd)).toBe(true);
  });

  it('rejects password shorter than 8 chars', () => {
    expect(PASSWORD_POLICY_REGEX.test('Ab1!')).toBe(false);
  });

  it('rejects password without uppercase', () => {
    expect(PASSWORD_POLICY_REGEX.test('admin1!secure')).toBe(false);
  });

  it('rejects password without digit', () => {
    expect(PASSWORD_POLICY_REGEX.test('Admin!secure')).toBe(false);
  });

  it('rejects password without special character', () => {
    expect(PASSWORD_POLICY_REGEX.test('Admin123secure')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(PASSWORD_POLICY_REGEX.test('')).toBe(false);
  });
});

describe('passwordFieldSchema (Zod)', () => {
  it('parses a valid password', () => {
    expect(() => passwordFieldSchema.parse('Admin1!x')).not.toThrow();
  });

  it('throws ZodError for invalid password', () => {
    expect(() => passwordFieldSchema.parse('weak')).toThrow();
  });
});
