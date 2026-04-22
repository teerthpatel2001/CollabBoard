import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, UsersIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore, useBoardStore } from '../stores';
import { socketService } from '../services';
import { Task, List } from '../types';
import { boardService } from '../services/board.service';
import KanbanBoard from '../components/board/KanbanBoard';
import TaskModal from '../components/board/TaskModal';
import { toast } from 'react-hot-toast';

export default function Board() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentBoard,
    isLoading,
    error,
    activeUsers,
    fetchBoard,
    joinBoard,
    leaveBoard,
    handleTaskCreated,
    handleTaskUpdated,
    handleTaskMoved,
    handleTaskDeleted,
    handleListCreated,
    handleListUpdated,
    handleListsReordered,
    setActiveUsers,
    clearError,
  } = useBoardStore();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [creatingTaskInList, setCreatingTaskInList] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Fetch board and join socket room
  useEffect(() => {
    if (boardId) {
      fetchBoard(boardId);
      joinBoard(boardId);
    }

    return () => {
      if (boardId) {
        leaveBoard(boardId);
      }
    };
  }, [boardId, fetchBoard, joinBoard, leaveBoard]);

  // Setup socket listeners
  useEffect(() => {
    const setupSocketListeners = () => {
      socketService.onTaskCreated(({ task }) => {
        handleTaskCreated(task as Task);
      });

      socketService.onTaskUpdated(({ taskId, updates }) => {
        handleTaskUpdated(taskId, updates as Partial<Task>);
      });

      socketService.onTaskMoved(({ taskId, targetListId, newPosition }) => {
        handleTaskMoved(taskId, targetListId, newPosition);
      });

      socketService.onTaskDeleted(({ taskId }) => {
        handleTaskDeleted(taskId);
      });

      socketService.onListCreated(({ list }) => {
        handleListCreated(list as List);
      });

      socketService.onListUpdated(({ listId, updates }) => {
        handleListUpdated(listId, updates as Partial<List>);
      });

      socketService.onListsReordered(({ lists }) => {
        handleListsReordered(lists);
      });

      socketService.onUserJoined(({ activeUsers }) => {
        setActiveUsers(activeUsers);
      });

      socketService.onUserLeft(() => {
        // Update active users count would require fetching from server
      });
    };

    if (boardId) {
      setupSocketListeners();
    }

    return () => {
      socketService.removeAllListeners();
    };
  }, [boardId, handleTaskCreated, handleTaskUpdated, handleTaskMoved, handleTaskDeleted, handleListCreated, handleListUpdated, handleListsReordered, setActiveUsers]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setShowTaskModal(false);
    setSelectedTask(null);
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    setIsAddingMember(true);
    try {
      await boardService.addMember(currentBoard!.id, memberEmail.trim(), memberRole);
      toast.success('Member added successfully');
      setShowAddMemberModal(false);
      setMemberEmail('');
      setMemberRole('member');
      await fetchBoard(currentBoard!.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const isBoardAdmin = currentBoard?.owner.id === user?.id ||
    currentBoard?.members.some(m => m.user.id === user?.id && m.role === 'admin');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !currentBoard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error || 'Board not found'}
          </h2>
          <button
            onClick={() => { clearError(); navigate('/dashboard'); }}
            className="text-primary-600 hover:text-primary-500"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>

              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentBoard.title}
                </h1>
                {currentBoard.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentBoard.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Active Users */}
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <UsersIcon className="h-5 w-5 mr-2" />
                <span>{activeUsers} active</span>
              </div>

              {/* Members */}
              <div className="flex -space-x-2">
                {/* Owner */}
                <div
                  className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium ring-2 ring-white dark:ring-gray-800"
                  title={`${currentBoard.owner.name} (Owner)`}
                >
                  {currentBoard.owner.name.charAt(0).toUpperCase()}
                </div>
                {/* Members (max 3) */}
                {currentBoard.members.slice(0, 3).map((member) => (
                  <div
                    key={member.user.id}
                    className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-medium ring-2 ring-white dark:ring-gray-800"
                    title={`${member.user.name} (${member.role})`}
                  >
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {currentBoard.members.length > 3 && (
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium ring-2 ring-white dark:ring-gray-800">
                    +{currentBoard.members.length - 3}
                  </div>
                )}
              </div>

              {/* Add Member Button (Admin only) */}
              {isBoardAdmin && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Member
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <KanbanBoard
          board={currentBoard}
          onTaskClick={handleTaskClick}
        />
      </div>

      {/* Task Modal */}
      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          board={currentBoard}
          onClose={handleCloseTaskModal}
        />
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Member</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as 'admin' | 'member')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {isAddingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
