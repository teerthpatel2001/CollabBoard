import { Router } from 'express';
import * as boardController from '../controllers/board.controller';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { createBoardSchema, updateBoardSchema, addMemberSchema, updateMemberSchema } from '../validators/board.validator';
import { z } from 'zod';
import { boardLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply rate limiting to board operations
router.use(boardLimiter);

// Board CRUD
router.get('/', boardController.getBoards);
router.post('/', validateBody(createBoardSchema), boardController.createBoard);
router.get('/:boardId', boardController.getBoard);
router.patch('/:boardId', validateBody(updateBoardSchema), boardController.updateBoard);
router.delete('/:boardId', boardController.deleteBoard);

// Member management
router.post('/:boardId/members', validateBody(addMemberSchema), boardController.addMember);
router.delete('/:boardId/members/:memberId', boardController.removeMember);

// Activity
router.get('/:boardId/activity', boardController.getBoardActivity);

export default router;
