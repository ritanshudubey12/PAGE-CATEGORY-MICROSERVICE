export type CategoryStatus = 'ACTIVE' | 'INACTIVE';

export interface PageCategoryRecord {
  id: string;
  tenant_id: string;
  organization_id: string;
  category_code: string;
  name: string;
  slug: string;
  description: string | null;
  category_type: string | null;
  parent_category_id: string | null;
  status: CategoryStatus;
  icon: string | null;
  image_url: string | null;
  display_order: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  canonical_path: string | null;
  metadata: Record<string, any> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  deleted_at: string | Date | null;
}

export interface PageCategoryTreeNode extends PageCategoryRecord {
  children: PageCategoryTreeNode[];
}

export interface CreatePageCategoryDTO {
  category_code: string;
  name: string;
  slug: string;
  description?: string | null;
  category_type?: string | null;
  parent_category_id?: string | null;
  status?: CategoryStatus;
  icon?: string | null;
  image_url?: string | null;
  display_order?: number;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  canonical_path?: string | null;
  metadata?: Record<string, any> | null;
}

export interface UpdatePageCategoryDTO {
  category_code?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  category_type?: string | null;
  parent_category_id?: string | null;
  status?: CategoryStatus;
  icon?: string | null;
  image_url?: string | null;
  display_order?: number;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  canonical_path?: string | null;
  metadata?: Record<string, any> | null;
}

export interface ListCategoriesQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: CategoryStatus;
  category_type?: string;
  parent_category_id?: string | null;
  sort?: 'name' | 'category_code' | 'display_order' | 'created_at' | 'updated_at' | 'slug';
  order?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export interface BulkImportRowResult {
  row: number;
  category_code?: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
  id?: string;
}

export interface BulkImportResult {
  total_received: number;
  total_inserted: number;
  total_failed: number;
  mode: 'atomic' | 'partial';
  results: BulkImportRowResult[];
}

export interface BulkDeleteDTO {
  ids: string[];
}

export interface BulkDeleteResult {
  total_requested: number;
  total_deleted: number;
  deleted_ids: string[];
  not_found_or_inaccessible_ids: string[];
}
