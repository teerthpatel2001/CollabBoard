import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarIcon, CheckCircleIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { Task } from '../../types';
import { format } from 'date-fns';

interface KanbanTaskProps {
  task: Task;
  onClick?: () => void;
  isOverlay?: boolean;
}

export default function KanbanTask({ task, onClick, isOverlay }: KanbanTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasChecklist = task.checklist?.length > 0;
  const completedChecklistItems = task.checklist?.filter(item => item.completed).length || 0;
  const hasAttachments = task.attachments?.length > 0;
  const hasDueDate = task.dueDate;
  const isOverdue = hasDueDate && new Date(task.dueDate!) < new Date() && !task.labels.includes('completed');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600
        cursor-pointer hover:shadow-md transition-shadow
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isOverlay ? 'shadow-2xl rotate-3 scale-105 ring-2 ring-primary-500' : ''}
      `}
    >
      {/* Labels */}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {/* Label badges would go here */}
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Due Date */}
          {hasDueDate && (
            <div
              className={`
                flex items-center text-xs px-2 py-0.5 rounded
                ${isOverdue
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }
              `}
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              {format(new Date(task.dueDate!), 'MMM d')}
            </div>
          )}

          {/* Checklist */}
          {hasChecklist && (
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <CheckCircleIcon className="h-3 w-3 mr-1" />
              {completedChecklistItems}/{task.checklist?.length}
            </div>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <PaperClipIcon className="h-3 w-3 mr-1" />
              {task.attachments?.length}
            </div>
          )}
        </div>

        {/* Priority Indicator */}
        <div className={`
          w-2 h-2 rounded-full
          ${task.priority === 'high' ? 'bg-red-500' : ''}
          ${task.priority === 'medium' ? 'bg-yellow-500' : ''}
          ${task.priority === 'low' ? 'bg-green-500' : ''}
        `} />

        {/* Assigned User */}
        {task.assignedTo && (
          <div
            className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-medium"
            title={task.assignedTo.name}
          >
            {task.assignedTo.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
