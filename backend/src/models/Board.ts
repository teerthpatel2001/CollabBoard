import mongoose, { Schema, Document } from 'mongoose';
import { IBoard, ILabel } from '../types';

interface IBoardDocument extends IBoard, Document {}

const labelSchema = new Schema<ILabel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      match: /^#[0-9A-F]{6}$/i,
    },
  },
  { _id: true }
);

const boardMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const boardSchema = new Schema<IBoardDocument>(
  {
    title: {
      type: String,
      required: [true, 'Board title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [boardMemberSchema],
    coverImage: {
      type: String,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    labels: [labelSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
boardSchema.index({ owner: 1, createdAt: -1 });
boardSchema.index({ 'members.user': 1 });
boardSchema.index({ isPublic: 1 });

// Virtual populate for lists
boardSchema.virtual('lists', {
  ref: 'List',
  localField: '_id',
  foreignField: 'board',
});

// Virtual populate for tasks count
boardSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'board',
  count: true,
});

// Method to check if user is a member
boardSchema.methods.isMember = function (userId: string): boolean {
  return this.owner.toString() === userId.toString() ||
    this.members.some(
      (member) => member.user.toString() === userId.toString()
    );
};

// Method to check if user is admin
boardSchema.methods.isAdmin = function (userId: string): boolean {
  const member = this.members.find(
    (member) => member.user.toString() === userId.toString()
  );
  return member?.role === 'admin' || this.owner.toString() === userId.toString();
};

const Board = mongoose.model<IBoardDocument>('Board', boardSchema);

export default Board;
