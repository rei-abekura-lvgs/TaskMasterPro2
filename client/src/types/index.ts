import { z } from 'zod';

// Task model
export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// Validation schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  completed: z.boolean().default(false)
});

export const updateTaskSchema = createTaskSchema.extend({
  id: z.string().optional() // Optional because it comes from the context
});

// Category type
export interface Category {
  id: string;
  name: string;
  count: number;
}

// Filter type
export interface Filter {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// Task query responses
export interface ListTasksResponse {
  listTasks: {
    items: Task[];
  };
}

export interface GetTaskResponse {
  getTask: Task;
}

// Task mutation responses
export interface CreateTaskResponse {
  createTask: Task;
}

export interface UpdateTaskResponse {
  updateTask: Task;
}

export interface DeleteTaskResponse {
  deleteTask: {
    id: string;
  };
}
