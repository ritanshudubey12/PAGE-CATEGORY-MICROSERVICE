import { Router } from 'express';
import multer from 'multer';
import { config } from '../../config/env';
import { pageCategoryController } from './controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.bulk.maxUploadSizeMb * 1024 * 1024,
  },
});

// Specific / Static sub-routes (must come BEFORE /:id parameter routes)
router.get('/tree', pageCategoryController.getTree);
router.get('/roots', pageCategoryController.getRoots);
router.get('/code/:categoryCode', pageCategoryController.getByCode);

// Bulk operations
router.post('/bulk-import', upload.single('file'), pageCategoryController.bulkImport);
router.post('/bulk-delete', pageCategoryController.bulkDelete);

// Base collection routes
router.post('/', pageCategoryController.createCategory);
router.get('/', pageCategoryController.listCategories);

// Single resource parameterized routes
router.get('/:id', pageCategoryController.getById);
router.get('/:id/children', pageCategoryController.getChildren);
router.patch('/:id/status', pageCategoryController.updateStatus);
router.patch('/:id', pageCategoryController.updateCategory);
router.delete('/:id', pageCategoryController.deleteCategory);

export default router;
