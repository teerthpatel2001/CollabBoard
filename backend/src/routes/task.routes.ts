import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  reorderTasksSchema,
  addChecklistItemSchema,
  updateChecklistItemSchema,
} from '../validators/task.validator';
import { boardLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply rate limiting
router.use(boardLimiter);

// Task CRUD
router.post('/', validateBody(createTaskSchema), taskController.createTask);
router.get('/:taskId', taskController.getTask);
router.patch('/:taskId', validateBody(updateTaskSchema), taskController.updateTask);
router.delete('/:taskId', taskController.deleteTask);

// Move and reorder
router.post('/move', validateBody(moveTaskSchema), taskController.moveTask);
router.post('/reorder', validateBody(reorderTasksSchema), taskController.reorderTasks);

// Checklist
router.post('/:taskId/checklist', validateBody(addChecklistItemSchema), taskController.addChecklistItem);
router.patch('/:taskId/checklist/:itemId', validateBody(updateChecklistItemSchema), taskController.updateChecklistItem);
router.delete('/:taskId/checklist/:itemId', taskController.deleteChecklistItem);

export default router;
