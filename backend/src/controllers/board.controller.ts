import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Board, List, Task, Activity, User } from '../models';
import { AppError } from '../types';
import { cacheGet, cacheSet, cacheInvalidatePattern } from '../config/redis';
import logger from '../utils/logger';

export const getBoards = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 10, search = '' } = req.query;

    const cacheKey = `boards:${userId}:page${page}:limit${limit}:search${search}`;

    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json({
        success: true,
        data: cached,
        fromCache: true,
      });
      return;
    }

    const query: Record<string, unknown> = {
      $or: [
        { owner: userId },
        { 'members.user': userId },
      ],
    };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [boards, total] = await Promise.all([
      Board.find(query)
        .populate('owner', 'name email avatar')
        .populate('members.user', 'name email avatar')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Board.countDocuments(query),
    ]);

    // Transform boards to include id field
    const transformedBoards = boards.map(board => ({
      ...board,
      id: board._id.toString(),
      owner: board.owner ? {
        ...board.owner,
        id: board.owner._id?.toString(),
      } : board.owner,
      members: board.members?.map((m: { user: { _id?: { toString: () => string } } & Record<string, unknown> } & Record<string, unknown>) => ({
        ...m,
        user: m.user ? {
          ...m.user,
          id: m.user._id?.toString(),
        } : m.user,
      })) || [],
    }));

    const result = {
      boards: transformedBoards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };

    // Cache for 5 minutes
    await cacheSet(cacheKey, result, 300);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getBoard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const userId = req.user?.userId;

    // Validate boardId
    if (!boardId || boardId === 'undefined') {
      throw new AppError('Invalid board ID', 400);
    }

    const cacheKey = `board:${boardId}`;

    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      // Check access permission
      const board = cached;
      const hasAccess = board.isPublic ||
        board.owner._id.toString() === userId ||
        board.members.some((m) => m.user._id.toString() === userId);

      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      res.json({
        success: true,
        data: { board },
        fromCache: true,
      });
      return;
    }

    const board = await Board.findById(boardId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .lean();

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check access permission
    const hasAccess = board.isPublic ||
      board.owner._id.toString() === userId ||
      board.members.some((m) => m.user._id.toString() === userId);

    if (!hasAccess) {
      throw new AppError('Access denied', 403);
    }

    // Fetch lists with tasks
    const lists = await List.find({ board: boardId })
      .sort({ position: 1 })
      .lean();

    const listIds = lists.map((l) => l._id.toString());
    const tasks = await Task.find({ list: { $in: listIds } })
      .populate('assignedTo', 'name email avatar')
      .sort({ position: 1 })
      .lean();

    // Group tasks by list
    const tasksByList = tasks.reduce((acc, task) => {
      const listId = task.list.toString();
      if (!acc[listId]) acc[listId] = [];
      acc[listId].push(task);
      return acc;
    }, {} as Record<string, typeof tasks>);

    // Transform tasks to include id
    const transformedTasksByList: Record<string, unknown[]> = {};
    for (const [listId, taskList] of Object.entries(tasksByList)) {
      transformedTasksByList[listId] = taskList.map(task => ({
        ...task,
        id: task._id.toString(),
        assignedTo: task.assignedTo ? {
          ...task.assignedTo,
          id: task.assignedTo._id?.toString(),
        } : task.assignedTo,
      }));
    }

    // Transform board with lists and tasks
    const boardWithLists = {
      ...board,
      id: board._id.toString(),
      owner: board.owner ? {
        ...board.owner,
        id: board.owner._id?.toString(),
      } : board.owner,
      members: board.members?.map((m: { user: { _id?: { toString: () => string } } & Record<string, unknown> } & Record<string, unknown>) => ({
        ...m,
        user: m.user ? {
          ...m.user,
          id: m.user._id?.toString(),
        } : m.user,
      })) || [],
      lists: lists.map((list) => ({
        ...list,
        id: list._id.toString(),
        tasks: transformedTasksByList[list._id.toString()] || [],
      })),
    };

    // Cache for 2 minutes
    await cacheSet(cacheKey, boardWithLists, 120);

    res.json({
      success: true,
      data: { board: boardWithLists },
    });
  } catch (error) {
    next(error);
  }
};

export const createBoard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { title, description, isPublic, coverImage } = req.body;

    const board = await Board.create({
      title,
      description,
      owner: userId,
      isPublic: isPublic || false,
      coverImage,
      labels: [
        { name: 'Bug', color: '#ef4444' },
        { name: 'Feature', color: '#22c55e' },
        { name: 'Improvement', color: '#3b82f6' },
        { name: 'High Priority', color: '#f97316' },
      ],
    });

    // Create default lists
    await List.create([
      { title: 'To Do', board: board._id, position: 0 },
      { title: 'In Progress', board: board._id, position: 1 },
      { title: 'Done', board: board._id, position: 2 },
    ]);

    // Log activity
    await Activity.createActivity(
      'board_created',
      userId!,
      board._id.toString(),
      { title }
    );

    // Invalidate cache
    await cacheInvalidatePattern(`boards:${userId}:*`);

    const populatedBoard = await Board.findById(board._id)
      .populate('owner', 'name email avatar')
      .lean();

    // Transform _id to id for frontend compatibility
    const transformedBoard = populatedBoard ? {
      ...populatedBoard,
      id: populatedBoard._id.toString(),
      owner: populatedBoard.owner ? {
        ...populatedBoard.owner,
        id: populatedBoard.owner._id?.toString(),
      } : populatedBoard.owner,
    } : null;

    res.status(201).json({
      success: true,
      data: { board: transformedBoard },
      message: 'Board created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const userId = req.user?.userId;
    const updates = req.body;

    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check permission
    if (!board.isAdmin(userId!)) {
      throw new AppError('Only board admins can update board', 403);
    }

    const updatedBoard = await Board.findByIdAndUpdate(
      boardId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('owner', 'name email avatar')
     .populate('members.user', 'name email avatar');

    // Log activity
    await Activity.createActivity(
      'board_updated',
      userId!,
      boardId,
      { updates: Object.keys(updates) }
    );

    // Invalidate caches
    await cacheInvalidatePattern(`board:${boardId}*`);
    await cacheInvalidatePattern(`boards:${userId}:*`);

    res.json({
      success: true,
      data: { board: updatedBoard },
      message: 'Board updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBoard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { boardId } = req.params;
    const userId = req.user?.userId;

    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Only owner can delete board
    if (board.owner.toString() !== userId) {
      throw new AppError('Only board owner can delete board', 403);
    }

    // Delete related data
    await List.deleteMany({ board: boardId }).session(session);
    await Task.deleteMany({ board: boardId }).session(session);
    await Activity.deleteMany({ board: boardId }).session(session);
    await Board.findByIdAndDelete(boardId).session(session);

    // Log activity before commit
    await Activity.createActivity(
      'board_deleted',
      userId!,
      boardId,
      { title: board.title }
    );

    await session.commitTransaction();

    // Invalidate caches
    await cacheInvalidatePattern(`board:${boardId}*`);
    await cacheInvalidatePattern(`boards:${userId}:*`);

    res.json({
      success: true,
      message: 'Board deleted successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

export const addMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const userId = req.user?.userId;
    const { email, role } = req.body;

    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check permission
    if (!board.isAdmin(userId!)) {
      throw new AppError('Only board admins can add members', 403);
    }

    // Find user to add
    const userToAdd = await User.findOne({ email });

    if (!userToAdd) {
      throw new AppError('User not found with this email', 404);
    }

    // Check if already member
    if (board.isMember(userToAdd._id.toString())) {
      throw new AppError('User is already a member of this board', 400);
    }

    // Add member
    board.members.push({
      user: userToAdd._id,
      role: role || 'member',
      joinedAt: new Date(),
    });

    await board.save();

    // Log activity
    await Activity.createActivity(
      'member_added',
      userId!,
      boardId,
      { addedUser: userToAdd.name, role }
    );

    // Invalidate cache
    await cacheInvalidatePattern(`board:${boardId}*`);

    const updatedBoard = await Board.findById(boardId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({
      success: true,
      data: { board: updatedBoard },
      message: 'Member added successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId, memberId } = req.params;
    const userId = req.user?.userId;

    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check permission (admin or self-removal)
    const isSelfRemoval = memberId === userId;
    const isAdmin = board.isAdmin(userId!);

    if (!isAdmin && !isSelfRemoval) {
      throw new AppError('Permission denied', 403);
    }

    // Cannot remove owner
    const member = board.members.find((m) => m.user.toString() === memberId);
    if (member?.user.toString() === board.owner.toString()) {
      throw new AppError('Cannot remove board owner', 400);
    }

    board.members = board.members.filter((m) => m.user.toString() !== memberId);
    await board.save();

    // Log activity
    await Activity.createActivity(
      'member_removed',
      userId!,
      boardId,
      { removedUserId: memberId }
    );

    // Invalidate cache
    await cacheInvalidatePattern(`board:${boardId}*`);

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getBoardActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { boardId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check access
    if (!board.isPublic && !board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [activities, total] = await Promise.all([
      Activity.find({ board: boardId })
        .populate('user', 'name email avatar')
        .populate('task', 'title')
        .populate('list', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Activity.countDocuments({ board: boardId }),
    ]);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
