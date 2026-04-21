import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { Board, Task, Activity } from '../models';
import { cacheInvalidatePattern } from '../config/redis';
import logger from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  currentBoard?: string;
}

export const setupSocketHandlers = (io: Server): void => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token as string);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id}, User: ${socket.userEmail}`);

    // Join board room
    socket.on('join-board', async (boardId: string) => {
      try {
        // Leave previous board room
        if (socket.currentBoard) {
          socket.leave(`board:${socket.currentBoard}`);
          socket.to(`board:${socket.currentBoard}`).emit('user-left', {
            userId: socket.userId,
            email: socket.userEmail,
          });
        }

        // Check board access
        const board = await Board.findById(boardId);
        if (!board) {
          socket.emit('error', { message: 'Board not found' });
          return;
        }

        if (!board.isMember(socket.userId!) && !board.isPublic) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Join new board room
        socket.join(`board:${boardId}`);
        socket.currentBoard = boardId;

        // Get active users in this board
        const room = io.sockets.adapter.rooms.get(`board:${boardId}`);
        const activeUsers = room ? room.size : 1;

        socket.emit('joined-board', { boardId, activeUsers });

        // Notify others
        socket.to(`board:${boardId}`).emit('user-joined', {
          userId: socket.userId,
          email: socket.userEmail,
          activeUsers,
        });

        logger.info(`User ${socket.userEmail} joined board ${boardId}`);
      } catch (error) {
        logger.error('Join board error:', error);
        socket.emit('error', { message: 'Failed to join board' });
      }
    });

    // Leave board room
    socket.on('leave-board', (boardId: string) => {
      socket.leave(`board:${boardId}`);

      if (socket.currentBoard === boardId) {
        socket.currentBoard = undefined;
      }

      socket.to(`board:${boardId}`).emit('user-left', {
        userId: socket.userId,
        email: socket.userEmail,
      });

      logger.info(`User ${socket.userEmail} left board ${boardId}`);
    });

    // Task created
    socket.on('task-created', async (data: { boardId: string; task: unknown }) => {
      try {
        const { boardId, task } = data;

        socket.to(`board:${boardId}`).emit('task-created', {
          task,
          createdBy: socket.userId,
        });

        // Invalidate cache
        await cacheInvalidatePattern(`board:${boardId}*`);
      } catch (error) {
        logger.error('Task created socket error:', error);
      }
    });

    // Task updated
    socket.on('task-updated', async (data: { boardId: string; taskId: string; updates: unknown }) => {
      try {
        const { boardId, taskId, updates } = data;

        socket.to(`board:${boardId}`).emit('task-updated', {
          taskId,
          updates,
          updatedBy: socket.userId,
        });

        await cacheInvalidatePattern(`board:${boardId}*`);
      } catch (error) {
        logger.error('Task updated socket error:', error);
      }
    });

    // Task moved
    socket.on('task-moved', async (data: {
      boardId: string;
      taskId: string;
      sourceListId: string;
      targetListId: string;
      newPosition: number;
    }) => {
      try {
        const { boardId, taskId, sourceListId, targetListId, newPosition } = data;

        // Broadcast to all users in the board
        socket.to(`board:${boardId}`).emit('task-moved', {
          taskId,
          sourceListId,
          targetListId,
          newPosition,
          movedBy: socket.userId,
        });

        // Log activity
        await Activity.createActivity(
          'task_moved',
          socket.userId!,
          boardId,
          { taskId, fromList: sourceListId, toList: targetListId },
          taskId,
          targetListId
        );

        await cacheInvalidatePattern(`board:${boardId}*`);
      } catch (error) {
        logger.error('Task moved socket error:', error);
      }
    });

    // Task deleted
    socket.on('task-deleted', async (data: { boardId: string; taskId: string }) => {
      try {
        const { boardId, taskId } = data;

        socket.to(`board:${boardId}`).emit('task-deleted', {
          taskId,
          deletedBy: socket.userId,
        });

        await cacheInvalidatePattern(`board:${boardId}*`);
      } catch (error) {
        logger.error('Task deleted socket error:', error);
      }
    });

    // List created
    socket.on('list-created', async (data: { boardId: string; list: unknown }) => {
      try {
        const { boardId, list } = data;

        socket.to(`board:${boardId}`).emit('list-created', {
          list,
          createdBy: socket.userId,
        });

        await cacheInvalidatePattern(`board:${boardId}*`);
      } catch (error) {
        logger.error('List created socket error:', error);
      }
    });

    // List updated
    socket.on('list-updated', async (data: { boardId: string; listId: string; updates: unknown }) => {
      try {
        const { boardId, listId, updates } = data;

        socket.to(`board:${boardId}`).emit('list-updated', {
          listId,
          updates,
          updatedBy: socket.userId,
        });

        await cacheInvalidatePattern(`board:${boardId}*`);
      } catch (error) {
        logger.error('List updated socket error:', error);
      }
    });

    // List reordered
    socket.on('lists-reordered', async (data: { boardId: string; lists: Array<{ id: string; position: number }> }) => {
      try {
        const { boardId, lists } = data;

        socket.to(`board:${boardId}`).emit('lists-reordered', {
          lists,
          reorderedBy: socket.userId,
        });

        await cacheInvalidatePattern(`board:${boardId}*`);
      } catch (error) {
        logger.error('Lists reordered socket error:', error);
      }
    });

    // Cursor position (for live cursor tracking)
    socket.on('cursor-move', (data: { boardId: string; x: number; y: number }) => {
      const { boardId, x, y } = data;

      socket.to(`board:${boardId}`).emit('cursor-move', {
        userId: socket.userId,
        email: socket.userEmail,
        x,
        y,
      });
    });

    // User typing indicator
    socket.on('typing', (data: { boardId: string; isTyping: boolean }) => {
      const { boardId, isTyping } = data;

      socket.to(`board:${boardId}`).emit('user-typing', {
        userId: socket.userId,
        email: socket.userEmail,
        isTyping,
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}, User: ${socket.userEmail}`);

      if (socket.currentBoard) {
        socket.to(`board:${socket.currentBoard}`).emit('user-left', {
          userId: socket.userId,
          email: socket.userEmail,
        });
      }
    });
  });
};
