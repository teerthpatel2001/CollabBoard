import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useBoardStore } from '../../stores';

interface CreateListFormProps {
  boardId: string;
}

export default function CreateListForm({ boardId }: CreateListFormProps) {
  const { createList } = useBoardStore();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await createList({
        title: title.trim(),
        boardId,
      });
      setTitle('');
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex-shrink-0 w-80 h-14 flex items-center justify-center bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300 font-medium"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Add another list
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-80 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              setTitle('');
            }
          }}
          placeholder="Enter list title..."
          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          autoFocus
        />
        <div className="mt-2 flex items-center space-x-2">
          <button
            type="submit"
            disabled={!title.trim() || isLoading}
            className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : 'Add List'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setTitle('');
            }}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
