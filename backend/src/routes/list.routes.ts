import { Router } from 'express';
import * as listController from '../controllers/list.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createListSchema, updateListSchema, reorderListsSchema } from '../validators/list.validator';
import { boardLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply rate limiting
router.use(boardLimiter);

// List CRUD
router.post('/', validateBody(createListSchema), listController.createList);
router.patch('/:listId', validateBody(updateListSchema), listController.updateList);
router.delete('/:listId', listController.deleteList);

// Reorder lists
router.post('/reorder', validateBody(reorderListsSchema), listController.reorderLists);

export default router;
