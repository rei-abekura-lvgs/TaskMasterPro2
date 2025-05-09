import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useTaskContext } from '@/context/TaskContext';
import { useToast } from '@/hooks/use-toast';
import { createTaskSchema, updateTaskSchema } from '@/types';

export default function CreateTaskModal() {
  const { isModalOpen, setIsModalOpen, editingTask, setEditingTask } = useTaskContext();
  const { toast } = useToast();
  const isEditing = !!editingTask;
  
  // カテゴリーの取得 - REST APIを直接使用
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      console.log('Using REST API directly for categories while GraphQL setup is in progress');
      const userId = 3; // 仮のユーザーID - 実際のアプリでは認証から取得する
      const response = await fetch(`/api/categories?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories from REST API');
      }
      
      return response.json();
    },
    staleTime: 10000, // 10 seconds
    enabled: isModalOpen // モーダルが開いている時だけクエリを実行
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
        category: editingTask.category,
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

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        // GraphQLでタスクを作成
        const input: CreateTaskInput = {
          title: data.title,
          description: data.description || null,
          dueDate: data.dueDate || null,
          categoryId: data.category || null,
          priority: data.priority.toUpperCase() as TaskPriority,  // 'low' -> 'LOW'
          completed: data.completed || false
        };
        
        const result = await executeGraphQL(createTask, {
          input,
          condition: null
        });
        
        if (result && result.createTask) {
          return result.createTask;
        }
        
        throw new Error('Invalid response from AppSync');
      } catch (graphqlError) {
        console.error('GraphQL Error when creating task:', graphqlError);
        
        // フォールバック：REST APIでタスク作成
        console.log('Falling back to REST API for task creation');
        
        const newTask = {
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          categoryId: data.category ? parseInt(data.category, 10) : null,
          priority: data.priority,
          completed: data.completed || false,
          userId: 3 // 仮のユーザーID
        };
        
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newTask)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create task');
        }
        
        return await response.json();
      }
    },
    onSuccess: () => {
      // 両方のキャッシュをクリア（GraphQLとREST）
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "タスクを作成しました",
        description: "タスクが正常に作成されました。"
      });
      closeModal();
    },
    onError: (error: any) => {
      toast({
        title: "タスクの作成に失敗しました",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!editingTask) return null;
      
      try {
        // GraphQLでタスクを更新
        const input: UpdateTaskInput = {
          id: editingTask.id.toString(),
          title: data.title,
          description: data.description || null,
          dueDate: data.dueDate || null,
          categoryId: data.category || null,
          priority: data.priority.toUpperCase() as TaskPriority,  // 'low' -> 'LOW'
          completed: data.completed
        };
        
        const result = await executeGraphQL(updateTask, {
          input,
          condition: null
        });
        
        if (result && result.updateTask) {
          return result.updateTask;
        }
        
        throw new Error('Invalid response from AppSync');
      } catch (graphqlError) {
        console.error('GraphQL Error when updating task:', graphqlError);
        
        // フォールバック：REST APIでタスク更新
        console.log('Falling back to REST API for task update');
        
        const updatedTask = {
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          categoryId: data.category ? parseInt(data.category, 10) : null,
          priority: data.priority,
          completed: data.completed
        };
        
        const response = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedTask)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update task');
        }
        
        return await response.json();
      }
    },
    onSuccess: () => {
      // 両方のキャッシュをクリア（GraphQLとREST）
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "タスクを更新しました",
        description: "タスクが正常に更新されました。"
      });
      closeModal();
    },
    onError: (error: any) => {
      toast({
        title: "タスクの更新に失敗しました",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: any) => {
    if (isEditing) {
      updateTaskMutation.mutate(data);
    } else {
      createTaskMutation.mutate(data);
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
          <div className="bg-primary-light dark:bg-primary-dark text-white px-6 py-4 flex items-center justify-between">
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
                  className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-neutral-700 dark:text-white" 
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
                  className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-neutral-700 dark:text-white" 
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
                    className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-neutral-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    カテゴリ
                  </label>
                  <select 
                    id="category" 
                    {...form.register('category')}
                    className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-neutral-700 dark:text-white"
                  >
                    <option value="">カテゴリを選択</option>
                    {isCategoriesLoading ? (
                      <option value="" disabled>読み込み中...</option>
                    ) : categories && categories.length > 0 ? (
                      categories.map((category: any) => (
                        <option key={category.id} value={category.id.toString()}>
                          {category.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>カテゴリーがありません</option>
                    )}
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  優先度
                </label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input 
                      type="radio" 
                      value="low"
                      {...form.register('priority')}
                      className="text-primary focus:ring-primary" 
                    />
                    <span className="ml-2 text-sm">低</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input 
                      type="radio" 
                      value="medium"
                      {...form.register('priority')}
                      className="text-primary focus:ring-primary" 
                    />
                    <span className="ml-2 text-sm">中</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input 
                      type="radio" 
                      value="high"
                      {...form.register('priority')}
                      className="text-primary focus:ring-primary" 
                    />
                    <span className="ml-2 text-sm">高</span>
                  </label>
                </div>
              </div>

              {isEditing && (
                <div className="mb-4">
                  <label className="inline-flex items-center">
                    <input 
                      type="checkbox"
                      {...form.register('completed')}
                      className="text-primary focus:ring-primary" 
                    />
                    <span className="ml-2 text-sm">完了</span>
                  </label>
                </div>
              )}
            </form>
          </div>
          
          {/* Modal footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-700 flex justify-end space-x-2">
            <button 
              className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors"
              onClick={closeModal}
            >
              キャンセル
            </button>
            <button 
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50"
              onClick={form.handleSubmit(onSubmit)}
              disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
            >
              {(createTaskMutation.isPending || updateTaskMutation.isPending) 
                ? '保存中...' 
                : isEditing ? 'タスクを更新' : 'タスクを保存'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
