import {
  createCategorySchema,
  updateCategorySchema,
  listQuerySchema,
  bulkDeleteSchema,
} from '../../src/modules/page-category/validation';

describe('Validation Schemas Unit Tests', () => {
  describe('createCategorySchema', () => {
    it('should validate a valid category payload', () => {
      const payload = {
        category_code: 'SEO_SERVICES',
        name: 'SEO & Content Marketing',
        slug: 'seo-content-marketing',
        description: 'Comprehensive SEO services',
        category_type: 'SERVICE',
        parent_category_id: '101',
        status: 'ACTIVE',
        icon: 'search-icon',
        image_url: 'https://example.com/images/seo.png',
        display_order: 10,
        seo_title: 'SEO & Content Marketing Services',
        seo_description: 'Best SEO services to rank high',
        seo_keywords: 'seo, ranking, content',
        canonical_path: '/services/seo',
        metadata: { badge: 'popular' },
      };

      const result = createCategorySchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid slug with uppercase or special characters', () => {
      const payload = {
        category_code: 'TECH',
        name: 'Technology',
        slug: 'Tech_Category!@#',
      };

      const result = createCategorySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('slug must contain only lowercase');
      }
    });

    it('should reject missing required fields', () => {
      const payload = {
        description: 'Missing code and name',
      };

      const result = createCategorySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric parent_category_id', () => {
      const payload = {
        category_code: 'CAT1',
        name: 'Cat 1',
        slug: 'cat-1',
        parent_category_id: 'invalid-id-abc',
      };

      const result = createCategorySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('listQuerySchema', () => {
    it('should parse and set default pagination parameters', () => {
      const result = listQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sort).toBe('display_order');
        expect(result.data.order).toBe('ASC');
      }
    });

    it('should reject limit greater than 100', () => {
      const result = listQuerySchema.safeParse({ limit: '150' });
      expect(result.success).toBe(false);
    });

    it('should reject negative page numbers', () => {
      const result = listQuerySchema.safeParse({ page: '-5' });
      expect(result.success).toBe(false);
    });
  });

  describe('bulkDeleteSchema', () => {
    it('should validate an array of numeric BIGINT string IDs', () => {
      const result = bulkDeleteSchema.safeParse({ ids: ['101', '102', '103'] });
      expect(result.success).toBe(true);
    });

    it('should reject empty ids array', () => {
      const result = bulkDeleteSchema.safeParse({ ids: [] });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric IDs', () => {
      const result = bulkDeleteSchema.safeParse({ ids: ['101', 'bad-id', '103'] });
      expect(result.success).toBe(false);
    });
  });
});
