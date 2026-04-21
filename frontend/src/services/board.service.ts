import api from './api';
import {
  ApiResponse,
  Board,
  List,
  Task,
  Activity,
  CreateBoardData,
  CreateListData,
  CreateTaskData,
  UpdateTaskData,
} from '../types';

interface BoardsResponse {
  boards: Board[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface BoardResponse {
  board: Board;
}

interface ActivityResponse {
  activities: Activity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const boardService = {
  // Boards
  getBoards: async (page = 1, limit = 10, search = ''): Promise<BoardsResponse> => {
    const response = await api.get<ApiResponse<BoardsResponse>>('/boards', {
      params: { page, limit, search },
    });
    return response.data.data;
  },

  getBoard: async (boardId: string): Promise<Board> => {
    const response = await api.get<ApiResponse<BoardResponse>>(`/boards/${boardId}`);
    return response.data.data.board;
  },

  createBoard: async (data: CreateBoardData): Promise<Board> => {
    const response = await api.post<ApiResponse<BoardResponse>>('/boards', data);
    return response.data.data.board;
  },

  updateBoard: async (boardId: string, data: Partial<CreateBoardData>): Promise<Board> => {
    const response = await api.patch<ApiResponse<BoardResponse>>(`/boards/${boardId}`, data);
    return response.data.data.board;
  },

  deleteBoard: async (boardId: string): Promise<void> => {
    await api.delete(`/boards/${boardId}`);
  },

  // Members
  addMember: async (boardId: string, email: string, role: 'admin' | 'member' = 'member'): Promise<Board> => {
    const response = await api.post<ApiResponse<BoardResponse>>(`/boards/${boardId}/members`, {
      email,
      role,
    });
    return response.data.data.board;
  },

  removeMember: async (boardId: string, memberId: string): Promise<void> => {
    await api.delete(`/boards/${boardId}/members/${memberId}`);
  },

  // Activity
  getActivity: async (boardId: string, page = 1, limit = 20): Promise<ActivityResponse> => {
    const response = await api.get<ApiResponse<ActivityResponse>>(`/boards/${boardId}/activity`, {
      params: { page, limit },
    });
    return response.data.data;
  },

  // Lists
  createList: async (data: CreateListData): Promise<List> => {
    const response = await api.post<ApiResponse<{ list: List }>>('/lists', data);
    return response.data.data.list;
  },

  updateList: async (listId: string, data: { title?: string; position?: number }): Promise<List> => {
    const response = await api.patch<ApiResponse<{ list: List }>>(`/lists/${listId}`, data);
    return response.data.data.list;
  },

  deleteList: async (listId: string): Promise<void> => {
    await api.delete(`/lists/${listId}`);
  },

  reorderLists: async (lists: { id: string; position: number }[]): Promise<void> => {
    await api.post('/lists/reorder', { lists });
  },

  // Tasks
  createTask: async (data: CreateTaskData): Promise<Task> => {
    const response = await api.post<ApiResponse<{ task: Task }>>('/tasks', data);
    return response.data.data.task;
  },

  getTask: async (taskId: string): Promise<Task> => {
    const response = await api.get<ApiResponse<{ task: Task }>>(`/tasks/${taskId}`);
    return response.data.data.task;
  },

  updateTask: async (taskId: string, data: UpdateTaskData): Promise<Task> => {
    const response = await api.patch<ApiResponse<{ task: Task }>>(`/tasks/${taskId}`, data);
    return response.data.data.task;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
  },

  moveTask: async (
    taskId: string,
    sourceListId: string,
    targetListId: string,
    newPosition: number
  ): Promise<void> => {
    await api.post('/tasks/move', {
      taskId,
      sourceListId,
      targetListId,
      newPosition,
    });
  },

  reorderTasks: async (tasks: { id: string; position: number }[]): Promise<void> => {
    await api.post('/tasks/reorder', { tasks });
  },

  // Checklist
  addChecklistItem: async (taskId: string, text: string): Promise<Task> => {
    const response = await api.post<ApiResponse<{ task: Task }>>(`/tasks/${taskId}/checklist`, { text });
    return response.data.data.task;
  },

  updateChecklistItem: async (
    taskId: string,
    itemId: string,
    data: { text?: string; completed?: boolean }
  ): Promise<Task> => {
    const response = await api.patch<ApiResponse<{ task: Task }>>(
      `/tasks/${taskId}/checklist/${itemId}`,
      data
    );
    return response.data.data.task;
  },

  deleteChecklistItem: async (taskId: string, itemId: string): Promise<Task> => {
    const response = await api.delete<ApiResponse<{ task: Task }>>(`/tasks/${taskId}/checklist/${itemId}`);
    return response.data.data.task;
  },
};