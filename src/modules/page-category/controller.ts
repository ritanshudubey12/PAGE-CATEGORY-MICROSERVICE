import { Request, Response, NextFunction } from 'express';
import { PageCategoryService, pageCategoryService } from './service';
import {
  createCategorySchema,
  updateCategorySchema,
  updateStatusSchema,
  listQuerySchema,
  bulkDeleteSchema,
  idParamSchema,
  codeParamSchema,
} from './validation';
import { sendSuccess, sendError } from '../../utils/response';
import { parseCsvBuffer } from '../../utils/csvParser';
import { parseXlsxBuffer } from '../../utils/xlsxParser';
import { RawCategoryRow } from '../../utils/csvParser';

export class PageCategoryController {
  constructor(private service: PageCategoryService = pageCategoryService) {}

  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = createCategorySchema.safeParse(req.body);
      if (!validation.success) {
        sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'Invalid category payload',
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }

      const { tenantId, organizationId, userId } = req.context!;
      const category = await this.service.createCategory(
        tenantId,
        organizationId,
        userId ?? null,
        validation.data
      );

      sendSuccess(res, category, 201);
    } catch (err) {
      next(err);
    }
  };

  listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = listQuerySchema.safeParse(req.query);
      if (!validation.success) {
        sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'Invalid query parameters',
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }

      const { tenantId, organizationId } = req.context!;
      const result = await this.service.listCategories(tenantId, organizationId, validation.data);

      sendSuccess(res, result.data, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  };

  getTree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId } = req.context!;
      const tree = await this.service.getCategoryTree(tenantId, organizationId);
      sendSuccess(res, tree);
    } catch (err) {
      next(err);
    }
  };

  getRoots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId } = req.context!;
      const roots = await this.service.getRoots(tenantId, organizationId);
      sendSuccess(res, roots);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramValidation = idParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid category id in path');
        return;
      }

      const { tenantId, organizationId } = req.context!;
      const category = await this.service.getCategoryById(
        tenantId,
        organizationId,
        paramValidation.data.id
      );

      sendSuccess(res, category);
    } catch (err) {
      next(err);
    }
  };

  getChildren = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramValidation = idParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid category id in path');
        return;
      }

      const { tenantId, organizationId } = req.context!;
      const children = await this.service.getChildren(
        tenantId,
        organizationId,
        paramValidation.data.id
      );

      sendSuccess(res, children);
    } catch (err) {
      next(err);
    }
  };

  getByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramValidation = codeParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid category code in path');
        return;
      }

      const { tenantId, organizationId } = req.context!;
      const category = await this.service.getCategoryByCode(
        tenantId,
        organizationId,
        paramValidation.data.categoryCode
      );

      sendSuccess(res, category);
    } catch (err) {
      next(err);
    }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramValidation = idParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid category id in path');
        return;
      }

      const bodyValidation = updateCategorySchema.safeParse(req.body);
      if (!bodyValidation.success) {
        sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'Invalid category update payload',
          bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }

      const { tenantId, organizationId, userId } = req.context!;
      const updated = await this.service.updateCategory(
        tenantId,
        organizationId,
        paramValidation.data.id,
        userId ?? null,
        bodyValidation.data
      );

      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramValidation = idParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid category id in path');
        return;
      }

      const bodyValidation = updateStatusSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'Invalid status payload',
          bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }

      const { tenantId, organizationId, userId } = req.context!;
      const updated = await this.service.updateStatus(
        tenantId,
        organizationId,
        paramValidation.data.id,
        userId ?? null,
        bodyValidation.data.status
      );

      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  };

  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramValidation = idParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid category id in path');
        return;
      }

      const { tenantId, organizationId, userId } = req.context!;
      const deleted = await this.service.deleteCategory(
        tenantId,
        organizationId,
        paramValidation.data.id,
        userId ?? null
      );

      sendSuccess(res, { id: deleted.id, deleted: true, message: 'Category soft deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = bulkDeleteSchema.safeParse(req.body);
      if (!validation.success) {
        sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'Invalid bulk delete payload',
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }

      const { tenantId, organizationId, userId } = req.context!;
      const result = await this.service.bulkDeleteCategories(
        tenantId,
        organizationId,
        validation.data.ids,
        userId ?? null
      );

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  bulkImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file || !req.file.buffer) {
        sendError(res, 400, 'FILE_REQUIRED', 'A valid CSV or XLSX file is required');
        return;
      }

      const filename = req.file.originalname.toLowerCase();
      let rawRows: RawCategoryRow[] = [];

      if (filename.endsWith('.csv') || req.file.mimetype === 'text/csv') {
        try {
          rawRows = parseCsvBuffer(req.file.buffer);
        } catch (csvErr: any) {
          sendError(res, 400, 'CSV_PARSE_ERROR', `Failed to parse CSV file: ${csvErr.message}`);
          return;
        }
      } else if (
        filename.endsWith('.xlsx') ||
        filename.endsWith('.xls') ||
        req.file.mimetype.includes('spreadsheet') ||
        req.file.mimetype.includes('excel')
      ) {
        try {
          rawRows = parseXlsxBuffer(req.file.buffer);
        } catch (xlsxErr: any) {
          sendError(res, 400, 'XLSX_PARSE_ERROR', `Failed to parse Excel file: ${xlsxErr.message}`);
          return;
        }
      } else {
        sendError(
          res,
          400,
          'UNSUPPORTED_FILE_TYPE',
          'Unsupported file format. Please upload a .csv or .xlsx file'
        );
        return;
      }

      const mode = req.query.mode === 'partial' ? 'partial' : 'atomic';
      const { tenantId, organizationId, userId } = req.context!;

      const result = await this.service.bulkImport(
        tenantId,
        organizationId,
        userId ?? null,
        rawRows,
        mode
      );

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  };
}

export const pageCategoryController = new PageCategoryController();
