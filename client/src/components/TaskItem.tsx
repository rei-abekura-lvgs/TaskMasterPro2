import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, getApiBaseUrl } from '@/lib/queryClient';
import { useTaskContext } from '@/context/TaskContext';
import { useToast } from '@/hooks/use-toast';
import DeleteConfirmModal from './DeleteConfirmModal';

// Define the Task interface locally to avoid dependency issues
interface Task {
  id: number;
  title: string;
  description?: string;
  dueDate?: string;
  categoryId?: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  userId: number;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  const { setIsModalOpen, setEditingTask } = useTaskContext();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { toast } = useToast();
  
  // タスク削除処理 - シンプルに再実装
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      console.log(`タスクID: ${task.id} を削除します`);
      
      try {
        // 削除リクエスト
        const response = await apiRequest('DELETE', `/api/tasks/${task.id}`);
        
        // エラーチェック
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`タスク削除エラー（ステータス ${response.status}）:`, errorText);
          throw new Error(`タスクの削除に失敗しました（${response.status}）`);
        }
        
        // 成功の場合（DELETEは通常空レスポンスを返す）
        console.log(`タスクID: ${task.id} が正常に削除されました`);
        return {
          success: true,
          taskId: task.id,
          message: "タスクが正常に削除されました"
        };
      } catch (error) {
        console.error('タスク削除中にエラーが発生しました:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      // 複数のキャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      // 成功通知
      toast({
        title: "タスクが削除されました",
        description: result.message
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

  // シンプルで確実なタスク完了状態の切り替え
  const toggleCompletionMutation = useMutation({
    mutationFn: async () => {
      // まず完了状態を逆にした値を保存しておく
      const newCompletedState = !task.completed;
      console.log(`タスク ${task.id} の完了状態を ${task.completed} から ${newCompletedState} に変更します`);
      
      try {
        const response = await apiRequest(
          'PATCH', 
          `/api/tasks/${task.id}`, 
          { completed: newCompletedState }
        );
        
        if (!response.ok) {
          throw new Error(`サーバーからエラーレスポンスを受け取りました: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('タスク完了状態の更新に成功:', data);
        return { ...data, successMessage: newCompletedState ? "タスクが完了に設定されました" : "タスクが未完了に設定されました" };
      } catch (error) {
        console.error('タスク完了状態の更新に失敗:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      // タスクリストを再読み込み
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // カテゴリも更新（カウント変更のため）
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      // 成功通知
      toast({
        title: result.successMessage,
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
    // API呼び出し - 元の実装に戻す
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
