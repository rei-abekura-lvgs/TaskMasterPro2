import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTaskContext } from '@/context/TaskContext';
import { Task } from '@/types';
import { formatDate, priorityColors, priorityLabels } from '@/lib/utils';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  const { setEditingTask, setIsModalOpen } = useTaskContext();
  const { toast } = useToast();

  // Toggle task completion status
  const toggleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed: !task.completed })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update task');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: task.completed ? "タスクを未完了に戻しました" : "タスクを完了しました",
        description: task.title,
      });
    },
    onError: (error) => {
      toast({
        title: "タスクの更新に失敗しました",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete task
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete task');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "タスクを削除しました",
        description: task.title,
      });
    },
    onError: (error) => {
      toast({
        title: "タスクの削除に失敗しました",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Edit task
  const handleEdit = () => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // Delete task with confirmation
  const handleDelete = () => {
    if (window.confirm("このタスクを削除してもよろしいですか？")) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm overflow-hidden task-item hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start">
          <button 
            className="p-1 rounded-full mr-3 mt-0.5 flex-shrink-0"
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
          >
            <span className="material-icons">
              {task.completed 
                ? "check_circle" 
                : "radio_button_unchecked"
              }
            </span>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-medium text-gray-800 dark:text-gray-200 ${task.completed ? 'completed-task' : ''}`}>
              {task.title}
            </h3>
            <p className={`mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 ${task.completed ? 'completed-task' : ''}`}>
              {task.description}
            </p>
            <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
              {task.dueDate && (
                <>
                  <span className="material-icons text-xs mr-1">calendar_today</span>
                  <span>{formatDate(task.dueDate)}</span>
                  <span className="mx-2">•</span>
                </>
              )}
              
              <span className="flex items-center">
                <span className="material-icons text-xs mr-1">label</span>
                <span>{task.category}</span>
              </span>
              
              <span className="ml-auto flex items-center">
                <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`}></span>
                <span className="ml-1">{priorityLabels[task.priority]}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-neutral-700 px-4 py-2 flex justify-end space-x-2">
        <button 
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
          onClick={handleEdit}
        >
          <span className="material-icons text-gray-600 dark:text-gray-300 text-sm">edit</span>
        </button>
        <button 
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <span className="material-icons text-gray-600 dark:text-gray-300 text-sm">delete</span>
        </button>
      </div>
    </div>
  );
}
