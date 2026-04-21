// User Types
export interface IUser {
  _id: string;
  email: string;
  password: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'member';
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserInput {
  email: string;
  password: string;
  name: string;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  role: string;
}

// Board Types
export interface IBoard {
  _id: string;
  title: string;
  description?: string;
  owner: string | IUser;
  members: Array<{
    user: string | IUser;
    role: 'admin' | 'member';
    joinedAt: Date;
  }>;
  coverImage?: string;
  isPublic: boolean;
  labels: ILabel[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabel {
  _id: string;
  name: string;
  color: string;
}

// List Types
export interface IList {
  _id: string;
  title: string;
  board: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

// Task Types
export interface ITask {
  _id: string;
  title: string;
  description?: string;
  list: string;
  board: string;
  position: number;
  assignedTo?: string | IUser;
  labels: string[];
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  attachments: IAttachment[];
  checklist: IChecklistItem[];
  createdBy: string | IUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachment {
  _id: string;
  filename: string;
  url: string;
  type: string;
  uploadedAt: Date;
}

export interface IChecklistItem {
  _id: string;
  text: string;
  completed: boolean;
}

// Activity Types
export interface IActivity {
  _id: string;
  type: 'board_created' | 'board_updated' | 'board_deleted' |
        'list_created' | 'list_updated' | 'list_deleted' |
        'task_created' | 'task_updated' | 'task_deleted' | 'task_moved' |
        'member_added' | 'member_removed' | 'comment_added';
  user: string | IUser;
  board: string;
  task?: string;
  list?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// Socket Types
export interface ISocketUser {
  userId: string;
  socketId: string;
  boardId?: string;
}

export interface ITaskMoveEvent {
  taskId: string;
  sourceListId: string;
  targetListId: string;
  newPosition: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Error Types
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}