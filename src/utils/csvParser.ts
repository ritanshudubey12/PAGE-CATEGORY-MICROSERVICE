import { parse } from 'csv-parse/sync';

export interface RawCategoryRow {
  category_code?: string;
  name?: string;
  slug?: string;
  description?: string;
  category_type?: string;
  parent_category_id?: string;
  status?: string;
  icon?: string;
  image_url?: string;
  display_order?: string | number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  canonical_path?: string;
  metadata?: string | Record<string, any>;
  [key: string]: any;
}

export function parseCsvBuffer(buffer: Buffer): RawCategoryRow[] {
  const records: Record<string, string>[] = parse(buffer, {
    columns: (header: string[]) =>
      header.map((col) =>
        col
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_')
          .replace(/[^\w]/g, '')
      ),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  return records;
}
