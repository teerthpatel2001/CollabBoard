import { useState } from 'react';
import { XMarkIcon, TrashIcon, CalendarIcon, FlagIcon } from '@heroicons/react/24/outline';
import { Task, Board } from '../../types';
import { useBoardStore } from '../../stores';
import { format } from 'date-fns';

interface TaskModalProps {
  task: Task;
  board: Board;
  onClose: () => void;
}

export default function TaskModal({ task, board, onClose }: TaskModalProps) {
  const { updateTask, deleteTask } = useBoardStore();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    await updateTask(task.id, {
      title,
      description: description || undefined,
      priority,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setIsDeleting(true);
    await deleteTask(task.id);
    onClose();
  };

  const currentList = board.lists?.find(l => l.id === task.list);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              in list <span className="font-medium text-gray-700 dark:text-gray-300">{currentList?.title}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsEditing(true);
              }}
              className="w-full text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0"
              placeholder="Task title"
            />
          </div>

          {/* Priority */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority:</span>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as 'low' | 'medium' | 'high');
                setIsEditing(true);
              }}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsEditing(true);
              }}
              placeholder="Add a more detailed description..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <CalendarIcon className="h-4 w-4" />
              <span>Due {format(new Date(task.dueDate), 'PPP')}</span>
            </div>
          )}

          {/* Assigned To */}
          {task.assignedTo && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned to</h3>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                  {task.assignedTo.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{task.assignedTo.name}</span>
              </div>
            </div>
          )}

          {/* Checklist */}
          {task.checklist && task.checklist.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Checklist ({task.checklist.filter(i => i.completed).length}/{task.checklist.length})
              </h3>
              <div className="space-y-2">
                {task.checklist.map((item) => (
                  <label key={item.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={async () => {
                        // Update checklist item
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Activity</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Created {format(new Date(task.createdAt), 'PPP')} by {task.createdBy.name}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isEditing && (
          <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end space-x-2">
            <button
              onClick={() => {
                setTitle(task.title);
                setDescription(task.description || '');
                setPriority(task.priority);
                setIsEditing(false);
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
