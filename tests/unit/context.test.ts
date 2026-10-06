import { Request, Response, NextFunction } from 'express';
import { tenantContextMiddleware } from '../../src/middleware/context';

describe('tenantContextMiddleware Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it('should parse valid X-Tenant-Id, X-Organization-Id and optional X-User-Id', () => {
    mockRequest = {
      headers: {
        'x-tenant-id': '1001',
        'x-organization-id': '5001',
        'x-user-id': '9001',
      },
    };

    tenantContextMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.context).toEqual({
      tenantId: '1001',
      organizationId: '5001',
      userId: '9001',
    });
  });

  it('should reject when X-Tenant-Id is missing', () => {
    mockRequest = {
      headers: {
        'x-organization-id': '5001',
      },
    };

    tenantContextMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_CONTEXT_HEADERS',
        }),
      })
    );
  });

  it('should reject when X-Tenant-Id is non-numeric', () => {
    mockRequest = {
      headers: {
        'x-tenant-id': 'tenant-abc',
        'x-organization-id': '5001',
      },
    };

    tenantContextMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it('should reject when X-User-Id is non-numeric', () => {
    mockRequest = {
      headers: {
        'x-tenant-id': '1001',
        'x-organization-id': '5001',
        'x-user-id': 'user-invalid',
      },
    };

    tenantContextMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });
});
