import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(10000, 'Description is too long').optional(),
  listId: z.string().min(1, 'List ID is required'),
  boardId: z.string().min(1, 'Board ID is required'),
  position: z.number().int().min(0).default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
  assignedTo: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().datetime().optional(),
  assignedTo: z.string().optional().nullable(),
  labels: z.array(z.string()).optional(),
});

export const moveTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  sourceListId: z.string().min(1, 'Source list ID is required'),
  targetListId: z.string().min(1, 'Target list ID is required'),
  newPosition: z.number().int().min(0, 'Position must be non-negative'),
});

export const reorderTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
    })
  ).min(1, 'At least one task is required'),
});

export const addChecklistItemSchema = z.object({
  text: z.string().min(1).max(500),
});

export const updateChecklistItemSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
});

export const addCommentSchema = z.object({
  text: z.string().min(1).max(2000, 'Comment is too long'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
export type AddChecklistItemInput = z.infer<typeof addChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
