import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
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

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating task using REST API:', data);
      
      const newTask = {
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate || null,
        categoryId: data.category ? parseInt(data.category, 10) : null,
        priority: data.priority,
        completed: data.completed || false,
        userId: 3 // 仮のユーザーID
      };
      
      console.log('Task data being sent:', JSON.stringify(newTask));
      
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newTask)
        });
        
        // レスポンスがJSONでない場合の処理
        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error('Invalid JSON response:', responseText);
          throw new Error(`Invalid response format: ${responseText.substring(0, 100)}`);
        }
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to create task');
        }
        
        return responseData;
      } catch (error) {
        console.error('Error creating task:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
      
      console.log('Updating task using REST API:', data);
      
      const updatedTask = {
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate || null,
        categoryId: data.category ? parseInt(data.category, 10) : null,
        priority: data.priority,
        completed: data.completed
      };
      
      console.log('Updated task data being sent:', JSON.stringify(updatedTask));
      
      try {
        const response = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedTask)
        });
        
        // レスポンスがJSONでない場合の処理
        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error('Invalid JSON response:', responseText);
          throw new Error(`Invalid response format: ${responseText.substring(0, 100)}`);
        }
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to update task');
        }
        
        return responseData;
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
