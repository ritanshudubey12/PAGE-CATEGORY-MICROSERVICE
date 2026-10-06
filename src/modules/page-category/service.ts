import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { config } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { RawCategoryRow } from '../../utils/csvParser';
import { PaginationMeta } from '../../utils/response';
import { PageCategoryRepository, pageCategoryRepository } from './repository';
import {
  BulkDeleteResult,
  BulkImportResult,
  BulkImportRowResult,
  CategoryStatus,
  CreatePageCategoryDTO,
  ListCategoriesQuery,
  PageCategoryRecord,
  PageCategoryTreeNode,
  UpdatePageCategoryDTO,
} from './types';
import { createCategorySchema } from './validation';

export class PageCategoryService {
  constructor(private repo: PageCategoryRepository = pageCategoryRepository) { }

  async createCategory(
    tenantId: string,
    organizationId: string,
    userId: string | null,
    dto: CreatePageCategoryDTO
  ): Promise<PageCategoryRecord> {
    // 1. Check duplicate category_code
    const existingCode = await this.repo.findByCode(tenantId, organizationId, dto.category_code);
    if (existingCode) {
      throw new AppError(
        409,
        'DUPLICATE_CATEGORY_CODE',
        `Category code '${dto.category_code}' already exists in this tenant and organization`
      );
    }

    // 2. Check duplicate slug
    const existingSlug = await this.repo.findBySlug(tenantId, organizationId, dto.slug);
    if (existingSlug) {
      throw new AppError(
        409,
        'DUPLICATE_SLUG',
        `Category slug '${dto.slug}' already exists in this tenant and organization`
      );
    }

    // 3. Check parent category if provided
    if (dto.parent_category_id) {
      const parent = await this.repo.findById(tenantId, organizationId, dto.parent_category_id);
      if (!parent) {
        throw new AppError(
          400,
          'PARENT_CATEGORY_NOT_FOUND',
          `Parent category with id '${dto.parent_category_id}' does not exist in this tenant and organization`
        );
      }
    }

    return this.repo.create(tenantId, organizationId, userId, dto);
  }

  async getCategoryById(
    tenantId: string,
    organizationId: string,
    id: string
  ): Promise<PageCategoryRecord> {
    const category = await this.repo.findById(tenantId, organizationId, id);
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', `Category with id '${id}' not found`);
    }
    return category;
  }

  async getCategoryByCode(
    tenantId: string,
    organizationId: string,
    categoryCode: string
  ): Promise<PageCategoryRecord> {
    const category = await this.repo.findByCode(tenantId, organizationId, categoryCode);
    if (!category) {
      throw new AppError(
        404,
        'CATEGORY_NOT_FOUND',
        `Category with code '${categoryCode}' not found`
      );
    }
    return category;
  }

  async listCategories(
    tenantId: string,
    organizationId: string,
    query: ListCategoriesQuery
  ): Promise<{ data: PageCategoryRecord[]; pagination: PaginationMeta }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { rows, total } = await this.repo.list(tenantId, organizationId, query);
    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_previous: page > 1,
    };

    return { data: rows, pagination };
  }

  async getRoots(tenantId: string, organizationId: string): Promise<PageCategoryRecord[]> {
    return this.repo.getRoots(tenantId, organizationId);
  }

  async getChildren(
    tenantId: string,
    organizationId: string,
    parentId: string
  ): Promise<PageCategoryRecord[]> {
    // Verify parent exists first
    await this.getCategoryById(tenantId, organizationId, parentId);
    return this.repo.getChildren(tenantId, organizationId, parentId);
  }

  async getCategoryTree(
    tenantId: string,
    organizationId: string
  ): Promise<PageCategoryTreeNode[]> {
    const allRecords = await this.repo.getAllActive(tenantId, organizationId);
    const nodeMap = new Map<string, PageCategoryTreeNode>();
    const rootNodes: PageCategoryTreeNode[] = [];

    // Initialize all nodes
    for (const record of allRecords) {
      nodeMap.set(record.id, { ...record, children: [] });
    }

    // Assemble hierarchy
    for (const record of allRecords) {
      const node = nodeMap.get(record.id)!;
      if (record.parent_category_id && nodeMap.has(record.parent_category_id)) {
        const parentNode = nodeMap.get(record.parent_category_id)!;
        parentNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  async updateCategory(
    tenantId: string,
    organizationId: string,
    id: string,
    userId: string | null,
    dto: UpdatePageCategoryDTO
  ): Promise<PageCategoryRecord> {
    const existing = await this.getCategoryById(tenantId, organizationId, id);

    // Check duplicate code if changed
    if (dto.category_code && dto.category_code !== existing.category_code) {
      const duplicateCode = await this.repo.findByCode(tenantId, organizationId, dto.category_code);
      if (duplicateCode && duplicateCode.id !== id) {
        throw new AppError(
          409,
          'DUPLICATE_CATEGORY_CODE',
          `Category code '${dto.category_code}' already exists in this tenant and organization`
        );
      }
    }

    // Check duplicate slug if changed
    if (dto.slug && dto.slug !== existing.slug) {
      const duplicateSlug = await this.repo.findBySlug(tenantId, organizationId, dto.slug);
      if (duplicateSlug && duplicateSlug.id !== id) {
        throw new AppError(
          409,
          'DUPLICATE_SLUG',
          `Category slug '${dto.slug}' already exists in this tenant and organization`
        );
      }
    }

    // Check parent hierarchy rules if parent changed
    if (dto.parent_category_id !== undefined && dto.parent_category_id !== existing.parent_category_id) {
      if (dto.parent_category_id !== null) {
        // 1. Prevent self-parenting
        if (dto.parent_category_id === id) {
          throw new AppError(
            400,
            'HIERARCHY_CYCLE_DETECTED',
            'A category cannot be its own parent'
          );
        }

        // 2. Validate proposed parent exists
        const parent = await this.repo.findById(tenantId, organizationId, dto.parent_category_id);
        if (!parent) {
          throw new AppError(
            400,
            'PARENT_CATEGORY_NOT_FOUND',
            `Parent category with id '${dto.parent_category_id}' does not exist in this tenant and organization`
          );
        }

        // 3. Prevent multi-level hierarchy cycles (proposed parent cannot be a descendant of this category)
        const descendantIds = await this.repo.getDescendantIds(tenantId, organizationId, id);
        if (descendantIds.includes(dto.parent_category_id)) {
          throw new AppError(
            400,
            'HIERARCHY_CYCLE_DETECTED',
            'Hierarchy cycle detected: a category cannot have one of its descendants as its parent'
          );
        }
      }
    }

    const updated = await this.repo.update(tenantId, organizationId, id, userId, dto);
    if (!updated) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', `Category with id '${id}' not found`);
    }

    return updated;
  }

  async updateStatus(
    tenantId: string,
    organizationId: string,
    id: string,
    userId: string | null,
    status: CategoryStatus
  ): Promise<PageCategoryRecord> {
    await this.getCategoryById(tenantId, organizationId, id);
    const updated = await this.repo.updateStatus(tenantId, organizationId, id, userId, status);
    if (!updated) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', `Category with id '${id}' not found`);
    }
    return updated;
  }

  async deleteCategory(
    tenantId: string,
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<PageCategoryRecord> {
    await this.getCategoryById(tenantId, organizationId, id);

    // Enforce parent delete policy: RESTRICT deletion while active children exist
    const hasChildren = await this.repo.hasActiveChildren(tenantId, organizationId, id);
    if (hasChildren) {
      throw new AppError(
        400,
        'RESTRICT_ACTIVE_CHILDREN',
        `Cannot delete category with id '${id}' because active child categories exist. Please reassign or delete child categories first.`
      );
    }

    const deleted = await this.repo.softDelete(tenantId, organizationId, id, userId);
    if (!deleted) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', `Category with id '${id}' not found`);
    }
    return deleted;
  }

  async bulkDeleteCategories(
    tenantId: string,
    organizationId: string,
    ids: string[],
    userId: string | null
  ): Promise<BulkDeleteResult> {
    const deletedIds = await this.repo.bulkSoftDelete(tenantId, organizationId, ids, userId);
    const deletedSet = new Set(deletedIds);
    const notFoundOrInaccessible = ids.filter((id) => !deletedSet.has(id));

    return {
      total_requested: ids.length,
      total_deleted: deletedIds.length,
      deleted_ids: deletedIds,
      not_found_or_inaccessible_ids: notFoundOrInaccessible,
    };
  }

  async bulkImport(
    tenantId: string,
    organizationId: string,
    userId: string | null,
    rawRows: RawCategoryRow[],
    mode: 'atomic' | 'partial' = 'atomic'
  ): Promise<BulkImportResult> {
    if (!rawRows || rawRows.length === 0) {
      throw new AppError(400, 'EMPTY_IMPORT_DATA', 'No category rows found in the uploaded file');
    }

    if (rawRows.length > config.bulk.maxBulkRows) {
      throw new AppError(
        400,
        'EXCEEDED_MAX_BULK_ROWS',
        `Uploaded file contains ${rawRows.length} rows, exceeding the maximum allowed limit of ${config.bulk.maxBulkRows} rows`
      );
    }

    const results: BulkImportRowResult[] = [];
    const seenCodes = new Set<string>();
    const seenSlugs = new Set<string>();
    const validatedRows: { rowNum: number; data: CreatePageCategoryDTO }[] = [];

    // Row-by-row validation & normalization
    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 1;
      const raw = rawRows[i];

      // Parse metadata if JSON string
      let parsedMetadata: any = undefined;
      if (raw.metadata) {
        if (typeof raw.metadata === 'string') {
          try {
            parsedMetadata = JSON.parse(raw.metadata);
          } catch {
            results.push({
              row: rowNum,
              category_code: raw.category_code,
              status: 'FAILED',
              error: 'Invalid JSON format in metadata column',
            });
            continue;
          }
        } else if (typeof raw.metadata === 'object') {
          parsedMetadata = raw.metadata;
        }
      }

      // Convert display_order
      let displayOrder = 0;
      if (raw.display_order !== undefined && raw.display_order !== '') {
        const parsedOrder = Number(raw.display_order);
        if (isNaN(parsedOrder) || parsedOrder < 0) {
          results.push({
            row: rowNum,
            category_code: raw.category_code,
            status: 'FAILED',
            error: 'display_order must be a non-negative integer',
          });
          continue;
        }
        displayOrder = Math.floor(parsedOrder);
      }

      const candidateDto = {
        category_code: raw.category_code ? String(raw.category_code).trim() : '',
        name: raw.name ? String(raw.name).trim() : '',
        slug: raw.slug ? String(raw.slug).trim().toLowerCase() : '',
        description: raw.description ? String(raw.description).trim() : null,
        category_type: raw.category_type ? String(raw.category_type).trim() : null,
        parent_category_id: raw.parent_category_id ? String(raw.parent_category_id).trim() : null,
        status: (raw.status ? String(raw.status).trim().toUpperCase() : 'ACTIVE') as CategoryStatus,
        icon: raw.icon ? String(raw.icon).trim() : null,
        image_url: raw.image_url ? String(raw.image_url).trim() : null,
        display_order: displayOrder,
        seo_title: raw.seo_title ? String(raw.seo_title).trim() : null,
        seo_description: raw.seo_description ? String(raw.seo_description).trim() : null,
        seo_keywords: raw.seo_keywords ? String(raw.seo_keywords).trim() : null,
        canonical_path: raw.canonical_path ? String(raw.canonical_path).trim() : null,
        metadata: parsedMetadata,
      };

      const validationResult = createCategorySchema.safeParse(candidateDto);
      if (!validationResult.success) {
        const errorMsg = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        results.push({
          row: rowNum,
          category_code: candidateDto.category_code,
          status: 'FAILED',
          error: errorMsg,
        });
        continue;
      }

      const dto = validationResult.data as CreatePageCategoryDTO;

      // Duplicate check within batch
      if (seenCodes.has(dto.category_code)) {
        results.push({
          row: rowNum,
          category_code: dto.category_code,
          status: 'FAILED',
          error: `Duplicate category_code '${dto.category_code}' in upload file`,
        });
        continue;
      }
      if (seenSlugs.has(dto.slug)) {
        results.push({
          row: rowNum,
          category_code: dto.category_code,
          status: 'FAILED',
          error: `Duplicate slug '${dto.slug}' in upload file`,
        });
        continue;
      }

      seenCodes.add(dto.category_code);
      seenSlugs.add(dto.slug);
      validatedRows.push({ rowNum, data: dto });
    }

    if (mode === 'atomic' && results.some((r) => r.status === 'FAILED')) {
      return {
        total_received: rawRows.length,
        total_inserted: 0,
        total_failed: results.length,
        mode: 'atomic',
        results,
      };
    }

    // Process insertion in Transaction for atomic or individual for partial
    const client = await pool.connect();
    try {
      if (mode === 'atomic') {
        await client.query('BEGIN');
        for (const item of validatedRows) {
          // Pre-check duplicate in DB
          const existCode = await this.repo.findByCode(tenantId, organizationId, item.data.category_code);
          if (existCode) {
            await client.query('ROLLBACK');
            return {
              total_received: rawRows.length,
              total_inserted: 0,
              total_failed: 1,
              mode: 'atomic',
              results: [
                {
                  row: item.rowNum,
                  category_code: item.data.category_code,
                  status: 'FAILED',
                  error: `Category code '${item.data.category_code}' already exists in database`,
                },
              ],
            };
          }

          const existSlug = await this.repo.findBySlug(tenantId, organizationId, item.data.slug);
          if (existSlug) {
            await client.query('ROLLBACK');
            return {
              total_received: rawRows.length,
              total_inserted: 0,
              total_failed: 1,
              mode: 'atomic',
              results: [
                {
                  row: item.rowNum,
                  category_code: item.data.category_code,
                  status: 'FAILED',
                  error: `Category slug '${item.data.slug}' already exists in database`,
                },
              ],
            };
          }

          if (item.data.parent_category_id) {
            const parent = await this.repo.findById(tenantId, organizationId, item.data.parent_category_id);
            if (!parent) {
              await client.query('ROLLBACK');
              return {
                total_received: rawRows.length,
                total_inserted: 0,
                total_failed: 1,
                mode: 'atomic',
                results: [
                  {
                    row: item.rowNum,
                    category_code: item.data.category_code,
                    status: 'FAILED',
                    error: `Parent category id '${item.data.parent_category_id}' not found in database`,
                  },
                ],
              };
            }
          }

          const inserted = await this.repo.create(tenantId, organizationId, userId, item.data, client);
          results.push({
            row: item.rowNum,
            category_code: item.data.category_code,
            status: 'SUCCESS',
            id: inserted.id,
          });
        }
        await client.query('COMMIT');
      } else {
        // Partial mode
        for (const item of validatedRows) {
          try {
            const existCode = await this.repo.findByCode(tenantId, organizationId, item.data.category_code);
            if (existCode) {
              results.push({
                row: item.rowNum,
                category_code: item.data.category_code,
                status: 'FAILED',
                error: `Category code '${item.data.category_code}' already exists in database`,
              });
              continue;
            }

            const existSlug = await this.repo.findBySlug(tenantId, organizationId, item.data.slug);
            if (existSlug) {
              results.push({
                row: item.rowNum,
                category_code: item.data.category_code,
                status: 'FAILED',
                error: `Category slug '${item.data.slug}' already exists in database`,
              });
              continue;
            }

            if (item.data.parent_category_id) {
              const parent = await this.repo.findById(tenantId, organizationId, item.data.parent_category_id);
              if (!parent) {
                results.push({
                  row: item.rowNum,
                  category_code: item.data.category_code,
                  status: 'FAILED',
                  error: `Parent category id '${item.data.parent_category_id}' not found in database`,
                });
                continue;
              }
            }

            const inserted = await this.repo.create(tenantId, organizationId, userId, item.data);
            results.push({
              row: item.rowNum,
              category_code: item.data.category_code,
              status: 'SUCCESS',
              id: inserted.id,
            });
          } catch (err: any) {
            results.push({
              row: item.rowNum,
              category_code: item.data.category_code,
              status: 'FAILED',
              error: err?.message || 'Database insertion error',
            });
          }
        }
      }
    } catch (err) {
      if (mode === 'atomic') {
        await client.query('ROLLBACK');
      }
      throw err;
    } finally {
      client.release();
    }

    const insertedCount = results.filter((r) => r.status === 'SUCCESS').length;
    const failedCount = results.filter((r) => r.status === 'FAILED').length;

    return {
      total_received: rawRows.length,
      total_inserted: insertedCount,
      total_failed: failedCount,
      mode,
      results: results.sort((a, b) => a.row - b.row),
    };
  }
}

export const pageCategoryService = new PageCategoryService();
