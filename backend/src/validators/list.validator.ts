import { z } from 'zod';

export const createListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  boardId: z.string().min(1, 'Board ID is required'),
  position: z.number().int().min(0).default(0),
});

export const updateListSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  position: z.number().int().min(0).optional(),
});

export const reorderListsSchema = z.object({
  lists: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
    })
  ).min(1, 'At least one list is required'),
});

export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type ReorderListsInput = z.infer<typeof reorderListsSchema>;
