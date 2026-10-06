import request from 'supertest';
import { app } from '../../src/app';
import { config } from '../../src/config/env';
import { pageCategoryRepository } from '../../src/modules/page-category/repository';

jest.mock('../../src/modules/page-category/repository');

describe('Tenant & Security Isolation Tests', () => {
  const validToken = config.brrToken;
  const mockedRepo = pageCategoryRepository as jest.Mocked<typeof pageCategoryRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enforce tenant_id and organization_id on GET /:id', async () => {
    mockedRepo.findById.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/v1/page-categories/102')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Tenant-Id', '1001')
      .set('X-Organization-Id', '5001');

    expect(response.status).toBe(404);
    expect(mockedRepo.findById).toHaveBeenCalledWith('1001', '5001', '102');
  });

  it('should reject request without Bearer token', async () => {
    const response = await request(app)
      .get('/api/v1/page-categories/102')
      .set('X-Tenant-Id', '1001')
      .set('X-Organization-Id', '5001');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_BRR_TOKEN');
  });

  it('should reject request with missing tenant context headers', async () => {
    const response = await request(app)
      .get('/api/v1/page-categories/102')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_CONTEXT_HEADERS');
  });

  it('should prevent Tenant A from updating Tenant B category', async () => {
    // Repository findById returns null because query scopes to Tenant A (1001), not Tenant B (2002)
    mockedRepo.findById.mockImplementation(async (tenantId, orgId, id) => {
      if (tenantId === '2002') {
        return {
          id: '500',
          tenant_id: '2002',
          organization_id: '5001',
          category_code: 'TENANT_B_CAT',
          name: 'Tenant B Cat',
          slug: 'tenant-b-cat',
          description: null,
          category_type: null,
          parent_category_id: null,
          status: 'ACTIVE',
          icon: null,
          image_url: null,
          display_order: 0,
          seo_title: null,
          seo_description: null,
          seo_keywords: null,
          canonical_path: null,
          metadata: null,
          created_by: null,
          updated_by: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        };
      }
      return null;
    });

    const response = await request(app)
      .patch('/api/v1/page-categories/500')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Tenant-Id', '1001') // Tenant A tries to access ID 500
      .set('X-Organization-Id', '5001')
      .send({ name: 'Hacked Tenant Name' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND');
    expect(mockedRepo.update).not.toHaveBeenCalled();
  });
});
