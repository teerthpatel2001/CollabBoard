import mongoose, { Schema, Document } from 'mongoose';
import { IList } from '../types';

interface IListDocument extends IList, Document {}

const listSchema = new Schema<IListDocument>(
  {
    title: {
      type: String,
      required: [true, 'List title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for board + position for efficient ordering
listSchema.index({ board: 1, position: 1 });

// Virtual populate for tasks
listSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'list',
  options: { sort: { position: 1 } },
});

// Virtual for task count
listSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'list',
  count: true,
});

const List = mongoose.model<IListDocument>('List', listSchema);

export default List;
