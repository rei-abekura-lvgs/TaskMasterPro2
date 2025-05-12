import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useTaskContext } from '@/context/TaskContext';
import { useToast } from '@/hooks/use-toast';
import DeleteConfirmModal from './DeleteConfirmModal';
import { fetchGraphQL } from '@/lib/graphqlFetch';

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
  
  // GraphQLからmutationをインポート
  const getDeleteTaskMutation = async () => {
    const { deleteTask } = await import('@/graphql/mutations');
    return deleteTask;
  };
  
  // タスク削除処理 - GraphQL + オプティミスティックUI更新
  const deleteTaskMutation = useMutation({
    // オプティミスティック更新
    onMutate: async () => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['getUserTasks', '3'] });
      
      // 以前のキャッシュデータを保存（ロールバック用）
      const previousTasks = queryClient.getQueryData(['getUserTasks', '3']);
      
      // UIから即座にタスクを削除
      queryClient.setQueryData(['getUserTasks', '3'], (old: any | undefined) => {
        if (!old || !old.data || !old.data.getUserTasks) return old;
        
        console.log(`タスクID: ${task.id} をUI上で即時削除`);
        const updatedTasks = old.data.getUserTasks.filter((t: any) => t.id !== task.id);
        return {
          ...old,
          data: {
            ...old.data,
            getUserTasks: updatedTasks
          }
        };
      });
      
      // ロールバック用に保存して返す
      return { previousTasks };
    },
    
    // 実際のAPI呼び出し
    mutationFn: async () => {
      console.log(`タスクID: ${task.id} を削除中...`);
      
      try {
        // まずGraphQLで削除を試みる
        const deleteTaskQuery = await getDeleteTaskMutation();
        
        const result = await fetchGraphQL(deleteTaskQuery, {
          input: { id: task.id.toString() }
        });
        
        console.log('GraphQLタスク削除結果:', result);
        
        if (result && result.deleteTask) {
          return {
            success: true,
            taskId: task.id,
            source: 'graphql'
          };
        }
        
        // GraphQLが失敗した場合はRESTにフォールバック
        console.warn('GraphQL削除に失敗、RESTにフォールバック');
        const response = await apiRequest('DELETE', `/api/tasks/${task.id}`);
        
        // エラーチェック
        if (!response.ok) {
          throw new Error(`削除エラー: ${response.status}`);
        }
        
        return {
          success: true,
          taskId: task.id,
          source: 'rest'
        };
      } catch (error) {
        console.error('タスク削除エラー:', error);
        throw error;
      }
    },
    
    // ロールバック処理
    onError: (err, variables, context: any) => {
      console.error('エラーが発生したため変更を元に戻します:', err);
      queryClient.setQueryData(['getUserTasks', '3'], context?.previousTasks);
      toast({
        title: "タスク削除に失敗しました",
        description: "ネットワークエラーが発生しました。再試行してください。",
        variant: "destructive"
      });
    },
    
    // 成功時の処理
    onSuccess: (result) => {
      // 警告トーストのみ表示
      toast({
        title: "タスクを削除しました",
        variant: "default",
        duration: 2000 // 短い表示時間
      });
      
      // データを更新
      queryClient.invalidateQueries({ queryKey: ['getUserTasks', '3'] });
      
      // カテゴリカウント更新のために遅延リロード
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        queryClient.invalidateQueries({ queryKey: ['getUserCategories', '3'] });
      }, 100);
    }
  });

  // GraphQLからupdate mutationをインポート
  const getUpdateTaskMutation = async () => {
    const { updateTask } = await import('@/graphql/mutations');
    return updateTask;
  };

  // オプティミスティックUI更新を使用したタスク完了状態の切り替え - GraphQLベース
  const toggleCompletionMutation = useMutation({
    // オプティミスティック更新のためのコンテキスト値
    onMutate: async () => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['getUserTasks', '3'] });
      
      // 新しい完了状態
      const newCompletedState = !task.completed;
      console.log(`タスク ${task.id} の完了状態を即時UI更新: ${task.completed} → ${newCompletedState}`);
      
      // 以前のキャッシュデータを保存（ロールバック用）
      const previousTasks = queryClient.getQueryData(['getUserTasks', '3']);
      
      // タスクリストのデータを直接更新
      queryClient.setQueryData(['getUserTasks', '3'], (old: any | undefined) => {
        if (!old || !old.data || !old.data.getUserTasks) return old;
        
        const updatedTasks = old.data.getUserTasks.map((t: any) => 
          t.id === task.id ? { ...t, completed: newCompletedState } : t
        );
        
        return {
          ...old,
          data: {
            ...old.data,
            getUserTasks: updatedTasks
          }
        };
      });
      
      // ロールバック用に保存して返す
      return { previousTasks };
    },
    
    // 実際のAPI呼び出し
    mutationFn: async () => {
      // 状態をトグル
      const newCompletedState = !task.completed;
      
      try {
        // まずGraphQLで更新を試みる
        const updateTaskQuery = await getUpdateTaskMutation();
        
        const result = await fetchGraphQL(updateTaskQuery, {
          input: { 
            id: task.id.toString(),
            completed: newCompletedState
          }
        });
        
        console.log('GraphQLタスク更新結果:', result);
        
        if (result && result.updateTask) {
          return { 
            ...result.updateTask, 
            newCompletedState,
            successMessage: newCompletedState ? "タスクを完了としてマークしました" : "タスクを未完了に戻しました",
            source: 'graphql'
          };
        }
        
        // GraphQLが失敗した場合はRESTにフォールバック
        console.warn('GraphQL更新に失敗、RESTにフォールバック');
        const response = await apiRequest(
          'PATCH', 
          `/api/tasks/${task.id}`, 
          { completed: newCompletedState }
        );
        
        if (!response.ok) {
          throw new Error(`APIエラー: ${response.status}`);
        }
        
        const data = await response.json();
        return { 
          ...data, 
          newCompletedState,
          successMessage: newCompletedState ? "タスクを完了としてマークしました" : "タスクを未完了に戻しました",
          source: 'rest'
        };
      } catch (error) {
        console.error('タスク状態更新エラー:', error);
        throw error;
      }
    },
    
    // ロールバック処理
    onError: (err, newTodo, context: any) => {
      console.error('エラーが発生したため変更を元に戻します:', err);
      queryClient.setQueryData(['getUserTasks', '3'], context?.previousTasks);
      toast({
        title: "タスク状態の更新に失敗しました",
        description: "ネットワークエラーが発生しました。再試行してください。",
        variant: "destructive"
      });
    },
    
    // 成功時の処理
    onSuccess: (result) => {
      console.log('API呼び出し成功 - バックグラウンド同期完了:', result.source);
      
      // データ再フェッチ
      queryClient.invalidateQueries({ queryKey: ['getUserTasks', '3'] });
      
      // カテゴリカウントを更新するために少し遅延して再取得
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        queryClient.invalidateQueries({ queryKey: ['getUserCategories', '3'] });
      }, 100);
      
      // トースト通知
      toast({
        title: result.successMessage,
        duration: 2000, // 短い通知
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
