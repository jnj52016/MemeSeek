import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

type RequestWithId = Request & { requestId?: string };

export function requestIdMiddleware(
  request: RequestWithId,
  response: Response,
  next: NextFunction,
) {
  const requestedId = request.header('x-request-id');
  const requestId =
    requestedId && /^[a-zA-Z0-9_-]{8,128}$/.test(requestedId)
      ? requestedId
      : randomUUID();

  request.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  next();
}
