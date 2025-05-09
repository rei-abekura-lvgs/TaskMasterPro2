import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { gql } from '@apollo/client';
import { executeMutation } from '@/lib/utils';
import { useTaskContext } from '@/context/TaskContext';
import { useToast } from '@/hooks/use-toast';
import { createTaskSchema, updateTaskSchema } from '@/types';

// GraphQL Mutations
const CREATE_TASK = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      description
      dueDate
      category
      priority
      completed
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_TASK = gql`
  mutation UpdateTask($input: UpdateTaskInput!) {
    updateTask(input: $input) {
      id
      title
      description
      dueDate
      category
      priority
      completed
      createdAt
      updatedAt
    }
  }
`;

export default function CreateTaskModal() {
  const { isModalOpen, setIsModalOpen, editingTask, setEditingTask } = useTaskContext();
  const { toast } = useToast();
  const isEditing = !!editingTask;

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
      const newTask = {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        categoryId: data.category ? parseInt(data.category, 10) : undefined,
        category: data.category,
        priority: data.priority,
        completed: data.completed || false,
        userId: 1 // 仮のユーザーID
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      
      const updatedTask = {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        categoryId: data.category ? parseInt(data.category, 10) : undefined,
        category: data.category,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
              {isEditing ? 'Edit Task' : 'Create New Task'}
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
                  Title *
                </label>
                <input 
                  type="text" 
                  id="title" 
                  {...form.register('title')}
                  className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-neutral-700 dark:text-white" 
                  placeholder="Enter task title"
                />
                {form.formState.errors.title && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {form.formState.errors.title.message as string}
                  </p>
                )}
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea 
                  id="description" 
                  {...form.register('description')}
                  rows={3} 
                  className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-neutral-700 dark:text-white" 
                  placeholder="Enter task description"
                ></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
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
                    Category
                  </label>
                  <select 
                    id="category" 
                    {...form.register('category')}
                    className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-neutral-700 dark:text-white"
                  >
                    <option value="">Select category</option>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="shopping">Shopping</option>
                    <option value="health">Health</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input 
                      type="radio" 
                      value="low"
                      {...form.register('priority')}
                      className="text-primary focus:ring-primary" 
                    />
                    <span className="ml-2 text-sm">Low</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input 
                      type="radio" 
                      value="medium"
                      {...form.register('priority')}
                      className="text-primary focus:ring-primary" 
                    />
                    <span className="ml-2 text-sm">Medium</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input 
                      type="radio" 
                      value="high"
                      {...form.register('priority')}
                      className="text-primary focus:ring-primary" 
                    />
                    <span className="ml-2 text-sm">High</span>
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
                    <span className="ml-2 text-sm">Completed</span>
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
              Cancel
            </button>
            <button 
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50"
              onClick={form.handleSubmit(onSubmit)}
              disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
            >
              {(createTaskMutation.isPending || updateTaskMutation.isPending) 
                ? 'Saving...' 
                : isEditing ? 'Update Task' : 'Save Task'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
