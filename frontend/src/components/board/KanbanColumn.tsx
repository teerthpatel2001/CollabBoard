import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusIcon, TrashIcon, EllipsisHorizontalIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { List, Task } from '../../types';
import { useBoardStore } from '../../stores';
import KanbanTask from './KanbanTask';

interface KanbanColumnProps {
  list: List;
  boardId: string;
  onTaskClick: (task: Task) => void;
}

export default function KanbanColumn({ list, boardId, onTaskClick }: KanbanColumnProps) {
  const { deleteList, createTask } = useBoardStore();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: 'list',
      list,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'transform 0.1s ease' : transition,
  };

  const handleSaveTitle = async () => {
    if (title.trim() && title !== list.title) {
      // Update title via API
      await useBoardStore.getState().updateList(list.id, { title: title.trim() });
    }
    setIsEditing(false);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    setIsLoading(true);
    try {
      await createTask({
        title: newTaskTitle.trim(),
        listId: list.id,
        boardId,
      });
      setNewTaskTitle('');
      setShowAddTask(false);
    } finally {
      setIsLoading(false);
    }
  };

  const tasks = list.tasks || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex-shrink-0 w-80 flex flex-col bg-gray-100 dark:bg-gray-800 rounded-lg transition-all duration-200 ${
        isDragging
          ? 'opacity-90 rotate-2 scale-105 shadow-2xl ring-2 ring-primary-500 z-50'
          : 'hover:shadow-md'
      }`}
    >
      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className="p-4 flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors rounded-t-lg group/header"
      >
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') {
                setTitle(list.title);
                setIsEditing(false);
              }
            }}
            className="flex-1 px-2 py-1 text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
        ) : (
          <>
            <h3
              onClick={() => setIsEditing(true)}
              className="text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:text-gray-900"
            >
              {list.title}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {tasks.length}
            </span>
          </>
        )}

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowAddTask(true)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this list? All tasks will be deleted.')) {
                deleteList(list.id);
              }
            }}
            className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <KanbanTask
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* Add Task Form */}
      {showAddTask ? (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <textarea
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddTask();
              }
              if (e.key === 'Escape') {
                setShowAddTask(false);
                setNewTaskTitle('');
              }
            }}
            placeholder="Enter task title..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={2}
            autoFocus
          />
          <div className="mt-2 flex items-center space-x-2">
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim() || isLoading}
              className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => {
                setShowAddTask(false);
                setNewTaskTitle('');
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddTask(true)}
          className="w-full p-3 flex items-center text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-b-lg transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add a task
        </button>
      )}
    </div>
  );
}
