import { io, Socket } from 'socket.io-client';
import { authService } from './auth.service';
import { SocketTaskMove, SocketUser } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private currentBoard: string | null = null;

  connect(): void {
    const token = authService.getAccessToken();

    if (!token) {
      console.error('No access token available for socket connection');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentBoard = null;
    }
  }

  joinBoard(boardId: string): void {
    if (!this.socket) {
      this.connect();
    }

    // Leave previous board if any
    if (this.currentBoard) {
      this.socket?.emit('leave-board', this.currentBoard);
    }

    this.currentBoard = boardId;
    this.socket?.emit('join-board', boardId);
  }

  leaveBoard(boardId: string): void {
    this.socket?.emit('leave-board', boardId);
    if (this.currentBoard === boardId) {
      this.currentBoard = null;
    }
  }

  // Task events
  emitTaskCreated(boardId: string, task: unknown): void {
    this.socket?.emit('task-created', { boardId, task });
  }

  emitTaskUpdated(boardId: string, taskId: string, updates: unknown): void {
    this.socket?.emit('task-updated', { boardId, taskId, updates });
  }

  emitTaskMoved(data: {
    boardId: string;
    taskId: string;
    sourceListId: string;
    targetListId: string;
    newPosition: number;
  }): void {
    this.socket?.emit('task-moved', data);
  }

  emitTaskDeleted(boardId: string, taskId: string): void {
    this.socket?.emit('task-deleted', { boardId, taskId });
  }

  // List events
  emitListCreated(boardId: string, list: unknown): void {
    this.socket?.emit('list-created', { boardId, list });
  }

  emitListUpdated(boardId: string, listId: string, updates: unknown): void {
    this.socket?.emit('list-updated', { boardId, listId, updates });
  }

  emitListsReordered(boardId: string, lists: { id: string; position: number }[]): void {
    this.socket?.emit('lists-reordered', { boardId, lists });
  }

  // Event listeners
  onTaskCreated(callback: (data: { task: unknown; createdBy: string }) => void): void {
    this.socket?.on('task-created', callback);
  }

  onTaskUpdated(callback: (data: { taskId: string; updates: unknown; updatedBy: string }) => void): void {
    this.socket?.on('task-updated', callback);
  }

  onTaskMoved(callback: (data: SocketTaskMove) => void): void {
    this.socket?.on('task-moved', callback);
  }

  onTaskDeleted(callback: (data: { taskId: string; deletedBy: string }) => void): void {
    this.socket?.on('task-deleted', callback);
  }

  onListCreated(callback: (data: { list: unknown; createdBy: string }) => void): void {
    this.socket?.on('list-created', callback);
  }

  onListUpdated(callback: (data: { listId: string; updates: unknown; updatedBy: string }) => void): void {
    this.socket?.on('list-updated', callback);
  }

  onListsReordered(callback: (data: { lists: { id: string; position: number }[]; reorderedBy: string }) => void): void {
    this.socket?.on('lists-reordered', callback);
  }

  onUserJoined(callback: (data: SocketUser & { activeUsers: number }) => void): void {
    this.socket?.on('user-joined', callback);
  }

  onUserLeft(callback: (data: SocketUser) => void): void {
    this.socket?.on('user-left', callback);
  }

  // Cursor tracking
  emitCursorMove(boardId: string, x: number, y: number): void {
    this.socket?.emit('cursor-move', { boardId, x, y });
  }

  onCursorMove(callback: (data: SocketUser & { x: number; y: number }) => void): void {
    this.socket?.on('cursor-move', callback);
  }

  // Typing indicator
  emitTyping(boardId: string, isTyping: boolean): void {
    this.socket?.emit('typing', { boardId, isTyping });
  }

  onUserTyping(callback: (data: SocketUser & { isTyping: boolean }) => void): void {
    this.socket?.on('user-typing', callback);
  }

  // Remove listeners
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();