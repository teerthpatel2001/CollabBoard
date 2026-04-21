import mongoose, { Schema, Document } from 'mongoose';
import { IActivity } from '../types';

interface IActivityDocument extends IActivity, Document {}

const activitySchema = new Schema<IActivityDocument>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'board_created',
        'board_updated',
        'board_deleted',
        'list_created',
        'list_updated',
        'list_deleted',
        'task_created',
        'task_updated',
        'task_deleted',
        'task_moved',
        'member_added',
        'member_removed',
        'comment_added',
      ],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    board: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true,
    },
    list: {
      type: Schema.Types.ObjectId,
      ref: 'List',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
activitySchema.index({ board: 1, createdAt: -1 });
activitySchema.index({ task: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

// Static method to create activity
activitySchema.statics.createActivity = async function (
  type: IActivity['type'],
  userId: string,
  boardId: string,
  metadata: Record<string, unknown> = {},
  taskId?: string,
  listId?: string
): Promise<IActivityDocument> {
  return this.create({
    type,
    user: userId,
    board: boardId,
    task: taskId || null,
    list: listId || null,
    metadata,
  });
};

const Activity = mongoose.model<IActivityDocument>('Activity', activitySchema);

export default Activity;
