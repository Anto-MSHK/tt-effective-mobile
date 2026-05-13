import { AppError } from '@/utils/app-error';

describe('AppError', () => {
  it('sets statusCode, code, and message', () => {
    const err = new AppError(404, 'USER_NOT_FOUND', 'User not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('USER_NOT_FOUND');
    expect(err.message).toBe('User not found');
    expect(err.name).toBe('AppError');
  });

  it('is an instance of Error', () => {
    expect(new AppError(500, 'X', 'msg')).toBeInstanceOf(Error);
  });

  it('is an instance of AppError', () => {
    expect(new AppError(400, 'X', 'msg')).toBeInstanceOf(AppError);
  });

  it('instanceof check works across re-throws', () => {
    function throwIt() {
      throw new AppError(403, 'FORBIDDEN', 'no');
    }
    expect(throwIt).toThrow(AppError);
  });
});
