import { Request, Response, NextFunction } from 'express';
import { internalAuthMiddleware } from '../../src/middleware/internalAuth';
import { config } from '../../src/config/env';

describe('internalAuthMiddleware Unit Tests', () => {
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

  it('should call next() if valid BRR Bearer token is provided', () => {
    mockRequest = {
      headers: {
        authorization: `Bearer ${config.brrToken}`,
      },
    };

    internalAuthMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 401 if Authorization header is missing', () => {
    mockRequest = {
      headers: {},
    };

    internalAuthMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_BRR_TOKEN',
        }),
      })
    );
  });

  it('should return 401 if Authorization header is malformed', () => {
    mockRequest = {
      headers: {
        authorization: 'Basic dXNlcjpwYXNz',
      },
    };

    internalAuthMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 if Bearer token is incorrect', () => {
    mockRequest = {
      headers: {
        authorization: 'Bearer wrong_token_value',
      },
    };

    internalAuthMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_BRR_TOKEN',
          message: 'Invalid internal token',
        }),
      })
    );
  });
});
