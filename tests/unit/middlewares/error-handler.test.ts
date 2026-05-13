import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { errorHandler } from '@/middlewares/error-handler';
import { AppError } from '@/utils/app-error';

function makeReqRes() {
  const req = {
    requestId: 'req-id-test',
    log: { warn: jest.fn(), error: jest.fn() },
  } as unknown as Request;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next, json, status };
}

describe('errorHandler', () => {
  it('handles AppError → correct status + error shape', () => {
    const { req, res, next, status, json } = makeReqRes();
    errorHandler(new AppError(404, 'USER_NOT_FOUND', 'User not found'), req, res, next);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'USER_NOT_FOUND', message: 'User not found', requestId: 'req-id-test' },
    });
  });

  it('handles ZodError → 400 VALIDATION_ERROR', () => {
    const { req, res, next, status, json } = makeReqRes();
    const result = z.string().min(1).safeParse('');
    const zodErr = result.success ? null : result.error;
    errorHandler(zodErr, req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    );
  });

  it('handles SyntaxError with body → 400 invalid JSON', () => {
    const { req, res, next, status, json } = makeReqRes();
    const syntaxErr = Object.assign(new SyntaxError('Unexpected token'), { body: true });
    errorHandler(syntaxErr, req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    );
  });

  it('handles unknown error → 500 INTERNAL_ERROR', () => {
    const { req, res, next, status, json } = makeReqRes();
    errorHandler(new Error('boom'), req, res, next);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'INTERNAL_ERROR' }) }),
    );
  });

  it('uses fallback requestId when req.requestId is missing', () => {
    const req = { log: { warn: jest.fn(), error: jest.fn() } } as unknown as Request;
    const json = jest.fn();
    const res = { status: jest.fn().mockReturnValue({ json }) } as unknown as Response;
    errorHandler(new AppError(400, 'X', 'msg'), req, res, jest.fn());
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ requestId: 'unknown' }) }),
    );
  });
});
