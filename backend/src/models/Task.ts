import mongoose, { Schema, Document } from 'mongoose';
import { ITask, IAttachment, IChecklistItem } from '../types';

interface ITaskDocument extends ITask, Document {}

const checklistItemSchema = new Schema<IChecklistItem>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const attachmentSchema = new Schema<IAttachment>(
  {
    filename: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const taskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
      default: '',
    },
    list: {
      type: Schema.Types.ObjectId,
      ref: 'List',
      required: true,
      index: true,
    },
    board: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    labels: [{
      type: Schema.Types.ObjectId,
    }],
    dueDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    attachments: [attachmentSchema],
    checklist: [checklistItemSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient queries
taskSchema.index({ list: 1, position: 1 });
taskSchema.index({ board: 1, createdAt: -1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });

// Virtual populate for comments
taskSchema.virtual('comments', {
  ref: 'Activity',
  localField: '_id',
  foreignField: 'task',
  match: { type: 'comment_added' },
  options: { sort: { createdAt: -1 } },
});

// Static method to get next position
taskSchema.statics.getNextPosition = async function (listId: string): Promise<number> {
  const lastTask = await this.findOne({ list: listId }).sort({ position: -1 });
  return lastTask ? lastTask.position + 1 : 0;
};

// Method to move task to another list
taskSchema.methods.moveToList = async function (newListId: string, newPosition: number): Promise<void> {
  const oldListId = this.list;
  this.list = newListId;
  this.position = newPosition;
  await this.save();
};

const Task = mongoose.model<ITaskDocument>('Task', taskSchema);

export default Task;
