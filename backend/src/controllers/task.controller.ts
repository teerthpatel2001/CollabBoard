import { Request, Response, NextFunction } from 'express';
import { Task, List, Board, Activity } from '../models';
import { AppError } from '../types';
import { cacheInvalidatePattern } from '../config/redis';

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const {
      title,
      description,
      listId,
      boardId,
      position,
      priority,
      dueDate,
      assignedTo,
      labels,
    } = req.body;

    // Verify list exists and user has access
    const list = await List.findById(listId);

    if (!list) {
      throw new AppError('List not found', 404);
    }

    const board = await Board.findById(list.board);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    // Get next position if not provided
    let taskPosition = position;
    if (taskPosition === undefined) {
      const lastTask = await Task.findOne({ list: listId }).sort({ position: -1 });
      taskPosition = lastTask ? lastTask.position + 1 : 0;
    }

    const task = await Task.create({
      title,
      description,
      list: listId,
      board: list.board,
      position: taskPosition,
      priority: priority || 'medium',
      dueDate: dueDate || undefined,
      assignedTo: assignedTo || undefined,
      labels: labels || [],
      createdBy: userId,
    });

    // Log activity
    await Activity.createActivity(
      'task_created',
      userId!,
      list.board.toString(),
      { title, listTitle: list.title },
      task._id.toString(),
      listId
    );

    // Invalidate cache
    await cacheInvalidatePattern(`board:${list.board}*`);

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar');

    res.status(201).json({
      success: true,
      data: { task: populatedTask },
      message: 'Task created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.userId;

    const task = await Task.findById(taskId)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const board = await Board.findById(task.board);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    if (!board.isMember(userId!) && !board.isPublic) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.userId;
    const updates = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const board = await Board.findById(task.board);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email avatar');

    // Log activity
    await Activity.createActivity(
      'task_updated',
      userId!,
      task.board.toString(),
      { title: task.title, updates: Object.keys(updates) },
      taskId,
      task.list.toString()
    );

    // Invalidate cache
    await cacheInvalidatePattern(`board:${task.board}*`);

    res.json({
      success: true,
      data: { task: updatedTask },
      message: 'Task updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.userId;

    const task = await Task.findById(taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const board = await Board.findById(task.board);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    const boardId = task.board.toString();
    const listId = task.list.toString();
    const taskTitle = task.title;

    await Task.findByIdAndDelete(taskId);

    // Log activity
    await Activity.createActivity(
      'task_deleted',
      userId!,
      boardId,
      { title: taskTitle },
      taskId,
      listId
    );

    // Invalidate cache
    await cacheInvalidatePattern(`board:${boardId}*`);

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const moveTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { taskId, sourceListId, targetListId, newPosition } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const board = await Board.findById(task.board);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    const oldListId = task.list.toString();
    const wasMoved = oldListId !== targetListId;

    // Update task
    task.list = targetListId;
    task.position = newPosition;
    await task.save();

    // Reorder tasks in target list
    const targetListTasks = await Task.find({
      list: targetListId,
      _id: { $ne: taskId },
    }).sort({ position: 1 });

    // Insert task at new position
    const reorderedTasks = [...targetListTasks];
    reorderedTasks.splice(newPosition, 0, task);

    // Update positions
    const updatePromises = reorderedTasks.map((t, index) =>
      Task.findByIdAndUpdate(t._id, { position: index })
    );

    await Promise.all(updatePromises);

    // If moved to different list, reorder source list too
    if (wasMoved) {
      const sourceListTasks = await Task.find({
        list: sourceListId,
      }).sort({ position: 1 });

      const sourceUpdates = sourceListTasks.map((t, index) =>
        Task.findByIdAndUpdate(t._id, { position: index })
      );

      await Promise.all(sourceUpdates);

      // Log activity
      await Activity.createActivity(
        'task_moved',
        userId!,
        task.board.toString(),
        {
          title: task.title,
          fromList: sourceListId,
          toList: targetListId,
        },
        taskId,
        targetListId
      );
    }

    // Invalidate cache
    await cacheInvalidatePattern(`board:${task.board}*`);

    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'name email avatar');

    res.json({
      success: true,
      data: { task: updatedTask },
      message: 'Task moved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const reorderTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { tasks } = req.body;

    if (!tasks || tasks.length === 0) {
      throw new AppError('Tasks are required', 400);
    }

    // Get first task to find board
    const firstTask = await Task.findById(tasks[0].id);
    if (!firstTask) {
      throw new AppError('Task not found', 404);
    }

    const board = await Board.findById(firstTask.board);
    if (!board) {
      throw new AppError('Board not found', 404);
    }

    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    // Update positions
    const updates = tasks.map(({ id, position }) =>
      Task.findByIdAndUpdate(id, { position })
    );

    await Promise.all(updates);

    // Invalidate cache
    await cacheInvalidatePattern(`board:${firstTask.board}*`);

    res.json({
      success: true,
      message: 'Tasks reordered successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const addChecklistItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.userId;
    const { text } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const board = await Board.findById(task.board);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    task.checklist.push({
      text,
      completed: false,
    });

    await task.save();

    // Invalidate cache
    await cacheInvalidatePattern(`board:${task.board}*`);

    res.json({
      success: true,
      data: { task },
      message: 'Checklist item added',
    });
  } catch (error) {
    next(error);
  }
};

export const updateChecklistItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId, itemId } = req.params;
    const userId = req.user?.userId;
    const { text, completed } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const board = await Board.findById(task.board);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    const item = task.checklist.id(itemId);

    if (!item) {
      throw new AppError('Checklist item not found', 404);
    }

    if (text !== undefined) item.text = text;
    if (completed !== undefined) item.completed = completed;

    await task.save();

    // Invalidate cache
    await cacheInvalidatePattern(`board:${task.board}*`);

    res.json({
      success: true,
      data: { task },
      message: 'Checklist item updated',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChecklistItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId, itemId } = req.params;
    const userId = req.user?.userId;

    const task = await Task.findById(taskId);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const board = await Board.findById(task.board);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    if (!board.isMember(userId!)) {
      throw new AppError('Access denied', 403);
    }

    task.checklist = task.checklist.filter((item) => item._id.toString() !== itemId);
    await task.save();

    // Invalidate cache
    await cacheInvalidatePattern(`board:${task.board}*`);

    res.json({
      success: true,
      data: { task },
      message: 'Checklist item removed',
    });
  } catch (error) {
    next(error);
  }
};
