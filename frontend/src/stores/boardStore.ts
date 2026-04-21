import { create } from 'zustand';
import { Board, List, Task, Activity, CreateBoardData, CreateListData, CreateTaskData, UpdateTaskData } from '../types';
import { boardService, socketService } from '../services';

interface BoardState {
  // Data
  boards: Board[];
  currentBoard: Board | null;
  activities: Activity[];

  // UI State
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  activeUsers: number;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  // Actions
  setBoards: (boards: Board[]) => void;
  setCurrentBoard: (board: Board | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Board actions
  fetchBoards: (page?: number, limit?: number, search?: string) => Promise<void>;
  fetchBoard: (boardId: string) => Promise<void>;
  createBoard: (data: CreateBoardData) => Promise<Board>;
  updateBoard: (boardId: string, data: Partial<CreateBoardData>) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;

  // List actions
  createList: (data: CreateListData) => Promise<void>;
  updateList: (listId: string, data: { title?: string; position?: number }) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  reorderLists: (lists: { id: string; position: number }[]) => Promise<void>;

  // Task actions
  createTask: (data: CreateTaskData) => Promise<void>;
  updateTask: (taskId: string, data: UpdateTaskData) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, sourceListId: string, targetListId: string, newPosition: number) => Promise<void>;
  reorderTasks: (tasks: { id: string; position: number }[]) => Promise<void>;

  // Real-time actions
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  setActiveUsers: (count: number) => void;

  // Socket event handlers
  handleTaskCreated: (task: Task) => void;
  handleTaskUpdated: (taskId: string, updates: Partial<Task>) => void;
  handleTaskMoved: (taskId: string, targetListId: string, newPosition: number) => void;
  handleTaskDeleted: (taskId: string) => void;
  handleListCreated: (list: List) => void;
  handleListUpdated: (listId: string, updates: Partial<List>) => void;
  handleListsReordered: (lists: { id: string; position: number }[]) => void;

  clearError: () => void;
  reset: () => void;
}

const initialState = {
  boards: [],
  currentBoard: null,
  activities: [],
  isLoading: false,
  isCreating: false,
  error: null,
  activeUsers: 0,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
};

export const useBoardStore = create<BoardState>()((set, get) => ({
  ...initialState,

  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (board) => set({ currentBoard: board }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchBoards: async (page = 1, limit = 10, search = '') => {
    set({ isLoading: true, error: null });
    try {
      const response = await boardService.getBoards(page, limit, search);
      set({
        boards: response.boards,
        pagination: response.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch boards',
        isLoading: false,
      });
    }
  },

  fetchBoard: async (boardId) => {
    set({ isLoading: true, error: null });
    try {
      const board = await boardService.getBoard(boardId);
      set({ currentBoard: board, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch board',
        isLoading: false,
      });
    }
  },

  createBoard: async (data) => {
    set({ isCreating: true, error: null });
    try {
      const board = await boardService.createBoard(data);
      set((state) => ({
        boards: [board, ...state.boards],
        isCreating: false,
      }));
      return board;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create board',
        isCreating: false,
      });
      throw error;
    }
  },

  updateBoard: async (boardId, data) => {
    try {
      const board = await boardService.updateBoard(boardId, data);
      set((state) => ({
        currentBoard: state.currentBoard?.id === boardId ? board : state.currentBoard,
        boards: state.boards.map((b) => (b.id === boardId ? board : b)),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update board',
      });
      throw error;
    }
  },

  deleteBoard: async (boardId) => {
    try {
      await boardService.deleteBoard(boardId);
      set((state) => ({
        boards: state.boards.filter((b) => b.id !== boardId),
        currentBoard: state.currentBoard?.id === boardId ? null : state.currentBoard,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete board',
      });
      throw error;
    }
  },

  createList: async (data) => {
    try {
      const list = await boardService.createList(data);
      set((state) => {
        if (!state.currentBoard) return state;
        return {
          currentBoard: {
            ...state.currentBoard,
            lists: [...(state.currentBoard.lists || []), { ...list, tasks: [] }],
          },
        };
      });

      // Emit socket event
      if (get().currentBoard) {
        socketService.emitListCreated(get().currentBoard!.id, list);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create list',
      });
      throw error;
    }
  },

  updateList: async (listId, data) => {
    try {
      const list = await boardService.updateList(listId, data);
      set((state) => {
        if (!state.currentBoard?.lists) return state;
        return {
          currentBoard: {
            ...state.currentBoard,
            lists: state.currentBoard.lists.map((l) => (l.id === listId ? list : l)),
          },
        };
      });

      if (get().currentBoard) {
        socketService.emitListUpdated(get().currentBoard!.id, listId, data);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update list',
      });
      throw error;
    }
  },

  deleteList: async (listId) => {
    try {
      await boardService.deleteList(listId);
      set((state) => {
        if (!state.currentBoard?.lists) return state;
        return {
          currentBoard: {
            ...state.currentBoard,
            lists: state.currentBoard.lists.filter((l) => l.id !== listId),
          },
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete list',
      });
      throw error;
    }
  },

  reorderLists: async (lists) => {
    try {
      await boardService.reorderLists(lists);

      if (get().currentBoard) {
        socketService.emitListsReordered(get().currentBoard!.id, lists);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reorder lists',
      });
    }
  },

  createTask: async (data) => {
    try {
      const task = await boardService.createTask(data);
      set((state) => {
        if (!state.currentBoard?.lists) return state;
        return {
          currentBoard: {
            ...state.currentBoard,
            lists: state.currentBoard.lists.map((l) =>
              l.id === data.listId
                ? { ...l, tasks: [...(l.tasks || []), task] }
                : l
            ),
          },
        };
      });

      if (get().currentBoard) {
        socketService.emitTaskCreated(get().currentBoard!.id, task);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create task',
      });
      throw error;
    }
  },

  updateTask: async (taskId, data) => {
    try {
      const task = await boardService.updateTask(taskId, data);
      set((state) => {
        if (!state.currentBoard?.lists) return state;
        return {
          currentBoard: {
            ...state.currentBoard,
            lists: state.currentBoard.lists.map((l) => ({
              ...l,
              tasks: (l.tasks || []).map((t) => (t.id === taskId ? task : t)),
            })),
          },
        };
      });

      if (get().currentBoard) {
        socketService.emitTaskUpdated(get().currentBoard!.id, taskId, data);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update task',
      });
      throw error;
    }
  },

  deleteTask: async (taskId) => {
    try {
      await boardService.deleteTask(taskId);
      set((state) => {
        if (!state.currentBoard?.lists) return state;
        return {
          currentBoard: {
            ...state.currentBoard,
            lists: state.currentBoard.lists.map((l) => ({
              ...l,
              tasks: (l.tasks || []).filter((t) => t.id !== taskId),
            })),
          },
        };
      });

      if (get().currentBoard) {
        socketService.emitTaskDeleted(get().currentBoard!.id, taskId);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete task',
      });
      throw error;
    }
  },

  moveTask: async (taskId, sourceListId, targetListId, newPosition) => {
    try {
      await boardService.moveTask(taskId, sourceListId, targetListId, newPosition);

      // Update local state
      set((state) => {
        if (!state.currentBoard?.lists) return state;

        const task = state.currentBoard.lists
          .flatMap((l) => l.tasks || [])
          .find((t) => t.id === taskId);

        if (!task) return state;

        const updatedTask = { ...task, list: targetListId, position: newPosition };

        return {
          currentBoard: {
            ...state.currentBoard,
            lists: state.currentBoard.lists.map((l) => {
              // Remove from source list
              if (l.id === sourceListId) {
                return {
                  ...l,
                  tasks: (l.tasks || []).filter((t) => t.id !== taskId),
                };
              }
              // Add to target list
              if (l.id === targetListId) {
                const newTasks = [...(l.tasks || [])];
                newTasks.splice(newPosition, 0, updatedTask);
                return { ...l, tasks: newTasks };
              }
              return l;
            }),
          },
        };
      });

      if (get().currentBoard) {
        socketService.emitTaskMoved({
          boardId: get().currentBoard!.id,
          taskId,
          sourceListId,
          targetListId,
          newPosition,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to move task',
      });
    }
  },

  reorderTasks: async (tasks) => {
    try {
      await boardService.reorderTasks(tasks);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reorder tasks',
      });
    }
  },

  joinBoard: (boardId) => {
    socketService.joinBoard(boardId);
  },

  leaveBoard: (boardId) => {
    socketService.leaveBoard(boardId);
  },

  setActiveUsers: (count) => set({ activeUsers: count }),

  // Socket handlers
  handleTaskCreated: (task) => {
    set((state) => {
      if (!state.currentBoard?.lists) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          lists: state.currentBoard.lists.map((l) =>
            l.id === task.list
              ? { ...l, tasks: [...(l.tasks || []), task] }
              : l
          ),
        },
      };
    });
  },

  handleTaskUpdated: (taskId, updates) => {
    set((state) => {
      if (!state.currentBoard?.lists) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          lists: state.currentBoard.lists.map((l) => ({
            ...l,
            tasks: (l.tasks || []).map((t) =>
              t.id === taskId ? { ...t, ...updates } : t
            ),
          })),
        },
      };
    });
  },

  handleTaskMoved: (taskId, targetListId, newPosition) => {
    set((state) => {
      if (!state.currentBoard?.lists) return state;

      const task = state.currentBoard.lists
        .flatMap((l) => l.tasks || [])
        .find((t) => t.id === taskId);

      if (!task) return state;

      const updatedTask = { ...task, list: targetListId, position: newPosition };

      return {
        currentBoard: {
          ...state.currentBoard,
          lists: state.currentBoard.lists.map((l) => {
            if (l.id === task.list && l.id !== targetListId) {
              return {
                ...l,
                tasks: (l.tasks || []).filter((t) => t.id !== taskId),
              };
            }
            if (l.id === targetListId) {
              const newTasks = (l.tasks || []).filter((t) => t.id !== taskId);
              newTasks.splice(newPosition, 0, updatedTask);
              return { ...l, tasks: newTasks };
            }
            return l;
          }),
        },
      };
    });
  },

  handleTaskDeleted: (taskId) => {
    set((state) => {
      if (!state.currentBoard?.lists) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          lists: state.currentBoard.lists.map((l) => ({
            ...l,
            tasks: (l.tasks || []).filter((t) => t.id !== taskId),
          })),
        },
      };
    });
  },

  handleListCreated: (list) => {
    set((state) => {
      if (!state.currentBoard) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          lists: [...(state.currentBoard.lists || []), { ...list, tasks: [] }],
        },
      };
    });
  },

  handleListUpdated: (listId, updates) => {
    set((state) => {
      if (!state.currentBoard?.lists) return state;
      return {
        currentBoard: {
          ...state.currentBoard,
          lists: state.currentBoard.lists.map((l) =>
            l.id === listId ? { ...l, ...updates } : l
          ),
        },
      };
    });
  },

  handleListsReordered: (lists) => {
    set((state) => {
      if (!state.currentBoard?.lists) return state;
      const positionMap = new Map(lists.map((l) => [l.id, l.position]));
      return {
        currentBoard: {
          ...state.currentBoard,
          lists: state.currentBoard.lists
            .map((l) => ({ ...l, position: positionMap.get(l.id) ?? l.position }))
            .sort((a, b) => a.position - b.position),
        },
      };
    });
  },

  clearError: () => set({ error: null }),
  reset: () => set(initialState),
}));