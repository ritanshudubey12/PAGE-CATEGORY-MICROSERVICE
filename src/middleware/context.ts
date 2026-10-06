import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export interface RequestContext {
  tenantId: string;
  organizationId: string;
  userId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

const BIGINT_REGEX = /^[1-9]\d*$/;

export function tenantContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const tenantIdHeader = req.headers['x-tenant-id'];
  const organizationIdHeader = req.headers['x-organization-id'];
  const userIdHeader = req.headers['x-user-id'];

  const tenantId = Array.isArray(tenantIdHeader) ? tenantIdHeader[0] : tenantIdHeader;
  const organizationId = Array.isArray(organizationIdHeader) ? organizationIdHeader[0] : organizationIdHeader;
  const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;

  if (!tenantId || !BIGINT_REGEX.test(tenantId.trim())) {
    sendError(res, 400, 'INVALID_CONTEXT_HEADERS', 'Valid positive numeric X-Tenant-Id header is required');
    return;
  }

  if (!organizationId || !BIGINT_REGEX.test(organizationId.trim())) {
    sendError(res, 400, 'INVALID_CONTEXT_HEADERS', 'Valid positive numeric X-Organization-Id header is required');
    return;
  }

  let validUserId: string | null = null;
  if (userId && userId.trim()) {
    const trimmedUserId = userId.trim();
    if (!BIGINT_REGEX.test(trimmedUserId)) {
      sendError(res, 400, 'INVALID_CONTEXT_HEADERS', 'X-User-Id header must be a positive numeric string when provided');
      return;
    }
    validUserId = trimmedUserId;
  }

  req.context = {
    tenantId: tenantId.trim(),
    organizationId: organizationId.trim(),
    userId: validUserId,
  };

  next();
}
