import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import boardRoutes from './board.routes';
import listRoutes from './list.routes';
import taskRoutes from './task.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'CollabBoard API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/boards', boardRoutes);
router.use('/lists', listRoutes);
router.use('/tasks', taskRoutes);

export default router;
