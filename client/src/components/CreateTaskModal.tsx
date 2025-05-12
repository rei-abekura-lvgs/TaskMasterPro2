import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useTaskContext } from '@/context/TaskContext';
import { useToast } from '@/hooks/use-toast';
import * as z from 'zod';

// Define schemas locally to avoid dependency issues
const createTaskSchema = z.object({
  title: z.string().min(1, 'タイトルは必須項目です'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  completed: z.boolean().default(false),
});

const updateTaskSchema = createTaskSchema.extend({});

export default function CreateTaskModal() {
  const { isModalOpen, setIsModalOpen, editingTask, setEditingTask } = useTaskContext();
  const { toast } = useToast();
  const isEditing = !!editingTask;
  
  // カテゴリーの取得 - GraphQL APIを使用
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['getUserCategories', '3'],
    queryFn: async () => {
      try {
        // GraphQL APIの準備
        const { getUserCategories } = await import('@/graphql/queries');
        const { fetchGraphQL } = await import('@/lib/graphqlFetch');
        
        console.log('GraphQLでカテゴリを取得します');
        const result = await fetchGraphQL(getUserCategories, {
          userId: "3" // GraphQLではIDは文字列として扱う
        });
        
        if (!result || !result.getUserCategories) {
          console.error('GraphQLカテゴリ取得に失敗:', result);
          console.warn('GraphQLに失敗したため、一時的にRESTで取得を試みます（移行期間中）');
          // フォールバック処理
          const response = await apiRequest('GET', '/api/categories?userId=3');
          const data = await response.json();
          console.log('CreateTaskModal - Categories (REST fallback):', data);
          return data || [];
        }
        
        console.log('GraphQLからカテゴリを取得しました:', result.getUserCategories);
        return result.getUserCategories || [];
      } catch (error) {
        console.error('カテゴリ取得エラー:', error);
        console.warn('GraphQLエラーが発生したため、一時的にRESTで取得を試みます（移行期間中）');
        // フォールバック処理
        const response = await apiRequest('GET', '/api/categories?userId=3');
        const data = await response.json();
        console.log('CreateTaskModal - Categories (REST fallback):', data);
        return data || [];
      }
    }
  });

  const form = useForm({
    resolver: zodResolver(isEditing ? updateTaskSchema : createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      category: '',
      priority: 'medium',
      completed: false
    }
  });

  // Update form values when editing a task
  useEffect(() => {
    if (editingTask) {
      // Format the date for the input field
      const formattedDate = editingTask.dueDate
        ? new Date(editingTask.dueDate).toISOString().split('T')[0]
        : '';

      form.reset({
        title: editingTask.title,
        description: editingTask.description || '',
        dueDate: formattedDate,
        category: editingTask.categoryId ? String(editingTask.categoryId) : '',
        priority: editingTask.priority,
        completed: editingTask.completed
      });
    } else {
      form.reset({
        title: '',
        description: '',
        dueDate: '',
        category: '',
        priority: 'medium',
        completed: false
      });
    }
  }, [editingTask, form]);

  // タスク作成処理 - オプティミスティックUI実装
  const createTaskMutation = useMutation({
    // オプティミスティックUI更新
    onMutate: async (data: any) => {
      // リクエスト前にキャンセル
      await queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      
      // 現在のタスクリストを保存
      const previousTasks = queryClient.getQueryData(['/api/tasks']);
      
      // 仮のIDを生成
      const tempId = `temp-${Date.now()}`;
      
      // カテゴリ名を取得
      let categoryName = '';
      if (data.category) {
        const categoryId = parseInt(data.category, 10);
        const categories = queryClient.getQueryData(['/api/categories']) as any[] || [];
        const category = categories.find(c => c.id === categoryId);
        categoryName = category?.name || '';
      }
      
      // 一時的なタスクオブジェクトを作成
      const tempTask = {
        id: tempId,
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate || null,
        categoryId: data.category ? parseInt(data.category, 10) : null,
        category: categoryName,
        priority: data.priority || 'medium',
        userId: 3, // 固定ユーザーID 
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _isOptimistic: true // 楽観的更新フラグ
      };
      
      // UIに即時反映
      queryClient.setQueryData(['/api/tasks'], (old: any[] | undefined) => {
        if (!old) return [tempTask];
        return [tempTask, ...old];
      });
      
      // オリジナルタスクとモーダル閉じるためのデータを返す
      return {
        previousTasks,
        tempTask,
        closeAfterSuccess: true
      };
    },
    
    // 実際のAPI呼び出し
    mutationFn: async (data: any) => {
      console.log('APIでタスクを作成します:', data);
      
      const newTask = {
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate || null,
        categoryId: data.category ? parseInt(data.category, 10) : null,
        priority: data.priority || 'medium',
        userId: 3, // 固定ユーザー
        completed: false,
      };
      
      try {
        // GraphQL APIの準備
        const { createTask } = await import('@/graphql/mutations');
        const { fetchGraphQL } = await import('@/lib/graphqlFetch');
        
        // TaskInput形式に変換
        const createTaskInput = {
          title: data.title,
          description: data.description || null,
          dueDate: data.dueDate || null,
          categoryId: data.category ? data.category : null,
          priority: data.priority.toUpperCase() || 'MEDIUM',
          completed: Boolean(data.completed),
          userId: "3" // GraphQLではIDは文字列として扱う
        };
        
        console.log('GraphQLでタスクを作成します:', createTaskInput);
        
        try {
          // GraphQL APIでタスク作成
          const result = await fetchGraphQL(createTask, {
            input: createTaskInput
          });
          
          if (!result || !result.createTask) {
            console.error('GraphQLタスク作成に失敗:', result);
            throw new Error('タスク作成に失敗しました');
          }
          
          console.log('GraphQLでタスクを作成しました:', result.createTask);
          return result.createTask;
        } catch (graphqlError) {
          console.error('GraphQLエラー:', graphqlError);
          
          // GraphQLが失敗した場合はRESTにフォールバック（移行期間中）
          console.warn('GraphQLに失敗したため、一時的にRESTで作成を試みます');
          
          // 正しいRESTエンドポイントを使用（AppSyncではなくReplitのバックエンド）
          // getApiBaseUrl()関数は環境に応じたベースURLを返す
          const response = await apiRequest('POST', '/api/tasks', newTask);
          
          if (!response.ok) {
            throw new Error(`サーバーエラー (${response.status})`);
          }
          
          const responseText = await response.text();
          try {
            return responseText ? JSON.parse(responseText) : { success: true };
          } catch (e) {
            return { success: true }; // JSON解析に失敗しても成功とみなす
          }
        }
      } catch (error) {
        console.error('タスク作成エラー:', error);
        throw error;
      }
    },
    
    // エラー処理とロールバック
    onError: (err, newTodo, context: any) => {
      console.error('タスク作成に失敗、変更を元に戻します:', err);
      queryClient.setQueryData(['/api/tasks'], context?.previousTasks);
      toast({
        title: "タスク作成に失敗しました",
        description: "ネットワークエラーが発生しました。再試行してください。",
        variant: "destructive"
      });
    },
    
    // 成功処理
    onSuccess: (data, variables, context: any) => {
      console.log('タスク作成API呼び出し成功');
      
      // モーダルを閉じる
      if (context?.closeAfterSuccess) {
        closeModal();
      }
      
      // 短い通知
      toast({
        title: "タスクを作成しました",
        duration: 2000
      });
      
      // 実際のデータで更新するために遅延リロード
      setTimeout(() => {
        // 一時的なオプティミスティックな項目を実際のサーバーデータに置き換える
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      }, 500); // サーバーのレスポンスを待つために少し遅延
    }
  });

  // タスク更新処理 - オプティミスティックUI実装
  const updateTaskMutation = useMutation({
    // オプティミスティックUI更新
    onMutate: async (data: any) => {
      if (!editingTask) return null;
      
      // リクエスト前にキャンセル
      await queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      
      // 現在のタスクリストを保存
      const previousTasks = queryClient.getQueryData(['/api/tasks']);
      
      // カテゴリ名を取得
      let categoryName = '';
      if (data.category) {
        const categoryId = parseInt(data.category, 10);
        const categories = queryClient.getQueryData(['/api/categories']) as any[] || [];
        const category = categories.find(c => c.id === categoryId);
        categoryName = category?.name || '';
      }
      
      // オプティミスティック更新用のタスクオブジェクトを作成
      const optimisticTask = {
        ...editingTask,
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate || null,
        categoryId: data.category ? parseInt(data.category, 10) : null,
        category: categoryName,
        priority: data.priority,
        completed: data.completed,
        updatedAt: new Date().toISOString(),
        _isOptimistic: true // 楽観的更新フラグ
      };
      
      // UIに即時反映
      queryClient.setQueryData(['/api/tasks'], (old: any[] | undefined) => {
        if (!old) return [optimisticTask];
        return old.map(task => 
          task.id === editingTask.id ? optimisticTask : task
        );
      });
      
      // オリジナルタスクとモーダル閉じるためのデータを返す
      return {
        previousTasks,
        optimisticTask,
        closeAfterSuccess: true
      };
    },
    
    // 実際のAPI呼び出し
    mutationFn: async (data: any) => {
      if (!editingTask) return null;
      
      console.log('APIでタスクを更新します:', data);
      
      const updatedTask = {
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate || null,
        categoryId: data.category ? parseInt(data.category, 10) : null,
        priority: data.priority,
        completed: data.completed
      };
      
      try {
        // GraphQL APIの準備
        const { updateTask } = await import('@/graphql/mutations');
        const { fetchGraphQL } = await import('@/lib/graphqlFetch');
        
        // TaskInput形式に変換
        const updateTaskInput = {
          id: String(editingTask.id), // GraphQLではIDは文字列
          title: data.title,
          description: data.description || null,
          dueDate: data.dueDate || null,
          categoryId: data.category ? data.category : null,
          priority: data.priority.toUpperCase(),
          completed: Boolean(data.completed),
          userId: "3" // GraphQLではIDは文字列として扱う
        };
        
        console.log('GraphQLでタスクを更新します:', updateTaskInput);
        
        try {
          // GraphQL APIでタスク更新
          const result = await fetchGraphQL(updateTask, {
            input: updateTaskInput
          });
          
          if (!result || !result.updateTask) {
            console.error('GraphQLタスク更新に失敗:', result);
            throw new Error('タスク更新に失敗しました');
          }
          
          console.log('GraphQLでタスクを更新しました:', result.updateTask);
          return result.updateTask;
        } catch (graphqlError) {
          console.error('GraphQLエラー:', graphqlError);
          
          // GraphQLが失敗した場合はRESTにフォールバック（移行期間中）
          console.warn('GraphQLに失敗したため、一時的にRESTで更新を試みます');
          
          // 正しいRESTエンドポイントを使用（AppSyncではなくReplitのバックエンド）
          const response = await apiRequest('PATCH', `/api/tasks/${editingTask.id}`, updatedTask);
          
          if (!response.ok) {
            throw new Error(`サーバーエラー (${response.status})`);
          }
          
          const responseText = await response.text();
          try {
            return responseText ? JSON.parse(responseText) : { success: true };
          } catch (e) {
            return { success: true };
          }
        }
      } catch (error) {
        console.error('タスク更新エラー:', error);
        throw error;
      }
    },
    
    // エラー処理とロールバック
    onError: (err, newTodo, context: any) => {
      console.error('タスク更新に失敗、変更を元に戻します:', err);
      queryClient.setQueryData(['/api/tasks'], context?.previousTasks);
      toast({
        title: "タスク更新に失敗しました",
        description: "ネットワークエラーが発生しました。再試行してください。",
        variant: "destructive"
      });
    },
    
    // 成功処理
    onSuccess: (data, variables, context: any) => {
      console.log('タスク更新API呼び出し成功');
      
      // モーダルを閉じる
      if (context?.closeAfterSuccess) {
        closeModal();
      }
      
      // 短い通知
      toast({
        title: "タスクを更新しました",
        duration: 2000
      });
      
      // 実際のデータで更新するために遅延リロード
      setTimeout(() => {
        // 一時的なオプティミスティックな項目を実際のサーバーデータに置き換える
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      }, 500); // サーバーのレスポンスを待つために少し遅延
    }
  });

  const onSubmit = async (data: any) => {
    try {
      console.log('Form submitted with data:', data);
      if (isEditing) {
        await updateTaskMutation.mutateAsync(data);
      } else {
        await createTaskMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: isEditing ? "タスクの更新に失敗しました" : "タスクの作成に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラーが発生しました",
        variant: "destructive"
      });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    form.reset();
  };

  // Only show the modal if it's open
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={closeModal}
      ></div>
      
      {/* Modal content */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full mx-auto overflow-hidden transform transition-all">
          {/* Modal header */}
          <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">
              {isEditing ? 'タスクを編集' : '新規タスク作成'}
            </h3>
            <button className="focus:outline-none" onClick={closeModal}>
              <span className="material-icons">close</span>
            </button>
          </div>
          
          {/* Modal body */}
          <div className="px-6 py-4">
            <form id="taskForm" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  タイトル *
                </label>
                <input 
                  type="text" 
                  id="title" 
                  {...form.register('title')}
                  className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:text-white" 
                  placeholder="タスクのタイトルを入力"
                />
                {form.formState.errors.title && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {form.formState.errors.title.message as string}
                  </p>
                )}
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  説明
                </label>
                <textarea 
                  id="description" 
                  {...form.register('description')}
                  rows={3} 
                  className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:text-white" 
                  placeholder="タスクの説明を入力"
                ></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    期限日
                  </label>
                  <input 
                    type="date" 
                    id="dueDate" 
                    {...form.register('dueDate')}
                    className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    カテゴリ
                  </label>
                  <select 
                    id="category" 
                    {...form.register('category')}
                    className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:text-white"
                  >
                    <option value="">カテゴリなし</option>
                    {categories?.map((category: any) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  優先度
                </label>
                <div className="flex space-x-4">
                  {['low', 'medium', 'high'].map((priority) => (
                    <label key={priority} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value={priority}
                        {...form.register('priority')}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 mr-2 rounded-full border ${
                        form.watch('priority') === priority
                        ? priority === 'high'
                          ? 'bg-red-500 border-red-500'
                          : priority === 'medium'
                            ? 'bg-yellow-500 border-yellow-500'
                            : 'bg-green-500 border-green-500'
                        : 'bg-transparent'
                      }`}>
                      </div>
                      <span className="capitalize">
                        {priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              {isEditing && (
                <div className="mb-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...form.register('completed')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 mr-2 rounded border ${
                      form.watch('completed')
                      ? 'bg-green-500 border-green-500 flex items-center justify-center'
                      : 'bg-white border-gray-300'
                    }`}>
                      {form.watch('completed') && (
                        <span className="material-icons text-white text-xs">check</span>
                      )}
                    </div>
                    <span>完了としてマーク</span>
                  </label>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                >
                  {(createTaskMutation.isPending || updateTaskMutation.isPending) ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      処理中...
                    </span>
                  ) : (
                    isEditing ? '更新' : '作成'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
