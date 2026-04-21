// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'member';
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Board Types
export interface Board {
  id: string;
  title: string;
  description?: string;
  owner: User;
  members: BoardMember[];
  coverImage?: string;
  isPublic: boolean;
  labels: Label[];
  lists?: List[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardMember {
  user: User;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

// List Types
export interface List {
  id: string;
  title: string;
  board: string;
  position: number;
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

// Task Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  list: string;
  board: string;
  position: number;
  assignedTo?: User;
  labels: string[];
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  attachments: Attachment[];
  checklist: ChecklistItem[];
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

// Activity Types
export type ActivityType =
  | 'board_created'
  | 'board_updated'
  | 'board_deleted'
  | 'list_created'
  | 'list_updated'
  | 'list_deleted'
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_moved'
  | 'member_added'
  | 'member_removed'
  | 'comment_added';

export interface Activity {
  id: string;
  type: ActivityType;
  user: User;
  board: string;
  task?: Task;
  list?: List;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  fromCache?: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    [key: string]: T[] | unknown;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Drag and Drop Types
export interface DragItem {
  id: string;
  type: 'task' | 'list';
}

// Socket Types
export interface SocketTaskMove {
  taskId: string;
  sourceListId: string;
  targetListId: string;
  newPosition: number;
  movedBy: string;
}

export interface SocketUser {
  userId: string;
  email: string;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  name: string;
}

export interface CreateBoardData {
  title: string;
  description?: string;
  isPublic?: boolean;
  coverImage?: string;
}

export interface CreateListData {
  title: string;
  boardId: string;
  position?: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  listId: string;
  boardId: string;
  position?: number;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedTo?: string;
  labels?: string[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  assignedTo?: string | null;
  labels?: string[];
}