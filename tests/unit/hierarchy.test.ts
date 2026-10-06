import { PageCategoryService } from '../../src/modules/page-category/service';
import { PageCategoryRepository } from '../../src/modules/page-category/repository';
import { PageCategoryRecord } from '../../src/modules/page-category/types';

describe('Hierarchy & Service Unit Tests', () => {
  let mockRepo: jest.Mocked<PageCategoryRepository>;
  let service: PageCategoryService;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      getRoots: jest.fn(),
      getChildren: jest.fn(),
      getAllActive: jest.fn(),
      hasActiveChildren: jest.fn(),
      getDescendantIds: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn(),
      bulkSoftDelete: jest.fn(),
    } as any;

    service = new PageCategoryService(mockRepo);
  });

  const sampleRecord = (overrides?: Partial<PageCategoryRecord>): PageCategoryRecord => ({
    id: '100',
    tenant_id: '1001',
    organization_id: '5001',
    category_code: 'PRODUCTS',
    name: 'Products',
    slug: 'products',
    description: null,
    category_type: 'PRODUCT',
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
    ...overrides,
  });

  it('should assemble nested category tree from flat list', async () => {
    const root1 = sampleRecord({ id: '1', name: 'Electronics', slug: 'electronics', parent_category_id: null });
    const child1 = sampleRecord({ id: '2', name: 'Mobiles', slug: 'mobiles', parent_category_id: '1' });
    const subChild1 = sampleRecord({ id: '3', name: 'Smartphones', slug: 'smartphones', parent_category_id: '2' });
    const root2 = sampleRecord({ id: '4', name: 'Services', slug: 'services', parent_category_id: null });

    mockRepo.getAllActive.mockResolvedValue([root1, child1, subChild1, root2]);

    const tree = await service.getCategoryTree('1001', '5001');

    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe('1');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('2');
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe('3');
    expect(tree[1].id).toBe('4');
    expect(tree[1].children).toHaveLength(0);
  });

  it('should prevent setting category as its own parent', async () => {
    mockRepo.findById.mockResolvedValue(sampleRecord({ id: '10' }));

    await expect(
      service.updateCategory('1001', '5001', '10', '9001', { parent_category_id: '10' })
    ).rejects.toThrow('A category cannot be its own parent');
  });

  it('should prevent hierarchy cycle when parent is an existing descendant', async () => {
    mockRepo.findById.mockResolvedValueOnce(sampleRecord({ id: '10' })); // existing
    mockRepo.findById.mockResolvedValueOnce(sampleRecord({ id: '30' })); // parent check
    mockRepo.getDescendantIds.mockResolvedValue(['20', '30']); // '30' is descendant of '10'

    await expect(
      service.updateCategory('1001', '5001', '10', '9001', { parent_category_id: '30' })
    ).rejects.toThrow('Hierarchy cycle detected');
  });

  it('should restrict deletion if active child categories exist', async () => {
    mockRepo.findById.mockResolvedValue(sampleRecord({ id: '10' }));
    mockRepo.hasActiveChildren.mockResolvedValue(true);

    await expect(
      service.deleteCategory('1001', '5001', '10', '9001')
    ).rejects.toThrow('Cannot delete category with id');
  });

  it('should successfully soft delete if no active children exist', async () => {
    const record = sampleRecord({ id: '10' });
    mockRepo.findById.mockResolvedValue(record);
    mockRepo.hasActiveChildren.mockResolvedValue(false);
    mockRepo.softDelete.mockResolvedValue({ ...record, deleted_at: new Date() });

    const result = await service.deleteCategory('1001', '5001', '10', '9001');
    expect(result.id).toBe('10');
    expect(mockRepo.softDelete).toHaveBeenCalledWith('1001', '5001', '10', '9001');
  });
});
