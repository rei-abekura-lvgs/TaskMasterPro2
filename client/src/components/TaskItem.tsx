import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useTaskContext } from '@/context/TaskContext';
import { useToast } from '@/hooks/use-toast';
import DeleteConfirmModal from './DeleteConfirmModal';

interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  const { setIsModalOpen, setEditingTask } = useTaskContext();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { toast } = useToast();
  
  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      console.log('Deleting task using REST API:', task.id);
      
      // REST APIを使用してタスクを削除
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete task');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "タスクが削除されました",
        description: "タスクが正常に削除されました。"
      });
    },
    onError: (error: any) => {
      toast({
        title: "タスクの削除に失敗しました",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update task completion status
  const toggleCompletionMutation = useMutation({
    mutationFn: async () => {
      console.log('Toggling task completion using REST API:', task.id);
      
      // REST APIを使用してタスクの完了状態を更新
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !task.completed }),
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
        title: task.completed ? "タスクが未完了に設定されました" : "タスクが完了に設定されました",
        description: "タスクのステータスが更新されました。"
      });
    },
    onError: (error: any) => {
      toast({
        title: "ステータスの更新に失敗しました",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // タスク編集の処理
  const handleEditClick = () => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // タスク削除の処理
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  // タスク完了状態の切り替え
  const handleToggleCompletion = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompletionMutation.mutate();
  };

  // 優先度に基づいたスタイルを取得
  const getPriorityStyles = () => {
    switch (task.priority) {
      case 'high':
        return {
          badge: 'bg-red-100 text-red-800',
          icon: 'text-red-500',
          border: 'border-red-300'
        };
      case 'medium':
        return {
          badge: 'bg-yellow-100 text-yellow-800',
          icon: 'text-yellow-500',
          border: 'border-yellow-300'
        };
      case 'low':
      default:
        return {
          badge: 'bg-green-100 text-green-800',
          icon: 'text-green-500',
          border: 'border-green-300'
        };
    }
  };

  const priorityStyles = getPriorityStyles();
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
  
  // カテゴリーバッジスタイル
  const categoryBadgeStyle = "bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full";

  return (
    <>
      <div 
        className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
          task.completed ? 'border-l-4 border-green-500' : isOverdue ? 'border-l-4 border-red-500' : `border-l-4 ${priorityStyles.border}`
        }`}
      >
        <div className="p-5">
          <div className="flex items-start mb-3">
            {/* Task completion checkbox */}
            <button 
              onClick={handleToggleCompletion}
              className={`mr-3 mt-1 w-5 h-5 border rounded-full flex-shrink-0 ${
                task.completed 
                  ? 'bg-green-500 border-green-500 flex items-center justify-center' 
                  : 'border-gray-400 bg-white'
              }`}
              aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {task.completed && (
                <span className="material-icons text-white text-sm">check</span>
              )}
            </button>
            
            {/* Task content */}
            <div className="flex-1">
              <h3 className={`text-lg font-semibold mb-1 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                {task.title}
              </h3>
              
              {/* Due date and category */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {task.dueDate && (
                  <span className={`flex items-center text-xs ${
                    isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                  }`}>
                    <span className="material-icons text-xs mr-1">
                      {isOverdue ? 'warning' : 'event'}
                    </span>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                
                {task.category && (
                  <span className={categoryBadgeStyle}>
                    {task.category}
                  </span>
                )}
                
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${priorityStyles.badge}`}>
                  {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                </span>
              </div>
              
              {/* Task description */}
              {task.description && (
                <p className={`text-sm mb-3 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                  {task.description.length > 100 
                    ? `${task.description.substring(0, 100)}...` 
                    : task.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-end space-x-2 mt-3">
            <button
              onClick={handleEditClick}
              className="p-1.5 rounded-full text-blue-600 hover:bg-blue-50 transition-colors"
              aria-label="Edit task"
            >
              <span className="material-icons text-base">edit</span>
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-1.5 rounded-full text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Delete task"
            >
              <span className="material-icons text-base">delete</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          deleteTaskMutation.mutate();
          setShowDeleteModal(false);
        }}
        taskTitle={task.title}
      />
    </>
  );
}
