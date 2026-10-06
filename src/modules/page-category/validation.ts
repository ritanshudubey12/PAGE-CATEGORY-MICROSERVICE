import { z } from 'zod';

export const BIGINT_STRING_REGEX = /^[1-9]\d*$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCategorySchema = z.object({
  category_code: z
    .string({ required_error: 'category_code is required' })
    .trim()
    .min(1, 'category_code must not be empty')
    .max(50, 'category_code must be at most 50 characters'),
  name: z
    .string({ required_error: 'name is required' })
    .trim()
    .min(1, 'name must not be empty')
    .max(150, 'name must be at most 150 characters'),
  slug: z
    .string({ required_error: 'slug is required' })
    .trim()
    .toLowerCase()
    .min(1, 'slug must not be empty')
    .max(180, 'slug must be at most 180 characters')
    .regex(SLUG_REGEX, 'slug must contain only lowercase alphanumeric characters and single hyphens (e.g., "tech-news")'),
  description: z.string().trim().nullable().optional(),
  category_type: z
    .string()
    .trim()
    .max(40, 'category_type must be at most 40 characters')
    .nullable()
    .optional(),
  parent_category_id: z
    .string()
    .trim()
    .regex(BIGINT_STRING_REGEX, 'parent_category_id must be a valid positive BIGINT numeric string')
    .nullable()
    .optional(),
  status: z
    .enum(['ACTIVE', 'INACTIVE'], {
      errorMap: () => ({ message: 'status must be either ACTIVE or INACTIVE' }),
    })
    .default('ACTIVE'),
  icon: z.string().trim().max(255).nullable().optional(),
  image_url: z
    .string()
    .trim()
    .url('image_url must be a valid URL')
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? null : val),
  display_order: z
    .number()
    .int('display_order must be an integer')
    .min(0, 'display_order must be non-negative')
    .default(0),
  seo_title: z.string().trim().max(255).nullable().optional(),
  seo_description: z.string().trim().nullable().optional(),
  seo_keywords: z.string().trim().nullable().optional(),
  canonical_path: z.string().trim().max(500).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'status must be either ACTIVE or INACTIVE' }),
  }),
});

export const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val >= 1, { message: 'page must be an integer >= 1' }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: 'limit must be an integer between 1 and 100',
    }),
  q: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  category_type: z.string().trim().optional(),
  parent_category_id: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => val === undefined || val === 'null' || val === '' || BIGINT_STRING_REGEX.test(val),
      { message: 'parent_category_id must be a positive numeric string or "null"' }
    ),
  sort: z
    .enum(['name', 'category_code', 'display_order', 'created_at', 'updated_at', 'slug'])
    .default('display_order'),
  order: z
    .enum(['ASC', 'DESC', 'asc', 'desc'])
    .default('ASC')
    .transform((val) => val.toUpperCase() as 'ASC' | 'DESC'),
});

export const bulkDeleteSchema = z.object({
  ids: z
    .array(
      z
        .string()
        .trim()
        .regex(BIGINT_STRING_REGEX, 'Each id must be a positive numeric string')
    )
    .min(1, 'ids array must contain at least 1 id')
    .max(500, 'Cannot delete more than 500 records in a single batch'),
});

export const idParamSchema = z.object({
  id: z.string().trim().regex(BIGINT_STRING_REGEX, 'id must be a positive numeric string'),
});

export const codeParamSchema = z.object({
  categoryCode: z
    .string()
    .trim()
    .min(1, 'categoryCode must not be empty')
    .max(50, 'categoryCode must be at most 50 characters'),
});
