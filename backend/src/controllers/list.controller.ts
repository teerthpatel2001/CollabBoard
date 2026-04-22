import { Request, Response, NextFunction } from 'express';
import { List, Board, Activity } from '../models';
import { AppError } from '../types';
import { cacheInvalidatePattern } from '../config/redis';

export const createList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { title, boardId, position } = req.body;

    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Get next position if not provided
    let listPosition = position;
    if (listPosition === undefined) {
      const lastList = await List.findOne({ board: boardId }).sort({ position: -1 });
      listPosition = lastList ? lastList.position + 1 : 0;
    }

    const list = await List.create({
      title,
      board: boardId,
      position: listPosition,
    });

    // Log activity
    await Activity.createActivity(
      'list_created',
      userId!,
      boardId,
      { title },
      undefined,
      list._id.toString()
    );

    // Invalidate cache
    await cacheInvalidatePattern(`board:${boardId}*`);

    res.status(201).json({
      success: true,
      data: { list },
      message: 'List created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { listId } = req.params;
    const userId = req.user?.userId;
    const { title, position } = req.body;

    const list = await List.findById(listId);

    if (!list) {
      throw new AppError('List not found', 404);
    }

    const board = await Board.findById(list.board);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check membership
    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    const updates: { title?: string; position?: number } = {};
    if (title) updates.title = title;
    if (position !== undefined) updates.position = position;

    const updatedList = await List.findByIdAndUpdate(
      listId,
      { $set: updates },
      { new: true }
    );

    // Log activity
    await Activity.createActivity(
      'list_updated',
      userId!,
      list.board.toString(),
      { title: updates.title || list.title, updates: Object.keys(updates) },
      undefined,
      listId
    );

    // Invalidate cache
    await cacheInvalidatePattern(`board:${list.board}*`);

    res.json({
      success: true,
      data: { list: updatedList },
      message: 'List updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { listId } = req.params;
    const userId = req.user?.userId;

    const list = await List.findById(listId);

    if (!list) {
      throw new AppError('List not found', 404);
    }

    const board = await Board.findById(list.board);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check membership
    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    const boardId = list.board.toString();
    const listTitle = list.title;

    // Delete list (tasks will be deleted by pre-remove hook if implemented)
    await List.findByIdAndDelete(listId);
    await Activity.createActivity(
      'list_deleted',
      userId!,
      boardId,
      { title: listTitle },
      undefined,
      listId
    );

    // Reorder remaining lists
    const remainingLists = await List.find({ board: boardId }).sort({ position: 1 });
    for (let i = 0; i < remainingLists.length; i++) {
      await List.findByIdAndUpdate(remainingLists[i]._id, { position: i });
    }

    // Invalidate cache
    await cacheInvalidatePattern(`board:${boardId}*`);

    res.json({
      success: true,
      message: 'List deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const reorderLists = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { lists } = req.body;

    if (!lists || lists.length === 0) {
      throw new AppError('Lists are required', 400);
    }

    // Get board from first list
    const firstList = await List.findById(lists[0].id);
    if (!firstList) {
      throw new AppError('List not found', 404);
    }

    const board = await Board.findById(firstList.board);
    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check membership
    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    // Update positions
    const updates = lists.map(({ id, position }) =>
      List.findByIdAndUpdate(id, { position })
    );

    await Promise.all(updates);

    // Invalidate cache
    await cacheInvalidatePattern(`board:${firstList.board}*`);

    res.json({
      success: true,
      message: 'Lists reordered successfully',
    });
  } catch (error) {
    next(error);
  }
};
