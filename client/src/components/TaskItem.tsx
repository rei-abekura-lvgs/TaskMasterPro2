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

  // 色をタスクの状態や優先度に基づいて動的に選択
  const getPriorityGradient = () => {
    if (task.completed) return 'bg-gray-100';
    
    switch(task.priority) {
      case 'high': return 'bg-gradient-to-r from-red-50 to-white';
      case 'medium': return 'bg-gradient-to-r from-amber-50 to-white';
      case 'low': return 'bg-gradient-to-r from-green-50 to-white';
      default: return 'bg-white';
    }
  };

  const getPriorityBorderColor = () => {
    if (task.completed) return 'border-l-gray-300';
    
    switch(task.priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-amber-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-blue-500';
    }
  };

  // 優先度の高いタスクにはパルスアニメーションを追加
  const getPriorityAnimation = () => {
    if (task.completed) return '';
    
    return task.priority === 'high' ? 'animate-pulse-soft' : '';
  };

  return (
    <div 
      className={`${getPriorityGradient()} rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col border-l-4 ${getPriorityBorderColor()} hover:translate-y-[-2px] ${getPriorityAnimation()}`}
    >
      <div className="p-5 flex-1">
        <div className="flex items-start h-full">
          <button 
            className={`p-1.5 rounded-full mr-3 mt-0.5 flex-shrink-0 hover:bg-white/80 transition-colors ${task.completed ? 'text-green-500' : 'text-gray-400 hover:text-primary'}`}
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
          >
            <span className="material-icons text-xl">
              {task.completed 
                ? "check_circle" 
                : "radio_button_unchecked"
              }
            </span>
          </button>
          <div className="flex-1 min-w-0 flex flex-col h-full">
            <h3 className={`text-lg font-medium ${task.completed ? 'text-gray-500 line-through opacity-70' : 'text-gray-800'}`}>
              {task.title}
            </h3>
            <p className={`mt-2 text-sm ${task.completed ? 'text-gray-400 line-through opacity-70' : 'text-gray-600'} line-clamp-2 mb-auto`}>
              {task.description || <span className="text-gray-400 italic">説明なし</span>}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {task.dueDate && (
                <span className="flex items-center bg-white/80 px-2 py-1 rounded-md shadow-sm">
                  <span className="material-icons text-xs mr-1.5 text-blue-500">calendar_today</span>
                  <span>{formatDate(task.dueDate)}</span>
                </span>
              )}
              
              {task.category && (
                <span className="flex items-center bg-white/80 px-2 py-1 rounded-md shadow-sm">
                  <span className="material-icons text-xs mr-1.5 text-purple-500">folder</span>
                  <span>{task.category}</span>
                </span>
              )}
              
              <span className="flex items-center ml-auto bg-white/80 px-2 py-1 rounded-md shadow-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${priorityColors[task.priority]}`}></span>
                <span className="ml-1.5">{priorityLabels[task.priority]}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white/50 backdrop-blur-sm px-4 py-2.5 flex justify-end space-x-2 rounded-b-lg border-t border-gray-100">
        <button 
          className="p-2 rounded-full hover:bg-white transition-colors text-gray-500 hover:text-blue-600"
          onClick={handleEdit}
        >
          <span className="material-icons text-sm">edit</span>
        </button>
        <button 
          className="p-2 rounded-full hover:bg-white transition-colors text-gray-500 hover:text-red-600"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <span className="material-icons text-sm">delete</span>
        </button>
      </div>
    </div>
  );
}
