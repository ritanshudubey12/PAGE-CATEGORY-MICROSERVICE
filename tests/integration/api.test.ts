import request from 'supertest';
import { app } from '../../src/app';
import { config } from '../../src/config/env';
import { pageCategoryRepository } from '../../src/modules/page-category/repository';
import { pool } from '../../src/config/database';

jest.mock('../../src/modules/page-category/repository');
jest.mock('../../src/config/database', () => {
  const actual = jest.requireActual('../../src/config/database');
  return {
    ...actual,
    pool: {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      }),
      query: jest.fn().mockResolvedValue({ rows: [] }),
      on: jest.fn(),
      end: jest.fn(),
    },
    checkDatabaseReady: jest.fn().mockResolvedValue(true),
  };
});

describe('Page Category API Integration Tests', () => {
  const validToken = config.brrToken;
  const mockedRepo = pageCategoryRepository as jest.Mocked<typeof pageCategoryRepository>;

  const headers = {
    Authorization: `Bearer ${validToken}`,
    'X-Tenant-Id': '1001',
    'X-Organization-Id': '5001',
    'X-User-Id': '9001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health & /ready', () => {
    it('should return UP on /health without authentication', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('UP');
    });
  });

  describe('POST /api/v1/page-categories (Create)', () => {
    it('should create category successfully', async () => {
      mockedRepo.findByCode.mockResolvedValue(null);
      mockedRepo.findBySlug.mockResolvedValue(null);
      mockedRepo.create.mockResolvedValue({
        id: '101',
        tenant_id: '1001',
        organization_id: '5001',
        category_code: 'SEO_PROMO',
        name: 'SEO Promotion',
        slug: 'seo-promo',
        description: 'SEO promotions',
        category_type: 'SERVICE',
        parent_category_id: null,
        status: 'ACTIVE',
        icon: 'star',
        image_url: null,
        display_order: 10,
        seo_title: 'SEO Promo Title',
        seo_description: null,
        seo_keywords: null,
        canonical_path: '/seo-promo',
        metadata: null,
        created_by: '9001',
        updated_by: '9001',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });

      const response = await request(app)
        .post('/api/v1/page-categories')
        .set(headers)
        .send({
          category_code: 'SEO_PROMO',
          name: 'SEO Promotion',
          slug: 'seo-promo',
          display_order: 10,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('101');
      expect(response.body.data.category_code).toBe('SEO_PROMO');
    });

    it('should return 409 when category_code already exists', async () => {
      mockedRepo.findByCode.mockResolvedValue({
        id: '101',
        tenant_id: '1001',
        organization_id: '5001',
        category_code: 'SEO_PROMO',
      } as any);

      const response = await request(app)
        .post('/api/v1/page-categories')
        .set(headers)
        .send({
          category_code: 'SEO_PROMO',
          name: 'SEO Promotion',
          slug: 'seo-promo',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('DUPLICATE_CATEGORY_CODE');
    });
  });

  describe('GET /api/v1/page-categories (List & Filter)', () => {
    it('should list categories with pagination metadata', async () => {
      mockedRepo.list.mockResolvedValue({
        rows: [
          {
            id: '101',
            tenant_id: '1001',
            organization_id: '5001',
            category_code: 'SEO',
            name: 'SEO',
            slug: 'seo',
            description: null,
            category_type: 'SERVICE',
            parent_category_id: null,
            status: 'ACTIVE',
            icon: null,
            image_url: null,
            display_order: 1,
            seo_title: null,
            seo_description: null,
            seo_keywords: null,
            canonical_path: null,
            metadata: null,
            created_by: '9001',
            updated_by: '9001',
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
        total: 1,
      });

      const response = await request(app)
        .get('/api/v1/page-categories?page=1&limit=10&status=ACTIVE')
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      });
    });
  });

  describe('POST /api/v1/page-categories/bulk-delete', () => {
    it('should perform bulk delete and return report', async () => {
      mockedRepo.bulkSoftDelete.mockResolvedValue(['101', '102']);

      const response = await request(app)
        .post('/api/v1/page-categories/bulk-delete')
        .set(headers)
        .send({ ids: ['101', '102', '999'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_requested).toBe(3);
      expect(response.body.data.total_deleted).toBe(2);
      expect(response.body.data.deleted_ids).toEqual(['101', '102']);
      expect(response.body.data.not_found_or_inaccessible_ids).toEqual(['999']);
    });
  });

  describe('POST /api/v1/page-categories/bulk-import', () => {
    it('should import categories from CSV file', async () => {
      mockedRepo.findByCode.mockResolvedValue(null);
      mockedRepo.findBySlug.mockResolvedValue(null);
      mockedRepo.create.mockResolvedValue({ id: '201' } as any);

      const csvContent = 'category_code,name,slug,display_order\nIMPORT_1,Import One,import-one,5\n';

      const response = await request(app)
        .post('/api/v1/page-categories/bulk-import')
        .set(headers)
        .attach('file', Buffer.from(csvContent), 'categories.csv');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_received).toBe(1);
      expect(response.body.data.total_inserted).toBe(1);
    });
  });
});
