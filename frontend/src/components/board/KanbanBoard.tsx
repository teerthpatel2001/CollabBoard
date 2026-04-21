import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DropAnimation,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Board, List, Task } from '../../types';
import { useBoardStore } from '../../stores';
import KanbanColumn from './KanbanColumn';
import KanbanTask from './KanbanTask';
import CreateListForm from './CreateListForm';

interface KanbanBoardProps {
  board: Board;
  onTaskClick: (task: Task) => void;
}

export default function KanbanBoard({ board, onTaskClick }: KanbanBoardProps) {
  const { moveTask, updateTask } = useBoardStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeList, setActiveList] = useState<List | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    // Check if dragging a task
    const task = board.lists?.flatMap(l => l.tasks || []).find(t => t.id === activeId);
    if (task) {
      setActiveTask(task);
      return;
    }

    // Check if dragging a list
    const list = board.lists?.find(l => l.id === activeId);
    if (list) {
      setActiveList(list);
    }
  }, [board.lists]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Handle task reordering during drag
    const activeTask = board.lists?.flatMap(l => l.tasks || []).find(t => t.id === activeId);
    const overTask = board.lists?.flatMap(l => l.tasks || []).find(t => t.id === overId);
    const overList = board.lists?.find(l => l.id === overId);

    if (!activeTask) return;

    // Moving over another task
    if (overTask) {
      const activeList = board.lists?.find(l => l.tasks?.some(t => t.id === activeId));
      const targetList = board.lists?.find(l => l.tasks?.some(t => t.id === overId));

      if (activeList && targetList) {
        const targetTasks = targetList.tasks || [];
        const overIndex = targetTasks.findIndex(t => t.id === overId);

        if (activeList.id !== targetList.id) {
          // Moving to different list
          // This will be handled in drag end
        }
      }
    }

    // Moving over a list (empty or not)
    if (overList) {
      // This will be handled in drag end
    }
  }, [board.lists]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);
    setActiveList(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTaskData = board.lists?.flatMap(l => l.tasks || []).find(t => t.id === activeId);

    if (activeTaskData) {
      // Task was dragged
      const activeList = board.lists?.find(l => l.tasks?.some(t => t.id === activeId));
      const overTask = board.lists?.flatMap(l => l.tasks || []).find(t => t.id === overId);
      const overList = board.lists?.find(l => l.id === overId);

      if (!activeList) return;

      let targetListId: string;
      let newPosition: number;

      if (overTask) {
        // Dropped over a task
        const targetList = board.lists?.find(l => l.tasks?.some(t => t.id === overId));
        if (!targetList) return;

        targetListId = targetList.id;
        const targetTasks = targetList.tasks || [];
        const overIndex = targetTasks.findIndex(t => t.id === overId);
        newPosition = overIndex;
      } else if (overList) {
        // Dropped over a list
        targetListId = overList.id;
        newPosition = (overList.tasks?.length || 0);
      } else {
        return;
      }

      if (activeList.id !== targetListId || activeTaskData.position !== newPosition) {
        try {
          await moveTask(activeId, activeList.id, targetListId, newPosition);
        } catch (error) {
          console.error('Failed to move task:', error);
        }
      }
    }
  }, [board.lists, moveTask]);

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <div className="h-full p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-6 h-full">
          <SortableContext
            items={(board.lists || []).map(l => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            {(board.lists || []).map((list) => (
              <KanbanColumn
                key={list.id}
                list={list}
                boardId={board.id}
                onTaskClick={onTaskClick}
              />
            ))}
          </SortableContext>

          <CreateListForm boardId={board.id} />
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <KanbanTask
              task={activeTask}
              isOverlay
            />
          ) : activeList ? (
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 w-80 opacity-80">
              <h3 className="font-medium text-gray-900 dark:text-white">{activeList.title}</h3>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
