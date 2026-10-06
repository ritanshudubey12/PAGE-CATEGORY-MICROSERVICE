import { PoolClient } from 'pg';
import { pool, query } from '../../config/database';
import {
  PageCategoryRecord,
  CreatePageCategoryDTO,
  UpdatePageCategoryDTO,
  ListCategoriesQuery,
  CategoryStatus,
} from './types';

export class PageCategoryRepository {
  async create(
    tenantId: string,
    organizationId: string,
    userId: string | null,
    data: CreatePageCategoryDTO,
    client?: PoolClient
  ): Promise<PageCategoryRecord> {
    const sql = `
      INSERT INTO page_categories (
        tenant_id,
        organization_id,
        category_code,
        name,
        slug,
        description,
        category_type,
        parent_category_id,
        status,
        icon,
        image_url,
        display_order,
        seo_title,
        seo_description,
        seo_keywords,
        canonical_path,
        metadata,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18, NOW(), NOW()
      )
      RETURNING *;
    `;

    const params = [
      tenantId,
      organizationId,
      data.category_code,
      data.name,
      data.slug,
      data.description ?? null,
      data.category_type ?? null,
      data.parent_category_id ?? null,
      data.status ?? 'ACTIVE',
      data.icon ?? null,
      data.image_url ?? null,
      data.display_order ?? 0,
      data.seo_title ?? null,
      data.seo_description ?? null,
      data.seo_keywords ?? null,
      data.canonical_path ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      userId,
    ];

    const executor = client ? client.query.bind(client) : query;
    const res = await executor(sql, params);
    return res.rows[0];
  }

  async findById(
    tenantId: string,
    organizationId: string,
    id: string,
    includeDeleted = false
  ): Promise<PageCategoryRecord | null> {
    let sql = `
      SELECT *
      FROM page_categories
      WHERE id = $1
        AND tenant_id = $2
        AND organization_id = $3
    `;
    if (!includeDeleted) {
      sql += ` AND deleted_at IS NULL;`;
    }

    const res = await query<PageCategoryRecord>(sql, [id, tenantId, organizationId]);
    return res.rows[0] || null;
  }

  async findByCode(
    tenantId: string,
    organizationId: string,
    categoryCode: string
  ): Promise<PageCategoryRecord | null> {
    const sql = `
      SELECT *
      FROM page_categories
      WHERE category_code = $1
        AND tenant_id = $2
        AND organization_id = $3
        AND deleted_at IS NULL;
    `;
    const res = await query<PageCategoryRecord>(sql, [categoryCode, tenantId, organizationId]);
    return res.rows[0] || null;
  }

  async findBySlug(
    tenantId: string,
    organizationId: string,
    slug: string
  ): Promise<PageCategoryRecord | null> {
    const sql = `
      SELECT *
      FROM page_categories
      WHERE slug = $1
        AND tenant_id = $2
        AND organization_id = $3
        AND deleted_at IS NULL;
    `;
    const res = await query<PageCategoryRecord>(sql, [slug, tenantId, organizationId]);
    return res.rows[0] || null;
  }

  async list(
    tenantId: string,
    organizationId: string,
    filters: ListCategoriesQuery
  ): Promise<{ rows: PageCategoryRecord[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      q,
      status,
      category_type,
      parent_category_id,
      sort = 'display_order',
      order = 'ASC',
    } = filters;

    const offset = (page - 1) * limit;
    const whereClauses: string[] = [
      'tenant_id = $1',
      'organization_id = $2',
      'deleted_at IS NULL',
    ];
    const params: any[] = [tenantId, organizationId];
    let paramIndex = 3;

    if (q) {
      whereClauses.push(`(name ILIKE $${paramIndex} OR category_code ILIKE $${paramIndex} OR slug ILIKE $${paramIndex})`);
      params.push(`%${q}%`);
      paramIndex++;
    }

    if (status) {
      whereClauses.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (category_type) {
      whereClauses.push(`category_type = $${paramIndex}`);
      params.push(category_type);
      paramIndex++;
    }

    if (parent_category_id !== undefined) {
      if (parent_category_id === 'null' || parent_category_id === '') {
        whereClauses.push(`parent_category_id IS NULL`);
      } else {
        whereClauses.push(`parent_category_id = $${paramIndex}`);
        params.push(parent_category_id);
        paramIndex++;
      }
    }

    const whereSql = whereClauses.join(' AND ');

    // Allowlisted sort column to prevent SQL injection
    const allowedSortCols = ['name', 'category_code', 'display_order', 'created_at', 'updated_at', 'slug'];
    const sortColumn = allowedSortCols.includes(sort) ? sort : 'display_order';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const countSql = `SELECT COUNT(*) AS total FROM page_categories WHERE ${whereSql};`;
    const dataSql = `
      SELECT *
      FROM page_categories
      WHERE ${whereSql}
      ORDER BY ${sortColumn} ${sortOrder}, id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const countRes = await query<{ total: string }>(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const dataParams = [...params, limit, offset];
    const dataRes = await query<PageCategoryRecord>(dataSql, dataParams);

    return { rows: dataRes.rows, total };
  }

  async getRoots(tenantId: string, organizationId: string): Promise<PageCategoryRecord[]> {
    const sql = `
      SELECT *
      FROM page_categories
      WHERE tenant_id = $1
        AND organization_id = $2
        AND parent_category_id IS NULL
        AND deleted_at IS NULL
      ORDER BY display_order ASC, name ASC;
    `;
    const res = await query<PageCategoryRecord>(sql, [tenantId, organizationId]);
    return res.rows;
  }

  async getChildren(
    tenantId: string,
    organizationId: string,
    parentId: string
  ): Promise<PageCategoryRecord[]> {
    const sql = `
      SELECT *
      FROM page_categories
      WHERE tenant_id = $1
        AND organization_id = $2
        AND parent_category_id = $3
        AND deleted_at IS NULL
      ORDER BY display_order ASC, name ASC;
    `;
    const res = await query<PageCategoryRecord>(sql, [tenantId, organizationId, parentId]);
    return res.rows;
  }

  async getAllActive(tenantId: string, organizationId: string): Promise<PageCategoryRecord[]> {
    const sql = `
      SELECT *
      FROM page_categories
      WHERE tenant_id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
      ORDER BY display_order ASC, name ASC;
    `;
    const res = await query<PageCategoryRecord>(sql, [tenantId, organizationId]);
    return res.rows;
  }

  async hasActiveChildren(
    tenantId: string,
    organizationId: string,
    parentId: string
  ): Promise<boolean> {
    const sql = `
      SELECT 1
      FROM page_categories
      WHERE tenant_id = $1
        AND organization_id = $2
        AND parent_category_id = $3
        AND deleted_at IS NULL
      LIMIT 1;
    `;
    const res = await query(sql, [tenantId, organizationId, parentId]);
    return res.rows.length > 0;
  }

  async getDescendantIds(
    tenantId: string,
    organizationId: string,
    categoryId: string
  ): Promise<string[]> {
    const sql = `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_category_id
        FROM page_categories
        WHERE parent_category_id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        UNION ALL
        SELECT pc.id, pc.parent_category_id
        FROM page_categories pc
        JOIN descendants d ON pc.parent_category_id = d.id
        WHERE pc.tenant_id = $2
          AND pc.organization_id = $3
          AND pc.deleted_at IS NULL
      )
      SELECT id FROM descendants;
    `;
    const res = await query<{ id: string }>(sql, [categoryId, tenantId, organizationId]);
    return res.rows.map((r) => r.id);
  }

  async update(
    tenantId: string,
    organizationId: string,
    id: string,
    userId: string | null,
    data: UpdatePageCategoryDTO
  ): Promise<PageCategoryRecord | null> {
    const updateFields: string[] = [];
    const params: any[] = [tenantId, organizationId, id];
    let paramIndex = 4;

    if (data.category_code !== undefined) {
      updateFields.push(`category_code = $${paramIndex++}`);
      params.push(data.category_code);
    }
    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.slug !== undefined) {
      updateFields.push(`slug = $${paramIndex++}`);
      params.push(data.slug);
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.category_type !== undefined) {
      updateFields.push(`category_type = $${paramIndex++}`);
      params.push(data.category_type);
    }
    if (data.parent_category_id !== undefined) {
      updateFields.push(`parent_category_id = $${paramIndex++}`);
      params.push(data.parent_category_id);
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.icon !== undefined) {
      updateFields.push(`icon = $${paramIndex++}`);
      params.push(data.icon);
    }
    if (data.image_url !== undefined) {
      updateFields.push(`image_url = $${paramIndex++}`);
      params.push(data.image_url);
    }
    if (data.display_order !== undefined) {
      updateFields.push(`display_order = $${paramIndex++}`);
      params.push(data.display_order);
    }
    if (data.seo_title !== undefined) {
      updateFields.push(`seo_title = $${paramIndex++}`);
      params.push(data.seo_title);
    }
    if (data.seo_description !== undefined) {
      updateFields.push(`seo_description = $${paramIndex++}`);
      params.push(data.seo_description);
    }
    if (data.seo_keywords !== undefined) {
      updateFields.push(`seo_keywords = $${paramIndex++}`);
      params.push(data.seo_keywords);
    }
    if (data.canonical_path !== undefined) {
      updateFields.push(`canonical_path = $${paramIndex++}`);
      params.push(data.canonical_path);
    }
    if (data.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      params.push(data.metadata ? JSON.stringify(data.metadata) : null);
    }

    updateFields.push(`updated_by = $${paramIndex++}`);
    params.push(userId);

    updateFields.push(`updated_at = NOW()`);

    const sql = `
      UPDATE page_categories
      SET ${updateFields.join(', ')}
      WHERE id = $3
        AND tenant_id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
      RETURNING *;
    `;

    const res = await query<PageCategoryRecord>(sql, params);
    return res.rows[0] || null;
  }

  async updateStatus(
    tenantId: string,
    organizationId: string,
    id: string,
    userId: string | null,
    status: CategoryStatus
  ): Promise<PageCategoryRecord | null> {
    const sql = `
      UPDATE page_categories
      SET status = $4,
          updated_by = $5,
          updated_at = NOW()
      WHERE id = $3
        AND tenant_id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
      RETURNING *;
    `;
    const res = await query<PageCategoryRecord>(sql, [
      tenantId,
      organizationId,
      id,
      status,
      userId,
    ]);
    return res.rows[0] || null;
  }

  async softDelete(
    tenantId: string,
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<PageCategoryRecord | null> {
    const sql = `
      UPDATE page_categories
      SET deleted_at = NOW(),
          updated_by = $4,
          updated_at = NOW()
      WHERE id = $3
        AND tenant_id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
      RETURNING *;
    `;
    const res = await query<PageCategoryRecord>(sql, [tenantId, organizationId, id, userId]);
    return res.rows[0] || null;
  }

  async bulkSoftDelete(
    tenantId: string,
    organizationId: string,
    ids: string[],
    userId: string | null
  ): Promise<string[]> {
    const sql = `
      UPDATE page_categories
      SET deleted_at = NOW(),
          updated_by = $1,
          updated_at = NOW()
      WHERE id = ANY($2::bigint[])
        AND tenant_id = $3
        AND organization_id = $4
        AND deleted_at IS NULL
      RETURNING id;
    `;
    const res = await query<{ id: string }>(sql, [userId, ids, tenantId, organizationId]);
    return res.rows.map((r) => r.id);
  }
}

export const pageCategoryRepository = new PageCategoryRepository();
